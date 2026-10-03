import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

import { Room, Device, TrackInfo, SpeakerPosition, AudioEffectsConfig } from './types/room';
import { ServerToClientEvents, ClientToServerEvents } from './types/websocket';

import { AudioEngine } from './lib/audio-engine';
import { ClockSync, ClockSyncStats } from './lib/clock-sync';
import { SyncEngine } from './lib/sync-engine';
import { DriftCorrector } from './lib/drift-correction';

import { Header } from './components/Header';
import { RoomCreation } from './components/RoomCreation';
import { MusicPlayer } from './components/MusicPlayer';
import { DeviceList } from './components/DeviceList';
import { SpatialRoom } from './components/SpatialRoom';
import { AudioEffects } from './components/AudioEffects';
import { SyncIndicator } from './components/SyncIndicator';

import { AudioUnlockModal } from './components/AudioUnlockModal';
import { AudioCalibration } from './components/AudioCalibration';
import { QRJoinModal } from './components/QRJoinModal';

export default function App() {
  // Socket & Audio Core Instances
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());
  const clockSyncRef = useRef<ClockSync | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const driftCorrectorRef = useRef<DriftCorrector | null>(null);

  // App State
  const [room, setRoom] = useState<Room | null>(null);
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'player' | 'devices' | 'spatial' | 'effects'>('player');
  const [clockStats, setClockStats] = useState<ClockSyncStats>({ clockOffset: 0, rtt: 0, samplesCount: 0, lastUpdated: 0 });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [muted, setMuted] = useState<boolean>(false);
  const [calibrationOffsetMs, setCalibrationOffsetMs] = useState<number>(0);

  // Modals
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(true);
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);

  // Effects Config State
  const [effectsConfig, setEffectsConfig] = useState<AudioEffectsConfig>({
    spatial8D: false,
    rotationSpeed: 0.25,
    spatialWidth: 50,
    bassBoost: 0,
    treble: 0,
    reverb: 0,
    delay: 0,
    lowPass: 20000,
    highPass: 20
  });

  // URL Code detection (e.g. /join/482731)
  const [initialCode, setInitialCode] = useState<string>('');

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/join\/(\d{6})/);
    if (match && match[1]) {
      setInitialCode(match[1]);
    }
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    // Instantiate Sync Core Modules
    const audioEngine = audioEngineRef.current;
    const clockSync = new ClockSync(socket as any, (stats) => setClockStats(stats));
    clockSyncRef.current = clockSync;

    const syncEngine = new SyncEngine(audioEngine, clockSync);
    syncEngineRef.current = syncEngine;

    const driftCorrector = new DriftCorrector(socket as any, syncEngine, clockSync, '');
    driftCorrectorRef.current = driftCorrector;

    // Socket Event Handlers
    socket.on('ROOM_CREATED', ({ room, device }) => {
      setRoom(room);
      setCurrentDevice(device);
      setErrorMessage(null);
      driftCorrector.setDeviceId(device.id);

      clockSync.startSync();
      driftCorrector.startReporting();
    });

    socket.on('ROOM_JOINED', ({ room, device }) => {
      setRoom(room);
      setCurrentDevice(device);
      setErrorMessage(null);
      driftCorrector.setDeviceId(device.id);

      clockSync.startSync();
      driftCorrector.startReporting();

      // If room is already playing, join in immediately
      if (room.playbackState === 'playing' && room.currentTrack && room.startAt) {
        syncEngine.playScheduledTrack(room.currentTrack.url, {
          trackId: room.currentTrack.id,
          startAt: room.startAt,
          position: room.position,
          playbackRate: room.playbackRate
        });
        setIsPlaying(true);
      }
    });

    socket.on('ROOM_ERROR', ({ message }) => {
      setErrorMessage(message);
    });

    socket.on('ROOM_UPDATED', ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      if (currentDevice && updatedRoom.devices[currentDevice.id]) {
        setCurrentDevice(updatedRoom.devices[currentDevice.id]);
      }
    });

    socket.on('PLAY', (payload) => {
      setIsPlaying(true);
      if (room?.currentTrack) {
        driftCorrector.setCurrentTrackUrl(room.currentTrack.url);
        syncEngine.playScheduledTrack(room.currentTrack.url, payload);
      }
    });

    socket.on('PAUSE', (payload) => {
      setIsPlaying(false);
      syncEngine.pauseLocalTrack(payload.position);
      setCurrentPosition(payload.position);
    });

    socket.on('STOP', () => {
      setIsPlaying(false);
      syncEngine.stopLocalTrack();
      setCurrentPosition(0);
    });

    socket.on('SEEK', (payload) => {
      if (room?.currentTrack) {
        syncEngine.seekScheduledTrack(room.currentTrack.url, payload);
      }
      setCurrentPosition(payload.position);
    });

    socket.on('TRACK_CHANGED', ({ track, startAt }) => {
      driftCorrector.setCurrentTrackUrl(track.url);
      if (startAt) {
        setIsPlaying(true);
        syncEngine.playScheduledTrack(track.url, {
          trackId: track.id,
          startAt,
          position: 0
        });
      } else {
        setIsPlaying(false);
        syncEngine.stopLocalTrack();
      }
    });

    socket.on('HOST_TRANSFERRED', ({ newHostId }) => {
      if (currentDevice) {
        const isMeNewHost = currentDevice.id === newHostId;
        setCurrentDevice((prev) => prev ? { ...prev, isHost: isMeNewHost } : null);
      }
    });

    socket.on('KICKED', ({ reason }) => {
      alert(`You were removed from the room: ${reason}`);
      setRoom(null);
      setCurrentDevice(null);
      clockSync.stopSync();
      driftCorrector.stopReporting();
    });

    return () => {
      socket.disconnect();
      clockSync.stopSync();
      driftCorrector.stopReporting();
    };
  }, []);

  // Track position timer tick (for UI progress slider)
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (syncEngineRef.current && isPlaying) {
        const pos = syncEngineRef.current.getCurrentTrackPosition();
        setCurrentPosition(pos);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Audio Context Unlock Check
  const handleUnlockAudio = async () => {
    const success = await audioEngineRef.current.unlockAudio();
    setIsAudioUnlocked(success);
    setShowUnlockModal(false);
  };

  // User Actions
  const handleCreateRoom = (deviceName: string) => {
    if (!audioEngineRef.current.getIsUnlocked()) {
      setShowUnlockModal(true);
    }
    socketRef.current?.emit('ROOM_CREATE', { deviceName, platform: navigator.platform });
  };

  const handleJoinRoom = (roomCode: string, deviceName: string) => {
    if (!audioEngineRef.current.getIsUnlocked()) {
      setShowUnlockModal(true);
    }
    socketRef.current?.emit('ROOM_JOIN', { roomCode, deviceName, platform: navigator.platform });
  };

  const handlePlay = () => {
    if (!audioEngineRef.current.getIsUnlocked()) {
      setShowUnlockModal(true);
    }
    socketRef.current?.emit('PLAY', { position: currentPosition });
  };

  const handlePause = () => {
    socketRef.current?.emit('PAUSE', { position: currentPosition });
  };

  const handleStop = () => {
    socketRef.current?.emit('STOP');
  };

  const handleSeek = (pos: number) => {
    socketRef.current?.emit('SEEK', { position: pos });
  };

  const handleTrackSelect = (track: TrackInfo) => {
    socketRef.current?.emit('TRACK_SELECT', { track });
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.track) {
        handleTrackSelect(data.track);
      } else {
        alert(data.error || 'Audio upload failed');
      }
    } catch (err: any) {
      alert('Failed to upload file: ' + err.message);
    }
  };

  const handleVolumeChange = (vol: number, isMuted: boolean) => {
    setVolume(vol);
    setMuted(isMuted);
    audioEngineRef.current.setVolume(vol, isMuted);
    socketRef.current?.emit('VOLUME_CHANGE', { volume: vol, muted: isMuted });
  };

  const handleSpeakerPositionChange = (targetDeviceId: string, pos: SpeakerPosition) => {
    socketRef.current?.emit('DEVICE_POSITION_UPDATE', { targetDeviceId, position: pos });
    if (targetDeviceId === currentDevice?.id) {
      const processor = syncEngineRef.current?.getSpatialProcessor();
      processor?.setSpeakerPosition(pos);
    }
  };

  const handleEffectsChange = (newConfig: Partial<AudioEffectsConfig>) => {
    const updated = { ...effectsConfig, ...newConfig };
    setEffectsConfig(updated);
    const processor = syncEngineRef.current?.getSpatialProcessor();
    processor?.updateConfig(updated);
  };

  const handleCalibrationChange = (ms: number) => {
    setCalibrationOffsetMs(ms);
    audioEngineRef.current.setCalibrationOffset(ms);
  };

  const isHost = currentDevice?.isHost || false;
  const canControl = isHost || (room?.allowParticipantControl || false);

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      
      {/* Top Header */}
      <Header
        room={room}
        currentDevice={currentDevice}
        rtt={clockStats.rtt}
        clockOffset={clockStats.clockOffset}
        onOpenQR={() => setShowQRModal(true)}
        onOpenCalibration={() => setShowCalibrationModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-24">
        
        {!room ? (
          <RoomCreation
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            errorMessage={errorMessage}
            initialCode={initialCode}
          />
        ) : (
          <div className="space-y-6">
            
            {/* Sync Meter Status Bar */}
            <SyncIndicator
              rtt={clockStats.rtt}
              clockOffset={clockStats.clockOffset}
              drift={currentDevice?.drift || 0}
              calibrationOffsetMs={calibrationOffsetMs}
              onOpenCalibration={() => setShowCalibrationModal(true)}
            />

            {/* Active Tab View */}
            {activeTab === 'player' && (
              <MusicPlayer
                room={room}
                isPlaying={isPlaying}
                currentPosition={currentPosition}
                isHost={isHost}
                canControl={canControl}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                onSeek={handleSeek}
                onTrackSelect={handleTrackSelect}
                onFileUpload={handleFileUpload}
                onVolumeChange={handleVolumeChange}
                analyser={audioEngineRef.current.getAnalyser()}
                volume={volume}
                muted={muted}
              />
            )}

            {activeTab === 'devices' && (
              <DeviceList
                room={room}
                currentDeviceId={currentDevice?.id || ''}
                isHost={isHost}
                onRemoveDevice={(target) => socketRef.current?.emit('REMOVE_DEVICE', { targetDeviceId: target })}
                onTransferHost={(target) => socketRef.current?.emit('HOST_TRANSFER', { targetDeviceId: target })}
                onToggleLock={(locked) => socketRef.current?.emit('LOCK_ROOM', { isLocked: locked })}
                onToggleParticipantControl={(allow) => socketRef.current?.emit('TOGGLE_PARTICIPANT_CONTROL', { allow })}
                onOpenQR={() => setShowQRModal(true)}
                onSpeakerPositionChange={handleSpeakerPositionChange}
              />
            )}

            {activeTab === 'spatial' && (
              <SpatialRoom
                room={room}
                currentDeviceId={currentDevice?.id || ''}
                isHost={isHost}
                onPositionChange={handleSpeakerPositionChange}
              />
            )}

            {activeTab === 'effects' && (
              <AudioEffects
                config={effectsConfig}
                onChange={handleEffectsChange}
              />
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-500 font-mono">
        SYNC AUDIO • Low-Latency Multi-Device Web Audio Engine • Max 8 Devices
      </footer>

      {/* Modals */}
      <AudioUnlockModal
        isOpen={showUnlockModal}
        onUnlock={handleUnlockAudio}
      />

      <AudioCalibration
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        calibrationOffsetMs={calibrationOffsetMs}
        onChangeOffset={handleCalibrationChange}
        onTestClick={() => audioEngineRef.current.playCalibrationClick()}
      />

      {room && (
        <QRJoinModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          roomCode={room.code}
        />
      )}

    </div>
  );
}
