import { Room } from '../src/types/room.js';

export interface SyncMetrics {
  expectedPosition: number;
  driftMs: number;
  recommendation: 'none' | 'rate_adjust' | 'resync';
  suggestedRate: number; // default 1.0
}

export class SyncManager {
  // Delay in milliseconds added to scheduled play commands to ensure all clients receive socket message before start time
  public static readonly SCHEDULE_LEAD_TIME_MS = 1500;

  /**
   * Calculate future start timestamp (ms)
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
    // Current server time corresponding to client's report
    const now = Date.now();
    const expectedPos = this.getExpectedRoomPosition(room);
    
    // Account for elapsed time between client timestamp and server now
    const timeLagSeconds = Math.max(0, (now - clientTimestampMs) / 1000);
    const adjustedExpectedPos = expectedPos + (timeLagSeconds * room.playbackRate);

    // Drift in milliseconds (positive means client is ahead, negative means client is behind)
    const driftMs = (clientPosition - adjustedExpectedPos) * 1000;
    const absDrift = Math.abs(driftMs);

    if (absDrift < 30) {
      return {
        expectedPosition: adjustedExpectedPos,
        driftMs,
        recommendation: 'none',
        suggestedRate: 1.0
      };
    } else if (absDrift <= 250) {
      // Client behind (driftMs < 0) -> speed up slightly (1.004)
      // Client ahead (driftMs > 0) -> slow down slightly (0.996)
      const rateAdjustment = driftMs < 0 ? 1.004 : 0.996;
      return {
        expectedPosition: adjustedExpectedPos,
        driftMs,
        recommendation: 'rate_adjust',
        suggestedRate: rateAdjustment
      };
    } else {
      return {
        expectedPosition: adjustedExpectedPos,
        driftMs,
        recommendation: 'resync',
        suggestedRate: 1.0
      };
    }
  }
}
