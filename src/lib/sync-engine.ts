import { AudioEngine } from './audio-engine';
import { ClockSync } from './clock-sync';
import { SpatialAudioProcessor } from './spatial-audio';
import { PlayCommandPayload, SeekCommandPayload } from '../types/websocket';
import { AudioEffectsConfig, SpeakerPosition, Vector2D } from '../types/room';

export class SyncEngine {
  private audioEngine: AudioEngine;
  private clockSync: ClockSync;
  private spatialProcessor: SpatialAudioProcessor | null = null;

  private currentSourceNode: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private currentTrackId: string | null = null;

  private isPlaying: boolean = false;
  private playbackStartTime: number = 0; // AudioContext.currentTime when source node started
  private startPositionOffset: number = 0; // Track position (sec) corresponding to start
  private currentPlaybackRate: number = 1.0;

  private preloadedBuffers: Map<string, AudioBuffer> = new Map();

  constructor(audioEngine: AudioEngine, clockSync: ClockSync) {
    this.audioEngine = audioEngine;
    this.clockSync = clockSync;
  }

  /**
   * Set up spatial audio processor pipeline
   */
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

    // Stop current playing source node if active
    this.stopLocalNode();

    // Fetch or get audio buffer
    let buffer: AudioBuffer;
    if (trackUrl === 'demo_synthwave') {
      buffer = this.audioEngine.generateSampleBeat();
    } else {
      buffer = await this.audioEngine.loadAudio(trackUrl);
    }

    this.currentBuffer = buffer;
    this.currentTrackId = payload.trackId;
    this.currentPlaybackRate = payload.playbackRate || 1.0;

    // Ensure Spatial Processor is initialized
    this.initSpatialProcessor();
    const inputNode = this.spatialProcessor ? (this.spatialProcessor as any).inputNode : this.audioEngine.getMasterGain()!;

    // Create fresh AudioBufferSourceNode
    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.playbackRate.value = this.currentPlaybackRate;
    sourceNode.connect(inputNode);

    // Timing Math:
    // clientServerTime = Date.now() + clockOffset
    const currentServerTime = this.clockSync.getServerTime();
    
    // User manual delay calibration (e.g. bluetooth latency +50ms)
    const calibrationOffsetMs = this.audioEngine.getCalibrationOffsetMs();
    const effectiveStartAt = payload.startAt + calibrationOffsetMs;

    const delayMs = effectiveStartAt - currentServerTime;
    const delaySeconds = delayMs / 1000;

    let targetAudioCtxTime: number;
    let startPositionSeconds: number;

    if (delaySeconds >= 0) {
      // Future start timestamp: schedule Web Audio start
      targetAudioCtxTime = ctx.currentTime + delaySeconds;
      startPositionSeconds = Math.max(0, payload.position);
    } else {
      // Late join or past start timestamp: catch up immediately
      const elapsedSinceStart = -delaySeconds * this.currentPlaybackRate;
      targetAudioCtxTime = ctx.currentTime;
      startPositionSeconds = Math.max(0, payload.position + elapsedSinceStart);
    }

    if (startPositionSeconds >= buffer.duration) {
      console.warn('Track already finished at scheduled position');
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

  /**
   * Pause local playback immediately
   */
  public pauseLocalTrack(position?: number) {
    this.stopLocalNode();
    this.isPlaying = false;
    if (position !== undefined) {
      this.startPositionOffset = position;
    }
  }

  /**
   * Stop local playback
   */
  public stopLocalTrack() {
    this.stopLocalNode();
    this.isPlaying = false;
    this.startPositionOffset = 0;
  }

  /**
   * Seek local playback
   */
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
   * Micro-adjust playback rate for seamless drift correction
   */
  public setPlaybackRate(rate: number) {
    this.currentPlaybackRate = rate;
    if (this.currentSourceNode && this.audioEngine.getContext()) {
      const ctx = this.audioEngine.getContext();
      this.currentSourceNode.playbackRate.setTargetAtTime(rate, ctx.currentTime, 0.05);
    }
  }

  /**
   * Get current track position in seconds
   */
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
