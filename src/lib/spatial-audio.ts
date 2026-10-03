import { AudioEffectsConfig, SpeakerPosition, Vector2D } from '../types/room';

export class SpatialAudioProcessor {
  private ctx: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;

  // DSP Node Chain
  private pannerNode: StereoPannerNode;
  private bassFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;
  private lowPassFilter: BiquadFilterNode;
  private highPassFilter: BiquadFilterNode;
  
  // Delay & Feedback Reverb Simulation
  private delayNode: DelayNode;
  private delayFeedbackGain: GainNode;
  private delayMixGain: GainNode;

  // Position processing
  private positionGain: GainNode;
  private positionPanner: StereoPannerNode;

  // Animation frame for 8D pan
  private animationFrameId: number | null = null;
  private rotationAngle: number = 0;
  private config: AudioEffectsConfig;
  private currentSpeakerPos: SpeakerPosition = 'CENTER';

  constructor(ctx: AudioContext, inputNode: GainNode, outputNode: GainNode) {
    this.ctx = ctx;
    this.inputNode = inputNode;
    this.outputNode = outputNode;

    this.config = {
      spatial8D: false,
      rotationSpeed: 0.25, // Hz
      spatialWidth: 50,
      bassBoost: 0,
      treble: 0,
      reverb: 0,
      delay: 0,
      lowPass: 20000,
      highPass: 20
    };

    // Create DSP nodes
    this.pannerNode = this.ctx.createStereoPanner();
    this.positionPanner = this.ctx.createStereoPanner();
    this.positionGain = this.ctx.createGain();

    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.setValueAtTime(120, this.ctx.currentTime);

    this.trebleFilter = this.ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.setValueAtTime(6000, this.ctx.currentTime);

    this.lowPassFilter = this.ctx.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);

    this.highPassFilter = this.ctx.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.setValueAtTime(20, this.ctx.currentTime);

    // Delay/Reverb Network
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.setValueAtTime(0.25, this.ctx.currentTime);
    this.delayFeedbackGain = this.ctx.createGain();
    this.delayFeedbackGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    this.delayMixGain = this.ctx.createGain();
    this.delayMixGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.connectChain();
  }

  private connectChain() {
    // Chain flow: Input -> HighPass -> LowPass -> BassFilter -> TrebleFilter -> Panner -> PositionPanner -> DelayMix -> Output
    this.inputNode.connect(this.highPassFilter);
    this.highPassFilter.connect(this.lowPassFilter);
    this.lowPassFilter.connect(this.bassFilter);
    this.bassFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.pannerNode);
    this.pannerNode.connect(this.positionPanner);
    this.positionPanner.connect(this.positionGain);

    // Main path to output
    this.positionGain.connect(this.outputNode);

    // Parallel Delay path
    this.positionGain.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.delayMixGain);
    this.delayMixGain.connect(this.outputNode);
  }

  public updateConfig(newConfig: Partial<AudioEffectsConfig>) {
    this.config = { ...this.config, ...newConfig };
    const now = this.ctx.currentTime;

    // Bass boost (-10dB to +18dB)
    const bassGain = (this.config.bassBoost / 100) * 18;
    this.bassFilter.gain.setTargetAtTime(bassGain, now, 0.05);

    // Treble (-10dB to +12dB)
    const trebleGain = (this.config.treble / 100) * 12;
    this.trebleFilter.gain.setTargetAtTime(trebleGain, now, 0.05);

    // Filters
    this.lowPassFilter.frequency.setTargetAtTime(Math.max(200, Math.min(20000, this.config.lowPass)), now, 0.05);
    this.highPassFilter.frequency.setTargetAtTime(Math.max(20, Math.min(5000, this.config.highPass)), now, 0.05);

    // Delay & Reverb mix (0.0 to 0.7 max gain)
    const delayMix = ((this.config.delay + this.config.reverb) / 200) * 0.7;
    this.delayMixGain.gain.setTargetAtTime(delayMix, now, 0.05);

    // 8D animation toggle
    if (this.config.spatial8D) {
      this.start8DRotation();
    } else {
      this.stop8DRotation();
      this.pannerNode.pan.setTargetAtTime(0, now, 0.05);
    }
  }

  /**
   * Configure audio DSP output depending on device position in physical 8-speaker room layout
   */
  public setSpeakerPosition(position: SpeakerPosition, vector2D?: Vector2D) {
    this.currentSpeakerPos = position;
    const now = this.ctx.currentTime;

    let pan = 0;
    let gain = 1.0;
    let lowPassFreq = 20000;
    let bassGainBoost = 0;

    if (vector2D) {
      pan = Math.max(-1.0, Math.min(1.0, vector2D.x));
      // Rear speakers (y < 0) get slight lowpass filter to simulate distance & back head HRTF
      if (vector2D.y < -0.3) {
        lowPassFreq = 4500;
      }
    } else {
      switch (position) {
        case 'FRONT_LEFT':
          pan = -0.7;
          break;
        case 'FRONT_RIGHT':
          pan = 0.7;
          break;
        case 'LEFT':
          pan = -1.0;
          break;
        case 'RIGHT':
          pan = 1.0;
          break;
        case 'REAR_LEFT':
          pan = -0.85;
          lowPassFreq = 5000;
          break;
        case 'REAR_RIGHT':
          pan = 0.85;
          lowPassFreq = 5000;
          break;
        case 'SUB_REAR':
          pan = 0.0;
          lowPassFreq = 220; // Dedicated Subwoofer channel
          bassGainBoost = 12;
          break;
        case 'CENTER':
        default:
          pan = 0.0;
          break;
      }
    }

    this.positionPanner.pan.setTargetAtTime(pan, now, 0.1);
    this.positionGain.gain.setTargetAtTime(gain, now, 0.1);
    
    // Apply position specific filter if custom limits aren't strictly set by user
    if (this.config.lowPass === 20000 && lowPassFreq < 20000) {
      this.lowPassFilter.frequency.setTargetAtTime(lowPassFreq, now, 0.1);
    }
    if (bassGainBoost > 0) {
      this.bassFilter.gain.setTargetAtTime(bassGainBoost, now, 0.1);
    }
  }

  private start8DRotation() {
    if (this.animationFrameId !== null) return;

    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const speed = this.config.rotationSpeed; // Hz (rotations per sec)
      this.rotationAngle += 2 * Math.PI * speed * dt;

      // Circular 8D panning curve (-1.0 to 1.0)
      const panVal = Math.sin(this.rotationAngle) * (this.config.spatialWidth / 100);
      this.pannerNode.pan.setValueAtTime(panVal, this.ctx.currentTime);

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stop8DRotation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy() {
    this.stop8DRotation();
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
    } catch (e) {}
  }
}
