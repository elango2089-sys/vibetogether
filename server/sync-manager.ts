import { Room } from './types/room.js';

export interface SyncMetrics {
  expectedPosition: number;
  driftMs: number;
  recommendation: 'none' | 'rate_adjust' | 'resync';
  suggestedRate: number; // default 1.0
}

export class SyncManager {
  // Ultra-low latency lead time (400ms is fast yet safe for WebSocket delivery)
  public static readonly SCHEDULE_LEAD_TIME_MS = 400;

  /**
   * Calculate future start timestamp (ms) with low latency
   */
  public calculateScheduledStart(leadTimeMs: number = SyncManager.SCHEDULE_LEAD_TIME_MS): number {
    return Date.now() + leadTimeMs;
  }

  /**
   * Get current expected playback position of a room at current server time
   */
  public getExpectedRoomPosition(room: Room): number {
    if (room.playbackState !== 'playing' || !room.startAt) {
      return room.position;
    }
    const elapsedSeconds = (Date.now() - room.startAt) / 1000;
    return room.position + Math.max(0, elapsedSeconds * room.playbackRate);
  }

  /**
   * Evaluate drift between client reported position and room expected position
   */
  public evaluateDrift(room: Room, clientPosition: number, clientTimestampMs: number): SyncMetrics {
    const now = Date.now();
    const expectedPos = this.getExpectedRoomPosition(room);
    
    // Account for transport time
    const timeLagSeconds = Math.max(0, (now - clientTimestampMs) / 1000);
    const adjustedExpectedPos = expectedPos + (timeLagSeconds * room.playbackRate);

    // Drift in milliseconds
    const driftMs = (clientPosition - adjustedExpectedPos) * 1000;
    const absDrift = Math.abs(driftMs);

    if (absDrift < 20) {
      // Sub-20ms: Perfect sync, no rate adjustment needed
      return {
        expectedPosition: adjustedExpectedPos,
        driftMs,
        recommendation: 'none',
        suggestedRate: 1.0
      };
    } else if (absDrift <= 180) {
      // 20ms - 180ms: Imperceptible micro rate tweak (0.1% change: 1.001 / 0.999)
      // Completely invisible to human ear, no pitch shift or speed-up glitch!
      const rateAdjustment = driftMs < 0 ? 1.0015 : 0.9985;
      return {
        expectedPosition: adjustedExpectedPos,
        driftMs,
        recommendation: 'rate_adjust',
        suggestedRate: rateAdjustment
      };
    } else {
      // Major drift (>180ms): Smooth resynchronization
      return {
        expectedPosition: adjustedExpectedPos,
        driftMs,
        recommendation: 'resync',
        suggestedRate: 1.0
      };
    }
  }
}
