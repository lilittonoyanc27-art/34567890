// Synthesized Web Audio sound effects with zero external dependencies

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    delay = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const startTime = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    } catch {
      // ignore audio errors
    }
  }

  public playStart() {
    this.playTone(523.25, 0.1, 'triangle', 0.14, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.16, 0.08);
    this.playTone(783.99, 0.18, 'triangle', 0.18, 0.16);
  }

  public playBuzzRazmik() {
    this.playTone(440, 0.12, 'sine', 0.16, 0);
    this.playTone(587.33, 0.16, 'sine', 0.16, 0.07);
  }

  public playBuzzGayane() {
    this.playTone(523.25, 0.12, 'sine', 0.16, 0);
    this.playTone(698.46, 0.16, 'sine', 0.16, 0.07);
  }

  public playTick() {
    this.playTone(880, 0.05, 'sine', 0.08, 0);
  }

  public playTimeUp() {
    this.playTone(392, 0.16, 'sawtooth', 0.12, 0);
    this.playTone(349.23, 0.16, 'sawtooth', 0.12, 0.18);
    this.playTone(261.63, 0.35, 'sawtooth', 0.14, 0.36);
  }

  public playCorrect() {
    this.playTone(523.25, 0.12, 'triangle', 0.16, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.16, 0.09);
    this.playTone(1046.5, 0.24, 'triangle', 0.18, 0.18);
  }

  public playIncorrect() {
    this.playTone(260, 0.16, 'sawtooth', 0.1, 0);
    this.playTone(200, 0.22, 'sawtooth', 0.1, 0.14);
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.11, 0.22, 0.33, 0.48, 0.6];
    const durs = [0.11, 0.11, 0.11, 0.16, 0.11, 0.42];
    notes.forEach((n, idx) => {
      this.playTone(n, durs[idx], 'triangle', 0.17, times[idx]);
    });
  }

  public playClick() {
    this.playTone(640, 0.045, 'sine', 0.06, 0);
  }
}

export const soundFX = new SoundEngine();
