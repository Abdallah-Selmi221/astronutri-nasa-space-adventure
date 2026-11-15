// Web Audio API Synthesizer for instant, zero-latency space sound effects & ambient music

class SpaceSoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 85; // 0 to 100

  // Background Music State
  private bgmEnabled: boolean = true;
  private bgmVolume: number = 35; // 0 to 100
  private bgmGainNode: GainNode | null = null;
  private bgmInterval: number | null = null;
  private isBgmPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedEnabled = localStorage.getItem('astronutri_sound_enabled');
        if (savedEnabled !== null) {
          this.enabled = savedEnabled === 'true';
        }
        const savedVol = localStorage.getItem('astronutri_volume');
        if (savedVol !== null) {
          const parsed = Number(savedVol);
          if (!Number.isNaN(parsed)) {
            this.volume = Math.max(0, Math.min(100, parsed));
          }
        }
        const savedBgmEnabled = localStorage.getItem('astronutri_bgm_enabled');
        if (savedBgmEnabled !== null) {
          this.bgmEnabled = savedBgmEnabled === 'true';
        }
        const savedBgmVol = localStorage.getItem('astronutri_bgm_volume');
        if (savedBgmVol !== null) {
          const parsedBgm = Number(savedBgmVol);
          if (!Number.isNaN(parsedBgm)) {
            this.bgmVolume = Math.max(0, Math.min(100, parsedBgm));
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
    } catch {
      return null;
    }
    return this.ctx;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem('astronutri_sound_enabled', String(val));
    } catch {
      // ignore
    }
  }

  public isEnabled(): boolean {
    return this.enabled && this.volume > 0;
  }

  public setVolume(percent: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    this.volume = clamped;
    try {
      localStorage.setItem('astronutri_volume', String(clamped));
    } catch {
      // ignore
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  // --- Background Music (BGM) Controls ---
  public setBgmEnabled(val: boolean) {
    this.bgmEnabled = val;
    try {
      localStorage.setItem('astronutri_bgm_enabled', String(val));
    } catch {
      // ignore
    }
    if (!val) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled && this.bgmVolume > 0;
  }

  public setBgmVolume(percent: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    this.bgmVolume = clamped;
    try {
      localStorage.setItem('astronutri_bgm_volume', String(clamped));
    } catch {
      // ignore
    }
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(this.scaleBgmGain(0.08), this.ctx.currentTime);
    }
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public duckBGM(ducked: boolean) {
    if (this.bgmGainNode && this.ctx) {
      const target = this.scaleBgmGain(ducked ? 0.022 : 0.08);
      this.bgmGainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    }
  }

  private scaleGain(baseGain: number): number {
    if (!this.enabled || this.volume <= 0) return 0.0001;
    return Math.max(0.001, baseGain * (this.volume / 100));
  }

  private scaleBgmGain(baseGain: number): number {
    if (!this.bgmEnabled || this.bgmVolume <= 0) return 0.0001;
    return Math.max(0.001, baseGain * (this.bgmVolume / 100));
  }

  // Start gentle, magical ambient space chords
  public startBGM() {
    if (!this.isBgmEnabled() || this.isBgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.isBgmPlaying = true;
    this.bgmGainNode = ctx.createGain();
    this.bgmGainNode.gain.setValueAtTime(this.scaleBgmGain(0.08), ctx.currentTime);
    this.bgmGainNode.connect(ctx.destination);

    // Warm, dreamlike pentatonic arpeggio sequence for space exploration
    const chordNotes = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 392.00]  // G
    ];

    let chordIdx = 0;
    const playNextBar = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGainNode) return;
      const barTime = this.ctx.currentTime;
      const chord = chordNotes[chordIdx % chordNotes.length];
      chordIdx++;

      chord.forEach((freq, noteIdx) => {
        if (!this.ctx || !this.bgmGainNode) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, barTime + noteIdx * 0.45);

        noteGain.gain.setValueAtTime(0.001, barTime + noteIdx * 0.45);
        noteGain.gain.linearRampToValueAtTime(0.3, barTime + noteIdx * 0.45 + 0.15);
        noteGain.gain.exponentialRampToValueAtTime(0.001, barTime + noteIdx * 0.45 + 1.2);

        osc.connect(noteGain);
        noteGain.connect(this.bgmGainNode);

        osc.start(barTime + noteIdx * 0.45);
        osc.stop(barTime + noteIdx * 0.45 + 1.25);
      });
    };

    playNextBar();
    this.bgmInterval = window.setInterval(playNextBar, 2200);
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      window.clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.bgmGainNode = null;
    }
  }

  // UI button click
  public playClick() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(this.scaleGain(0.15), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  // Food loaded into cargo box
  public playDropSuccess() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.setValueAtTime(440, now + 0.06);
    osc.frequency.setValueAtTime(660, now + 0.12);

    gain.gain.setValueAtTime(this.scaleGain(0.2), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Crystal sparkle chime
  public playCrystalSparkle() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [880, 1174.66, 1318.51, 1760].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(this.scaleGain(0.15), now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.36);
    });
  }

  // Mushroom bouncy pop
  public playBoing() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);

    gain.gain.setValueAtTime(this.scaleGain(0.25), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.27);
  }

  // Banned item / Crumbs Alert siren / 1-Hour EVA Alert
  public playAlertSiren() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.linearRampToValueAtTime(350, now + 0.15);
    osc.frequency.linearRampToValueAtTime(800, now + 0.3);
    osc.frequency.linearRampToValueAtTime(300, now + 0.45);

    gain.gain.setValueAtTime(this.scaleGain(0.3), now);
    gain.gain.linearRampToValueAtTime(this.scaleGain(0.25), now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  // Caution warning chime (2 Hours EVA warning)
  public playCautionBeep() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.setValueAtTime(440, now + 0.12);

    gain.gain.setValueAtTime(this.scaleGain(0.22), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.29);
  }

  // Spacesuit airlock pressurization / O2 hiss
  public playPressurizeHiss() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.scaleGain(0.01), now);
    gain.gain.linearRampToValueAtTime(this.scaleGain(0.2), now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.35);
  }

  // Visor latch / Mechanical lock
  public playLockerSnap() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.setValueAtTime(260, now + 0.04);

    gain.gain.setValueAtTime(this.scaleGain(0.25), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Tactile O2 Scrubber Pump Sound
  public playScrubberPump() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.22);

    gain.gain.setValueAtTime(this.scaleGain(0.3), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  // Fuel Flow Pulse
  public playFuelCharge() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220 + Math.random() * 80, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.08);

    gain.gain.setValueAtTime(this.scaleGain(0.08), now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // ECLSS Water Recovery & Filtration Bubble Sound
  public playWaterRecycle() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [400, 520, 680, 840, 1020].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + idx * 0.06 + 0.08);

      gain.gain.setValueAtTime(this.scaleGain(0.18), now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.1);
    });
  }

  // Saline Medical Injector Chime (Orthostatic Intolerance Treatment)
  public playSalineInject() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);
    osc.frequency.setValueAtTime(1046.5, now + 0.16);

    gain.gain.setValueAtTime(this.scaleGain(0.2), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Quick-Time Event Juice Spill Sound (Fail)
  public playJuiceSpill() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.25);

    gain.gain.setValueAtTime(this.scaleGain(0.25), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.31);
  }

  // Rocket Blast Off Roar
  public playBlastOff(duration = 4.0) {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.linearRampToValueAtTime(480, now + 1.2);
    filter.frequency.exponentialRampToValueAtTime(180, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.scaleGain(0.05), now);
    gain.gain.linearRampToValueAtTime(this.scaleGain(0.45), now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // Radiation Shield Energize Sound
  public playShieldEnergize() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);

    gain.gain.setValueAtTime(this.scaleGain(0.2), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.51);
  }

  // Quick-Time Event Juice Sip Sound (Success)
  public playJuiceSip() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    osc.frequency.setValueAtTime(950, now + 0.2);

    gain.gain.setValueAtTime(this.scaleGain(0.2), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Celebratory Fanfare
  public playPneumatic() {
    this.playPressurizeHiss();
  }

  public playCollect() {
    this.playDropSuccess();
  }

  public playFanfare() {
    if (!this.isEnabled()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(this.scaleGain(0.12), now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.36);
    });
  }
}

export const soundManager = new SpaceSoundManager();
