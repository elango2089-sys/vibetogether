import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

import { RoomManager } from './room-manager.js';
import { SyncManager } from './sync-manager.js';
import { TrackInfo } from './types/room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 50 * 1024 * 1024 // 50MB audio transfer support
});

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve built-in static files from public
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// Multer storage for uploaded MP3/WAV/AAC audio
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
    cb(null, `${Date.now()}_${name}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 }
});

const roomManager = new RoomManager();
const syncManager = new SyncManager();

// Helper to get local network IPv4 addresses
function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

// API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', serverTime: Date.now() });
});

app.get('/api/network-info', (_req, res) => {
  const ips = getLocalIpAddresses();
  const primaryIp = ips[0] || 'localhost';
  res.json({
    localIp: primaryIp,
    allIps: ips,
    port: PORT
  });
});

app.post('/api/upload', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const title = path.basename(originalName, path.extname(originalName));
    const url = `/uploads/${filename}`;

    const track: TrackInfo = {
      id: 'track_' + Math.random().toString(36).substring(2, 9),
      title: title || 'Uploaded Track',
      artist: 'Local Upload',
      album: 'Vibe Session',
      duration: 180,
      url,
      isLocalUpload: true
    };

    res.json({ success: true, track });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// Serve frontend dist build in production
const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// WebSocket Event Handling
io.on('connection', (socket: Socket) => {
  socket.on('SYNC_PING', (data: { clientTime: number }) => {
    socket.emit('SYNC_PONG', {
      clientTime: data.clientTime,
      serverTime: Date.now()
    });
  });

  socket.on('ROOM_CREATE', (data: { deviceName: string; platform?: string }) => {
    try {
      const { room, device } = roomManager.createRoom(socket.id, data.deviceName, data.platform);
      socket.join(room.id);
      socket.emit('ROOM_CREATED', { room, device });
    } catch (err: any) {
      socket.emit('ROOM_ERROR', { code: 'CREATE_FAILED', message: err.message || 'Failed to create room' });
    }
  });

  socket.on('ROOM_JOIN', (data: { roomCode: string; deviceName: string; platform?: string }) => {
    try {
      const { room, device } = roomManager.joinRoom(socket.id, data.roomCode, data.deviceName, data.platform);
      socket.join(room.id);
      socket.emit('ROOM_JOINED', { room, device });
      io.to(room.id).emit('DEVICE_CONNECTED', { device });
      io.to(room.id).emit('ROOM_UPDATED', { room });
    } catch (err: any) {
      socket.emit('ROOM_ERROR', { code: err.code || 'JOIN_FAILED', message: err.message || 'Failed to join room' });
    }
  });

  socket.on('ROOM_LEAVE', () => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (info) {
      socket.leave(info.room.id);
      const { room, deviceId, wasHost } = roomManager.handleDisconnect(socket.id);
      if (room && deviceId) {
        io.to(room.id).emit('DEVICE_DISCONNECTED', { deviceId });
        if (wasHost) {
          io.to(room.id).emit('HOST_TRANSFERRED', { newHostId: room.hostId });
        }
        io.to(room.id).emit('ROOM_UPDATED', { room });
      }
    }
  });

  socket.on('PLAY', (data: { position?: number }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info) return;
    const { room, device } = info;

    if (!device.isHost && !room.allowParticipantControl) {
      return socket.emit('ROOM_ERROR', { code: 'FORBIDDEN', message: 'Only host can control playback.' });
    }

    const startAt = syncManager.calculateScheduledStart();
    const position = data.position !== undefined ? data.position : room.position;

    room.playbackState = 'playing';
    room.startAt = startAt;
    room.position = position;

    io.to(room.id).emit('PLAY', {
      trackId: room.currentTrack?.id || '',
      startAt,
      position,
      playbackRate: room.playbackRate
    });
    io.to(room.id).emit('ROOM_UPDATED', { room });
  });

  socket.on('PAUSE', (data: { position: number }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info) return;
    const { room, device } = info;

    if (!device.isHost && !room.allowParticipantControl) {
      return socket.emit('ROOM_ERROR', { code: 'FORBIDDEN', message: 'Only host can control playback.' });
    }

    const currentServerTime = Date.now();
    const pausePos = data.position !== undefined ? data.position : syncManager.getExpectedRoomPosition(room);

    room.playbackState = 'paused';
    room.startAt = undefined;
    room.position = pausePos;

    io.to(room.id).emit('PAUSE', {
      position: pausePos,
      serverTime: currentServerTime
    });
    io.to(room.id).emit('ROOM_UPDATED', { room });
  });

  socket.on('STOP', () => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info) return;
    const { room, device } = info;

    if (!device.isHost && !room.allowParticipantControl) return;

    room.playbackState = 'stopped';
    room.startAt = undefined;
    room.position = 0;

    io.to(room.id).emit('STOP');
    io.to(room.id).emit('ROOM_UPDATED', { room });
  });

  socket.on('SEEK', (data: { position: number }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info) return;
    const { room, device } = info;

    if (!device.isHost && !room.allowParticipantControl) return;

    const startAt = syncManager.calculateScheduledStart();
    room.position = Math.max(0, data.position);
    room.startAt = room.playbackState === 'playing' ? startAt : undefined;

    io.to(room.id).emit('SEEK', {
      position: room.position,
      startAt
    });
    io.to(room.id).emit('ROOM_UPDATED', { room });
  });

  socket.on('TRACK_SELECT', (data: { track: TrackInfo }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info) return;
    const { room, device } = info;

    if (!device.isHost && !room.allowParticipantControl) return;

    room.currentTrack = data.track;
    room.position = 0;
    const startAt = room.playbackState === 'playing' ? syncManager.calculateScheduledStart() : undefined;
    room.startAt = startAt;

    io.to(room.id).emit('TRACK_CHANGED', {
      track: data.track,
      startAt
    });
    io.to(room.id).emit('ROOM_UPDATED', { room });
  });

  socket.on('POSITION_REPORT', (data: { deviceId: string; position: number; timestamp: number }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info) return;
    const { room, device } = info;

    device.lastSeen = Date.now();
    const metrics = syncManager.evaluateDrift(room, data.position, data.timestamp);
    device.drift = Math.round(metrics.driftMs);

    if (metrics.recommendation !== 'none') {
      socket.emit('DRIFT_CORRECTION', {
        deviceId: device.id,
        playbackRate: metrics.suggestedRate,
        targetPosition: metrics.expectedPosition,
        resync: metrics.recommendation === 'resync'
      });
    }

    io.to(room.id).emit('DEVICE_UPDATED', { device });
  });

  socket.on('VOLUME_CHANGE', (data: { volume: number; muted: boolean }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info) return;
    const { device } = info;
    device.volume = Math.max(0, Math.min(1, data.volume));
    device.muted = data.muted;
    io.to(info.room.id).emit('DEVICE_UPDATED', { device });
  });

  socket.on('DEVICE_POSITION_UPDATE', (data: { targetDeviceId: string; position: any; vector2D?: any }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info) return;
    const { room, device } = info;

    if (!device.isHost && device.id !== data.targetDeviceId) return;

    const targetDevice = room.devices[data.targetDeviceId];
    if (targetDevice) {
      targetDevice.speakerPosition = data.position;
      if (data.vector2D) targetDevice.position2D = data.vector2D;
      io.to(room.id).emit('ROOM_UPDATED', { room });
    }
  });

  socket.on('HOST_TRANSFER', (data: { targetDeviceId: string }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info || !info.device.isHost) return;
    const { room, device } = info;

    const target = room.devices[data.targetDeviceId];
    if (target && target.connected) {
      device.isHost = false;
      target.isHost = true;
      room.hostId = target.id;
      io.to(room.id).emit('HOST_TRANSFERRED', { newHostId: target.id });
      io.to(room.id).emit('ROOM_UPDATED', { room });
    }
  });

  socket.on('REMOVE_DEVICE', (data: { targetDeviceId: string }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info || !info.device.isHost) return;
    const { room } = info;

    const target = room.devices[data.targetDeviceId];
    if (target) {
      io.to(target.socketId).emit('KICKED', { reason: 'Removed by room host.' });
      roomManager.removeDevice(room.id, data.targetDeviceId);
      io.to(room.id).emit('ROOM_UPDATED', { room });
    }
  });

  socket.on('LOCK_ROOM', (data: { isLocked: boolean }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info || !info.device.isHost) return;
    const { room } = info;

    room.isLocked = data.isLocked;
    io.to(room.id).emit('ROOM_UPDATED', { room });
  });

  socket.on('TOGGLE_PARTICIPANT_CONTROL', (data: { allow: boolean }) => {
    const info = roomManager.getDeviceBySocket(socket.id);
    if (!info || !info.device.isHost) return;
    const { room } = info;

    room.allowParticipantControl = data.allow;
    io.to(room.id).emit('ROOM_UPDATED', { room });
  });

  socket.on('disconnect', () => {
    const { room, deviceId, wasHost } = roomManager.handleDisconnect(socket.id);
    if (room && deviceId) {
      io.to(room.id).emit('DEVICE_DISCONNECTED', { deviceId });
      if (wasHost) {
        io.to(room.id).emit('HOST_TRANSFERRED', { newHostId: room.hostId });
      }
      io.to(room.id).emit('ROOM_UPDATED', { room });
    }
  });
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('\n===================================================');
  console.log('  VIBETOGETHER DEPLOYED & RUNNING');
  console.log(`  PC Local URL:       http://localhost:${PORT}`);
  ips.forEach((ip) => {
    console.log(`  Mobile Network URL: http://${ip}:${PORT}`);
  });
  console.log('===================================================\n');
});
