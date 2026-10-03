export type SpeakerPosition = 
  | 'CENTER'
  | 'FRONT_LEFT'
  | 'FRONT_RIGHT'
  | 'LEFT'
  | 'RIGHT'
  | 'REAR_LEFT'
  | 'REAR_RIGHT'
  | 'SUB_REAR';

export interface Vector2D {
  x: number; // -1.0 to 1.0 (left to right)
  y: number; // -1.0 to 1.0 (rear to front)
}

export interface Device {
  id: string;
  socketId: string;
  roomId: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  lastSeen: number;
  speakerPosition: SpeakerPosition;
  position2D: Vector2D;
  volume: number; // 0.0 to 1.0
  muted: boolean;
  clockOffset: number; // ms difference from server
  rtt: number; // round trip time ms
  drift: number; // ms drift from host position
  isSyncing: boolean;
  platform?: string;
}

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  url: string;
  coverUrl?: string;
  isLocalUpload?: boolean;
}

export type PlaybackStatus = 'playing' | 'paused' | 'stopped';

export interface Room {
  id: string;
  code: string; // 6-digit numeric code
  hostId: string;
  createdAt: number;
  maxDevices: number; // default 8
  isLocked: boolean;
  allowParticipantControl: boolean;
  currentTrack?: TrackInfo;
  playbackState: PlaybackStatus;
  position: number; // current audio track position in seconds
  startAt?: number; // absolute server timestamp (ms) when playback started/resumed
  playbackRate: number; // default 1.0
  devices: Record<string, Device>; // deviceId -> Device
}

export interface AudioEffectsConfig {
  spatial8D: boolean;
  rotationSpeed: number; // 0.1 to 2.0 Hz
  spatialWidth: number; // 0 to 100%
  bassBoost: number; // 0 to 100%
  treble: number; // 0 to 100%
  reverb: number; // 0 to 100%
  delay: number; // 0 to 100%
  lowPass: number; // 200 to 20000 Hz
  highPass: number; // 20 to 5000 Hz
}
