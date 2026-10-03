import { Room, Device, TrackInfo, SpeakerPosition, Vector2D, AudioEffectsConfig } from './room.js';

export interface SyncPingData {
  clientTime: number; // performance.now() or Date.now()
}

export interface SyncPongData {
  clientTime: number;
  serverTime: number;
}

export interface PlayCommandPayload {
  trackId: string;
  startAt: number; // Server timestamp (ms) when track position 0 or `position` will start
  position: number; // Seconds into track
  playbackRate?: number;
}

export interface PauseCommandPayload {
  position: number;
  serverTime: number;
}

export interface SeekCommandPayload {
  position: number;
  startAt: number;
}

export interface PositionUpdatePayload {
  deviceId: string;
  position: number; // Current audio context playback position (seconds)
  timestamp: number; // Client server-corrected timestamp
}

export interface DriftCorrectionPayload {
  deviceId: string;
  playbackRate: number; // e.g., 1.003 or 0.997
  targetPosition?: number;
  resync?: boolean;
}

export interface ServerToClientEvents {
  SYNC_PONG: (data: SyncPongData) => void;
  ROOM_CREATED: (data: { room: Room; device: Device }) => void;
  ROOM_JOINED: (data: { room: Room; device: Device }) => void;
  ROOM_ERROR: (data: { code: string; message: string }) => void;
  ROOM_UPDATED: (data: { room: Room }) => void;
  DEVICE_CONNECTED: (data: { device: Device }) => void;
  DEVICE_DISCONNECTED: (data: { deviceId: string }) => void;
  DEVICE_UPDATED: (data: { device: Device }) => void;
  PLAY: (data: PlayCommandPayload) => void;
  PAUSE: (data: PauseCommandPayload) => void;
  STOP: () => void;
  SEEK: (data: SeekCommandPayload) => void;
  TRACK_CHANGED: (data: { track: TrackInfo; startAt?: number }) => void;
  DRIFT_CORRECTION: (data: DriftCorrectionPayload) => void;
  EFFECT_CHANGED: (data: { deviceId: string; effects: AudioEffectsConfig }) => void;
  HOST_TRANSFERRED: (data: { newHostId: string }) => void;
  KICKED: (data: { reason: string }) => void;
}

export interface ClientToServerEvents {
  SYNC_PING: (data: SyncPingData) => void;
  ROOM_CREATE: (data: { deviceName: string; platform?: string }) => void;
  ROOM_JOIN: (data: { roomCode: string; deviceName: string; platform?: string }) => void;
  ROOM_LEAVE: () => void;
  PLAY: (data: { position?: number }) => void;
  PAUSE: (data: { position: number }) => void;
  STOP: () => void;
  SEEK: (data: { position: number }) => void;
  TRACK_SELECT: (data: { track: TrackInfo }) => void;
  POSITION_REPORT: (data: PositionUpdatePayload) => void;
  VOLUME_CHANGE: (data: { volume: number; muted: boolean }) => void;
  EFFECT_UPDATE: (data: { effects: AudioEffectsConfig }) => void;
  DEVICE_POSITION_UPDATE: (data: { targetDeviceId: string; position: SpeakerPosition; vector2D?: Vector2D }) => void;
  HOST_TRANSFER: (data: { targetDeviceId: string }) => void;
  REMOVE_DEVICE: (data: { targetDeviceId: string }) => void;
  LOCK_ROOM: (data: { isLocked: boolean }) => void;
  TOGGLE_PARTICIPANT_CONTROL: (data: { allow: boolean }) => void;
}
