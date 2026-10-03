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
      const t2 = data.serverTime;

      const rtt = Math.max(0, t3 - t0);
      const offset = ((t1 - t0) + (t2 - t3)) / 2;

      this.addSample(offset, rtt);
    });
  }

  private addSample(offset: number, rtt: number) {
    this.offsetSamples.push(offset);
    this.rttSamples.push(rtt);

    if (this.offsetSamples.length > 30) {
      this.offsetSamples.shift();
      this.rttSamples.shift();
    }

    // Keep lowest 60% RTT samples to filter network jitter
    const samplePairs = this.offsetSamples.map((off, idx) => ({
      offset: off,
      rtt: this.rttSamples[idx]
    }));

    samplePairs.sort((a, b) => a.rtt - b.rtt);
    const bestSamples = samplePairs.slice(0, Math.max(1, Math.floor(samplePairs.length * 0.6)));

    // Calculate median offset from best samples
    bestSamples.sort((a, b) => a.offset - b.offset);
    const mid = Math.floor(bestSamples.length / 2);
    
    this.currentOffset = bestSamples.length % 2 !== 0
      ? bestSamples[mid].offset
      : (bestSamples[mid - 1].offset + bestSamples[mid].offset) / 2;

    this.currentRTT = rtt;

    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.getStats());
    }
  }

  /**
   * Start initial multi-ping burst and set up rapid periodic ping
   */
  public startSync() {
    this.isSyncing = true;
    this.offsetSamples = [];
    this.rttSamples = [];

    // Rapid burst ping (15 samples @ 40ms interval)
    let burstCount = 0;
    const burstTimer = setInterval(() => {
      this.sendPing();
      burstCount++;
      if (burstCount >= 15) {
        clearInterval(burstTimer);
      }
    }, 40);

    // Rapid periodic refresh every 2 seconds
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.intervalTimer = setInterval(() => {
      this.sendPing();
    }, 2000);
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
