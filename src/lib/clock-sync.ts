import { Socket } from 'socket.io-client';
import { SyncPingData, SyncPongData } from '../types/websocket';

export interface ClockSyncStats {
  clockOffset: number; // ms to add to client Date.now() to get server time
  rtt: number; // ms round trip time
  samplesCount: number;
  lastUpdated: number;
}

export class ClockSync {
  private socket: Socket;
  private offsetSamples: number[] = [];
  private rttSamples: number[] = [];
  private currentOffset: number = 0;
  private currentRTT: number = 0;
  private isSyncing: boolean = false;
  private intervalTimer: any = null;
  private onStatsUpdate?: (stats: ClockSyncStats) => void;

  constructor(socket: Socket, onStatsUpdate?: (stats: ClockSyncStats) => void) {
    this.socket = socket;
    this.onStatsUpdate = onStatsUpdate;
    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('SYNC_PONG', (data: SyncPongData) => {
      const t3 = Date.now();
      const t0 = data.clientTime;
      const t1 = data.serverTime;
      const t2 = data.serverTime; // server timestamp when pong emitted

      const rtt = Math.max(0, t3 - t0);
      const offset = ((t1 - t0) + (t2 - t3)) / 2;

      this.addSample(offset, rtt);
    });
  }

  private addSample(offset: number, rtt: number) {
    this.offsetSamples.push(offset);
    this.rttSamples.push(rtt);

    if (this.offsetSamples.length > 20) {
      this.offsetSamples.shift();
      this.rttSamples.shift();
    }

    // Filter samples with lower RTT for higher accuracy
    const minRTT = Math.min(...this.rttSamples);
    const validOffsets: number[] = [];

    for (let i = 0; i < this.rttSamples.length; i++) {
      // Keep samples within 20ms or 1.5x of min RTT
      if (this.rttSamples[i] <= Math.max(minRTT + 20, minRTT * 1.5)) {
        validOffsets.push(this.offsetSamples[i]);
      }
    }

    const targetList = validOffsets.length > 0 ? validOffsets : this.offsetSamples;
    targetList.sort((a, b) => a - b);

    // Median offset
    const mid = Math.floor(targetList.length / 2);
    this.currentOffset = targetList.length % 2 !== 0 
      ? targetList[mid] 
      : (targetList[mid - 1] + targetList[mid]) / 2;
    this.currentRTT = rtt;

    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.getStats());
    }
  }

  /**
   * Start initial multi-ping burst and set up periodic ping
   */
  public startSync() {
    this.isSyncing = true;
    this.offsetSamples = [];
    this.rttSamples = [];

    // Burst ping (8 samples)
    let burstCount = 0;
    const burstTimer = setInterval(() => {
      this.sendPing();
      burstCount++;
      if (burstCount >= 8) {
        clearInterval(burstTimer);
      }
    }, 150);

    // Periodic ping every 10 seconds
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.intervalTimer = setInterval(() => {
      this.sendPing();
    }, 10000);
  }

  public stopSync() {
    this.isSyncing = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public sendPing() {
    if (this.socket.connected) {
      this.socket.emit('SYNC_PING', { clientTime: Date.now() } as SyncPingData);
    }
  }

  /**
   * Get current server time estimated on client
   */
  public getServerTime(): number {
    return Date.now() + this.currentOffset;
  }

  public getStats(): ClockSyncStats {
    return {
      clockOffset: Math.round(this.currentOffset),
      rtt: Math.round(this.currentRTT),
      samplesCount: this.offsetSamples.length,
      lastUpdated: Date.now()
    };
  }
}
