import { Room, Device, TrackInfo, SpeakerPosition, Vector2D } from '../src/types/room.js';

export class RoomManager {
  private rooms: Map<string, Room> = new Map(); // roomId -> Room
  private codeToRoomId: Map<string, string> = new Map(); // code -> roomId
  private socketToDevice: Map<string, { roomId: string; deviceId: string }> = new Map();

  constructor() {}

  /**
   * Generate a random unique 6-digit numeric code
   */
  private generateUniqueCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;
      if (attempts > 100) {
        throw new Error('Unable to generate unique room code');
      }
    } while (this.codeToRoomId.has(code));
    return code;
  }

  /**
   * Create a new room with a host device
   */
  public createRoom(socketId: string, deviceName: string, platform?: string): { room: Room; device: Device } {
    const roomId = 'room_' + Math.random().toString(36).substring(2, 9);
    const code = this.generateUniqueCode();
    const deviceId = 'dev_' + Math.random().toString(36).substring(2, 9);

    const hostDevice: Device = {
      id: deviceId,
      socketId,
      roomId,
      name: deviceName.trim() || "Host's Device",
      isHost: true,
      connected: true,
      lastSeen: Date.now(),
      speakerPosition: 'CENTER',
      position2D: { x: 0, y: 0 },
      volume: 1.0,
      muted: false,
      clockOffset: 0,
      rtt: 0,
      drift: 0,
      isSyncing: false,
      platform: platform || 'Web'
    };

    const room: Room = {
      id: roomId,
      code,
      hostId: deviceId,
      createdAt: Date.now(),
      maxDevices: 8,
      isLocked: false,
      allowParticipantControl: false,
      playbackState: 'stopped',
      position: 0,
      playbackRate: 1.0,
      devices: {
        [deviceId]: hostDevice
      }
    };

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(code, roomId);
    this.socketToDevice.set(socketId, { roomId, deviceId });

    return { room, device: hostDevice };
  }

  /**
   * Join an existing room using 6-digit code
   */
  public joinRoom(
    socketId: string,
    code: string,
    deviceName: string,
    platform?: string
  ): { room: Room; device: Device } {
    const cleanedCode = code.trim();
    const roomId = this.codeToRoomId.get(cleanedCode);

    if (!roomId) {
      throw { code: 'INVALID_ROOM', message: 'Room code not found or expired.' };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      throw { code: 'INVALID_ROOM', message: 'Room no longer exists.' };
    }

    if (room.isLocked) {
      throw { code: 'ROOM_LOCKED', message: 'This room is currently locked by the host.' };
    }

    const connectedDevices = Object.values(room.devices).filter(d => d.connected);
    if (connectedDevices.length >= room.maxDevices) {
      throw { code: 'ROOM_FULL', message: 'Room Full: This room already has 8 connected devices.' };
    }

    // Default speaker position assignment based on current device count
    const defaultPositions: SpeakerPosition[] = [
      'CENTER',
      'FRONT_LEFT',
      'FRONT_RIGHT',
      'REAR_LEFT',
      'REAR_RIGHT',
      'LEFT',
      'RIGHT',
      'SUB_REAR'
    ];
    const defaultVectors: Vector2D[] = [
      { x: 0, y: 0 },
      { x: -0.8, y: 0.8 },
      { x: 0.8, y: 0.8 },
      { x: -0.8, y: -0.8 },
      { x: 0.8, y: -0.8 },
      { x: -1.0, y: 0 },
      { x: 1.0, y: 0 },
      { x: 0, y: -1.0 }
    ];

    const posIndex = connectedDevices.length % defaultPositions.length;
    const deviceId = 'dev_' + Math.random().toString(36).substring(2, 9);

    const device: Device = {
      id: deviceId,
      socketId,
      roomId,
      name: deviceName.trim() || `Device ${connectedDevices.length + 1}`,
      isHost: false,
      connected: true,
      lastSeen: Date.now(),
      speakerPosition: defaultPositions[posIndex],
      position2D: defaultVectors[posIndex],
      volume: 1.0,
      muted: false,
      clockOffset: 0,
      rtt: 0,
      drift: 0,
      isSyncing: false,
      platform: platform || 'Web'
    };

    room.devices[deviceId] = device;
    this.socketToDevice.set(socketId, { roomId, deviceId });

    return { room, device };
  }

  public getRoomByCode(code: string): Room | undefined {
    const roomId = this.codeToRoomId.get(code);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public getDeviceBySocket(socketId: string): { room: Room; device: Device } | undefined {
    const info = this.socketToDevice.get(socketId);
    if (!info) return undefined;
    const room = this.rooms.get(info.roomId);
    if (!room) return undefined;
    const device = room.devices[info.deviceId];
    if (!device) return undefined;
    return { room, device };
  }

  public updateDeviceSocket(roomId: string, deviceId: string, newSocketId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.devices[deviceId]) {
      room.devices[deviceId].socketId = newSocketId;
      room.devices[deviceId].connected = true;
      room.devices[deviceId].lastSeen = Date.now();
      this.socketToDevice.set(newSocketId, { roomId, deviceId });
    }
  }

  public handleDisconnect(socketId: string): { room?: Room; deviceId?: string; wasHost?: boolean } {
    const info = this.socketToDevice.get(socketId);
    if (!info) return {};

    this.socketToDevice.delete(socketId);
    const room = this.rooms.get(info.roomId);
    if (!room) return {};

    const device = room.devices[info.deviceId];
    if (device) {
      device.connected = false;
      device.lastSeen = Date.now();
    }

    const wasHost = device ? device.isHost : false;

    // Check remaining connected devices
    const connectedDevices = Object.values(room.devices).filter(d => d.connected);

    if (connectedDevices.length === 0) {
      // Clean up room after 1 minute of empty state
      setTimeout(() => {
        const currentRoom = this.rooms.get(room.id);
        if (currentRoom) {
          const stillConnected = Object.values(currentRoom.devices).some(d => d.connected);
          if (!stillConnected) {
            this.codeToRoomId.delete(currentRoom.code);
            this.rooms.delete(currentRoom.id);
          }
        }
      }, 60000);
    } else if (wasHost && connectedDevices.length > 0) {
      // Transfer host to first available connected device
      const newHost = connectedDevices[0];
      newHost.isHost = true;
      room.hostId = newHost.id;
      if (device) device.isHost = false;
    }

    return { room, deviceId: info.deviceId, wasHost };
  }

  public removeDevice(roomId: string, targetDeviceId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    delete room.devices[targetDeviceId];
    return room;
  }
}
