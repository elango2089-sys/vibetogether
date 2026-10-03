export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private userDelayOffsetMs: number = 0; // Manual audio latency calibration (-200ms to +500ms)
  private isUnlocked: boolean = false;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();

  constructor() {}

  /**
   * Initialize or retrieve Web Audio AudioContext
   */
  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /**
   * Unlock AudioContext on touch/click user interaction (critical for iOS Safari & Android Chrome)
   */
  public async unlockAudio(): Promise<boolean> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Play silent buffer to unlock iOS AudioSession
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      this.isUnlocked = ctx.state === 'running';
    } catch (e) {
      console.warn('Unlock audio warning:', e);
    }

    return this.isUnlocked || ctx.state === 'running';
  }

  public getIsUnlocked(): boolean {
    return this.ctx ? this.ctx.state === 'running' : false;
  }

  public getMasterGain(): GainNode | null {
    this.getContext();
    return this.masterGain;
  }

  public getAnalyser(): AnalyserNode | null {
    this.getContext();
    return this.analyser;
  }

  public setVolume(volume: number, muted: boolean = false) {
    if (this.masterGain && this.ctx) {
      const targetGain = muted ? 0 : Math.max(0, Math.min(1, volume));
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  public setCalibrationOffset(ms: number) {
    this.userDelayOffsetMs = ms;
  }

  public getCalibrationOffsetSeconds(): number {
    return this.userDelayOffsetMs / 1000;
  }

  public getCalibrationOffsetMs(): number {
    return this.userDelayOffsetMs;
  }

  /**
   * Fetch and decode audio array buffer from URL with caching
   */
  public async loadAudio(url: string): Promise<AudioBuffer> {
    if (this.audioBufferCache.has(url)) {
      return this.audioBufferCache.get(url)!;
    }

    const ctx = this.getContext();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.audioBufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  /**
   * Play test calibration ping/click for latency alignment
   */
  public playCalibrationClick() {
    const ctx = this.getContext();
    if (ctx.state !== 'running') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  /**
   * Generate a built-in synthwave beat buffer if user has no audio file uploaded
   */
  public generateSampleBeat(): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    const duration = 16.0; // 16 seconds loop
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, numSamples, sampleRate);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = 120;
    const beatLen = sampleRate * (60 / bpm);
    const sixteenthLen = beatLen / 4;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sixteenth = Math.floor(i / sixteenthLen);
      const step = sixteenth % 16;

      let sampleL = 0;
      let sampleR = 0;

      // Kick drum on 0, 4, 8, 12
      if (step % 4 === 0) {
        const kickTime = (i % (sixteenthLen * 4)) / sampleRate;
        if (kickTime < 0.2) {
          const freq = 130 * Math.exp(-kickTime * 25);
          const kickEnv = Math.exp(-kickTime * 15);
          sampleL += Math.sin(2 * Math.PI * freq * kickTime) * kickEnv * 0.7;
          sampleR += sampleL;
        }
      }

      // Snare drum on 4, 12
      if (step === 4 || step === 12) {
        const snareTime = (i % (sixteenthLen * 4)) / sampleRate;
        if (snareTime < 0.25) {
          const noise = (Math.random() * 2 - 1) * Math.exp(-snareTime * 18);
          const tone = Math.sin(2 * Math.PI * 180 * snareTime) * Math.exp(-snareTime * 20);
          sampleL += (noise * 0.4 + tone * 0.3);
          sampleR += sampleL;
        }
      }

      // Hi-hat on every 16th
      const hatTime = (i % sixteenthLen) / sampleRate;
      if (hatTime < 0.06) {
        const hatVol = (step % 2 === 0) ? 0.25 : 0.15;
        const hat = (Math.random() * 2 - 1) * Math.exp(-hatTime * 60) * hatVol;
        sampleL += hat * 0.8;
        sampleR += hat * 0.5;
      }

      // Synth bassline chord pulse
      const bassNotes = [55, 55, 65.4, 49]; // A1, A1, C2, G1
      const bassFreq = bassNotes[Math.floor(sixteenth / 16) % bassNotes.length];
      const bassTime = (i % sixteenthLen) / sampleRate;
      const bassEnv = Math.exp(-bassTime * 8);
      const bassSaw = (2 * ((bassTime * bassFreq) % 1) - 1) * bassEnv * 0.25;
      
      sampleL += bassSaw;
      sampleR += bassSaw;

      // Synth Arpeggio stereo movement
      const arpNotes = [440, 523.25, 659.25, 783.99, 880, 783.99, 659.25, 523.25];
      const currentArp = arpNotes[step % arpNotes.length];
      const arpTime = (i % sixteenthLen) / sampleRate;
      const arpEnv = Math.exp(-arpTime * 12);
      const arpSine = Math.sin(2 * Math.PI * currentArp * arpTime) * arpEnv * 0.15;
      const pan = Math.sin(t * 2);

      sampleL += arpSine * (0.5 - pan * 0.4);
      sampleR += arpSine * (0.5 + pan * 0.4);

      left[i] = Math.max(-1, Math.min(1, sampleL));
      right[i] = Math.max(-1, Math.min(1, sampleR));
    }

    this.audioBufferCache.set('demo_synthwave', buffer);
    return buffer;
  }
}
