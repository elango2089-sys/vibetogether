import { AudioEngine } from './audio-engine';
import { ClockSync } from './clock-sync';
import { SpatialAudioProcessor } from './spatial-audio';
import { PlayCommandPayload, SeekCommandPayload } from '../types/websocket';
import { AudioEffectsConfig } from '../types/room';

export class SyncEngine {
  private audioEngine: AudioEngine;
  private clockSync: ClockSync;
  private spatialProcessor: SpatialAudioProcessor | null = null;

  private currentSourceNode: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private currentTrackId: string | null = null;

  private isPlaying: boolean = false;
  private playbackStartTime: number = 0;
  private startPositionOffset: number = 0;
  private currentPlaybackRate: number = 1.0;

  constructor(audioEngine: AudioEngine, clockSync: ClockSync) {
    this.audioEngine = audioEngine;
    this.clockSync = clockSync;
  }

  public initSpatialProcessor() {
    const ctx = this.audioEngine.getContext();
    const masterGain = this.audioEngine.getMasterGain();
    if (masterGain && !this.spatialProcessor) {
      const inputNode = ctx.createGain();
      const outputNode = masterGain;
      this.spatialProcessor = new SpatialAudioProcessor(ctx, inputNode, outputNode);
    }
  }

  public getSpatialProcessor(): SpatialAudioProcessor | null {
    return this.spatialProcessor;
  }

  /**
   * Pre-warm & pre-decode audio track buffer in background for zero-latency playback start
   */
  public async preloadTrackBuffer(trackUrl: string): Promise<AudioBuffer | null> {
    try {
      if (trackUrl === 'demo_synthwave') {
        return this.audioEngine.generateSampleBeat();
      }
      return await this.audioEngine.loadAudio(trackUrl);
    } catch (e) {
      console.warn('Preload audio track warning:', e);
      return null;
    }
  }

  /**
   * Schedule precision synchronized playback at target server timestamp
   */
  public async playScheduledTrack(
    trackUrl: string,
    payload: PlayCommandPayload
  ): Promise<void> {
    const ctx = this.audioEngine.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.stopLocalNode();

    // Fetch or pre-cached buffer
    let buffer: AudioBuffer;
    if (trackUrl === 'demo_synthwave') {
      buffer = this.audioEngine.generateSampleBeat();
    } else {
      buffer = await this.audioEngine.loadAudio(trackUrl);
    }

    this.currentBuffer = buffer;
    this.currentTrackId = payload.trackId;
    this.currentPlaybackRate = payload.playbackRate || 1.0;

    this.initSpatialProcessor();
    const inputNode = this.spatialProcessor ? (this.spatialProcessor as any).inputNode : this.audioEngine.getMasterGain()!;

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.playbackRate.value = this.currentPlaybackRate;
    sourceNode.connect(inputNode);

    // Precise Timing
    const currentServerTime = this.clockSync.getServerTime();
    const calibrationOffsetMs = this.audioEngine.getCalibrationOffsetMs();
    const effectiveStartAt = payload.startAt + calibrationOffsetMs;

    const delayMs = effectiveStartAt - currentServerTime;
    const delaySeconds = delayMs / 1000;

    let targetAudioCtxTime: number;
    let startPositionSeconds: number;

    if (delaySeconds >= 0) {
      targetAudioCtxTime = ctx.currentTime + delaySeconds;
      startPositionSeconds = Math.max(0, payload.position);
    } else {
      const elapsedSinceStart = -delaySeconds * this.currentPlaybackRate;
      targetAudioCtxTime = ctx.currentTime;
      startPositionSeconds = Math.max(0, payload.position + elapsedSinceStart);
    }

    if (startPositionSeconds >= buffer.duration) {
      return;
    }

    sourceNode.start(targetAudioCtxTime, startPositionSeconds);

    this.currentSourceNode = sourceNode;
    this.isPlaying = true;
    this.playbackStartTime = targetAudioCtxTime;
    this.startPositionOffset = startPositionSeconds;

    sourceNode.onended = () => {
      if (this.currentSourceNode === sourceNode) {
        this.isPlaying = false;
        this.currentSourceNode = null;
      }
    };
  }

  public pauseLocalTrack(position?: number) {
    this.stopLocalNode();
    this.isPlaying = false;
    if (position !== undefined) {
      this.startPositionOffset = position;
    }
  }

  public stopLocalTrack() {
    this.stopLocalNode();
    this.isPlaying = false;
    this.startPositionOffset = 0;
  }

  public async seekScheduledTrack(
    trackUrl: string,
    payload: SeekCommandPayload
  ): Promise<void> {
    if (this.isPlaying && this.currentTrackId) {
      await this.playScheduledTrack(trackUrl, {
        trackId: this.currentTrackId,
        startAt: payload.startAt,
        position: payload.position,
        playbackRate: this.currentPlaybackRate
      });
    } else {
      this.startPositionOffset = payload.position;
    }
  }

  /**
   * Micro-adjust playback rate with smooth parameter ramping (prevents audible speed up / pitch changes)
   */
  public setPlaybackRate(rate: number) {
    this.currentPlaybackRate = rate;
    if (this.currentSourceNode && this.audioEngine.getContext()) {
      const ctx = this.audioEngine.getContext();
      // Smooth 0.5s linear transition so rate adjustment is totally imperceptible to human ear
      this.currentSourceNode.playbackRate.setTargetAtTime(rate, ctx.currentTime, 0.5);
    }
  }

  public getCurrentTrackPosition(): number {
    if (!this.isPlaying || !this.currentSourceNode) {
      return this.startPositionOffset;
    }
    const ctx = this.audioEngine.getContext();
    const elapsedSec = (ctx.currentTime - this.playbackStartTime) * this.currentPlaybackRate;
    const currentPos = this.startPositionOffset + Math.max(0, elapsedSec);
    
    if (this.currentBuffer && currentPos >= this.currentBuffer.duration) {
      return this.currentBuffer.duration;
    }
    return currentPos;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private stopLocalNode() {
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch (e) {}
      this.currentSourceNode = null;
    }
  }
}
