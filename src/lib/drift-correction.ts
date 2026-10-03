import { Socket } from 'socket.io-client';
import { SyncEngine } from './sync-engine';
import { ClockSync } from './clock-sync';
import { DriftCorrectionPayload, PositionUpdatePayload } from '../types/websocket';

export class DriftCorrector {
  private socket: Socket;
  private syncEngine: SyncEngine;
  private clockSync: ClockSync;
  private deviceId: string;
  private currentTrackUrl: string = '';
  private timer: any = null;

  constructor(socket: Socket, syncEngine: SyncEngine, clockSync: ClockSync, deviceId: string) {
    this.socket = socket;
    this.syncEngine = syncEngine;
    this.clockSync = clockSync;
    this.deviceId = deviceId;
    this.setupListeners();
  }

  public setDeviceId(deviceId: string) {
    this.deviceId = deviceId;
  }

  public setCurrentTrackUrl(url: string) {
    this.currentTrackUrl = url;
  }

  private setupListeners() {
    this.socket.on('DRIFT_CORRECTION', (data: DriftCorrectionPayload) => {
      if (data.deviceId !== this.deviceId) return;

      if (data.resync && data.targetPosition !== undefined && this.currentTrackUrl) {
        console.warn(`[DriftCorrector] Major drift detected. Resynchronizing to target position ${data.targetPosition}s`);
        this.syncEngine.seekScheduledTrack(this.currentTrackUrl, {
          position: data.targetPosition,
          startAt: this.clockSync.getServerTime() + 100
        });
      } else if (data.playbackRate !== undefined) {
        // Tweak playbackRate (e.g. 1.004 or 0.996) for subtle drift correction
        this.syncEngine.setPlaybackRate(data.playbackRate);
      }
    });
  }

  /**
   * Start periodic position reporting loop
   */
  public startReporting() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.syncEngine.getIsPlaying() && this.deviceId) {
        const currentPos = this.syncEngine.getCurrentTrackPosition();
        const serverTimestamp = this.clockSync.getServerTime();

        const payload: PositionUpdatePayload = {
          deviceId: this.deviceId,
          position: currentPos,
          timestamp: serverTimestamp
        };

        this.socket.emit('POSITION_REPORT', payload);
      }
    }, 2500);
  }

  public stopReporting() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
