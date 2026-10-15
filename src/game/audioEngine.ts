/**
 * 8-Bit Retro Audio Engine using Web Audio API
 * Generates all chiptune SFX and background melodies dynamically.
 * Zero external audio files required!
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicEnabled: boolean = true;
  private musicInterval: number | null = null;
  private currentTheme: string = '';

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.musicInterval) {
      this.stopMusic();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
  }

  public toggleMusic(): boolean {
    this.setMusicEnabled(!this.musicEnabled);
    return this.musicEnabled;
  }

  public getIsMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  // Play custom tone
  private playTone(
    freq: number, 
    type: OscillatorType, 
    duration: number, 
    startGain: number = 0.2, 
    endGain: number = 0.001,
    detuneEnd?: number
  ) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (detuneEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + detuneEnd), this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(startGain, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(endGain, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy catch
    }
  }

  // Jump sound: quick ascending pitch sweep
  public jump(isSuper: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const baseFreq = isSuper ? 180 : 150;
    this.playTone(baseFreq, 'square', 0.15, 0.18, 0.01, 350);
  }

  // Coin sound: high two-tone ding (B5 -> E6)
  public coin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const playNote = (freq: number, delay: number, dur: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.2, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur);
    };

    playNote(987.77, 0, 0.08); // B5
    playNote(1318.51, 0.08, 0.28); // E6
  }

  // Stomp enemy: low punch sound
  public stomp() {
    if (this.isMuted) return;
    this.playTone(180, 'square', 0.1, 0.25, 0.01, -120);
  }

  // Kick shell: sharp punch
  public kick() {
    if (this.isMuted) return;
    this.playTone(260, 'square', 0.12, 0.25, 0.01, -160);
  }

  // Powerup appear (mushroom sprouting)
  public powerupAppear() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const notes = [330, 392, 440, 523, 587, 659];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.08, 0.2, 0.01);
      }, idx * 50);
    });
  }

  // Collect powerup (mushroom / flower)
  public powerupCollect() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const notes = [330, 392, 659, 523, 587, 784];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.1, 0.2, 0.01);
      }, idx * 60);
    });
  }

  // Mario hurt / shrink
  public pipeOrHurt() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const notes = [500, 420, 360, 300, 240, 180];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.07, 0.2, 0.01);
      }, idx * 50);
    });
  }

  // Bump head on block
  public bump() {
    if (this.isMuted) return;
    this.playTone(120, 'triangle', 0.09, 0.3, 0.01, 80);
  }

  // Break brick block
  public breakBrick() {
    if (this.isMuted) return;
    this.playTone(180, 'triangle', 0.15, 0.35, 0.01, -100);
  }

  // Fireball shot
  public fireball() {
    if (this.isMuted) return;
    this.playTone(550, 'sawtooth', 0.1, 0.2, 0.01, 400);
  }

  // Mario death sound
  public die() {
    if (this.isMuted) return;
    this.stopMusic();
    this.initCtx();
    if (!this.ctx) return;
    const notes = [500, 400, 350, 300, 250, 200, 150];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.12, 0.25, 0.01);
      }, idx * 90);
    });
  }

  // Level Clear Flagpole fanfare
  public stageClear() {
    if (this.isMuted) return;
    this.stopMusic();
    this.initCtx();
    if (!this.ctx) return;
    const melody = [
      { f: 392, d: 120 }, { f: 523, d: 120 }, { f: 659, d: 120 },
      { f: 784, d: 200 }, { f: 659, d: 120 }, { f: 784, d: 350 }
    ];
    let time = 0;
    melody.forEach((note) => {
      setTimeout(() => {
        this.playTone(note.f, 'triangle', note.d / 1000, 0.25, 0.01);
      }, time);
      time += note.d + 30;
    });
  }

  // Bowser roar / Bridge breaking
  public bowserFall() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.playTone(80 + Math.random() * 40, 'sawtooth', 0.18, 0.35, 0.01, -30);
      }, i * 70);
    }
  }

  // Princess Rescue Grand Victory Fanfare!
  public victoryFanfare() {
    if (this.isMuted) return;
    this.stopMusic();
    this.initCtx();
    if (!this.ctx) return;
    const fanfare = [
      { f: 523, d: 140 }, // C5
      { f: 659, d: 140 }, // E5
      { f: 784, d: 140 }, // G5
      { f: 1046, d: 300 }, // C6
      { f: 880, d: 140 },  // A5
      { f: 1046, d: 500 }, // C6
      { f: 1174, d: 300 }, // D6
      { f: 1318, d: 600 }  // E6
    ];
    let time = 0;
    fanfare.forEach((n) => {
      setTimeout(() => {
        this.playTone(n.f, 'square', n.d / 1000, 0.3, 0.01);
      }, time);
      time += n.d + 40;
    });
  }

  // Background Music loops
  public playTheme(theme: 'overworld' | 'underground' | 'castle' | 'victory') {
    if (this.currentTheme === theme && this.musicInterval) return;
    this.stopMusic();
    this.currentTheme = theme;
    if (!this.musicEnabled || this.isMuted) return;

    this.initCtx();
    if (!this.ctx) return;

    if (theme === 'overworld') {
      const notes = [330, 330, 0, 330, 0, 262, 330, 0, 392, 0, 0, 0, 196, 0, 0, 0];
      let step = 0;
      this.musicInterval = window.setInterval(() => {
        if (!this.musicEnabled || this.isMuted) return;
        const note = notes[step % notes.length];
        if (note > 0) {
          this.playTone(note, 'square', 0.08, 0.08, 0.001);
        }
        step++;
      }, 160);
    } else if (theme === 'underground') {
      const notes = [130, 260, 123, 246, 116, 233, 110, 220];
      let step = 0;
      this.musicInterval = window.setInterval(() => {
        if (!this.musicEnabled || this.isMuted) return;
        const note = notes[step % notes.length];
        this.playTone(note, 'triangle', 0.12, 0.1, 0.001);
        step++;
      }, 200);
    } else if (theme === 'castle') {
      const notes = [164, 155, 146, 138, 130, 123, 116, 110];
      let step = 0;
      this.musicInterval = window.setInterval(() => {
        if (!this.musicEnabled || this.isMuted) return;
        const note = notes[step % notes.length];
        this.playTone(note, 'sawtooth', 0.14, 0.07, 0.001);
        step++;
      }, 180);
    }
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.currentTheme = '';
  }
}

export const audio = new AudioEngine();
