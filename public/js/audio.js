// Pure Web Audio API calm meditation soundscape & chime engine (zero external audio dependencies)

class ZenAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.activeNodes = [];
    this.activeTimers = [];
    this.currentMode = "bowls";
    this.volume = 0.55;
    this.isPlaying = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.15);
    }
  }

  // Warm Tibetan singing bowl strike
  playBell(freq = 216, duration = 6.5, gainLevel = 0.34) {
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const harmonics = [1, 2.756, 5.404];
      const amps = [1.0, 0.36, 0.14];

      harmonics.forEach((ratio, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq * ratio, now);
        // Subtle meditative warmth vibrato
        osc.frequency.exponentialRampToValueAtTime(freq * ratio * 0.998, now + duration);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(gainLevel * amps[idx], now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / (idx + 1));

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + duration + 0.1);
      });
    } catch {
      // Audio context blocked before interaction
    }
  }

  // Gentle 3-note meditation alarm chime
  playAlarmChime() {
    const notes = [392.0, 493.88, 587.33]; // G4, B4, D5
    notes.forEach((n, i) => {
      setTimeout(() => this.playBell(n, 3.8, 0.28), i * 420);
    });
  }

  createNoiseBuffer(ctx, type = "pink") {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === "pink") {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
        b6 = white * 0.115926;
      } else {
        b0 = (b0 + 0.02 * white) / 1.02;
        data[i] = b0 * 2.6;
      }
    }
    return buffer;
  }

  startSoundscape(mode = "bowls", volume = this.volume) {
    this.stopSoundscape();
    this.currentMode = mode;
    this.volume = volume;
    this.isPlaying = true;

    const ctx = this.ensureContext();
    this.setVolume(volume);

    if (mode === "silence") {
      return;
    }

    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.001, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 1.8);
    bus.connect(this.masterGain);
    this.activeNodes.push(bus);

    if (mode === "bowls") {
      // Soft harmonic drone + periodic singing bowl strikes
      const droneFreqs = [136.1, 204.15]; // Om frequency + fifth
      droneFreqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        g.gain.value = idx === 0 ? 0.12 : 0.055;
        osc.connect(g);
        g.connect(bus);
        osc.start();
        this.activeNodes.push(osc, g);
      });

      const bowlScale = [216, 256, 288, 324, 384];
      const triggerBowl = () => {
        if (!this.isPlaying || this.currentMode !== "bowls") return;
        const note = bowlScale[Math.floor(Math.random() * bowlScale.length)];
        this.playBell(note, 7.5, 0.22);
      };
      triggerBowl();
      const id = setInterval(triggerBowl, 8500);
      this.activeTimers.push(id);
    } else if (mode === "ambient") {
      // Warm meditative pad (Fmaj7 chord with slow breathing filter)
      const freqs = [174.61, 220.0, 261.63, 329.63];
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 620;
      filter.connect(bus);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.08;
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.activeNodes.push(filter, lfo, lfoGain);

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.value = f;
        osc.detune.value = (idx - 1.5) * 4;
        g.gain.value = 0.07;
        osc.connect(g);
        g.connect(filter);
        osc.start();
        this.activeNodes.push(osc, g);
      });
    } else if (mode === "rain") {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, "pink");
      src.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 1450;

      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 260;

      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.52;

      src.connect(lowpass);
      lowpass.connect(highpass);
      highpass.connect(rainGain);
      rainGain.connect(bus);
      src.start();
      this.activeNodes.push(src, lowpass, highpass, rainGain);
    } else if (mode === "ocean") {
      const src = ctx.createBufferSource();
      src.buffer = this.createNoiseBuffer(ctx, "brown");
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 480;

      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.34;

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.11; // ~9s ocean swell
      lfoGain.gain.value = 0.22;
      lfo.connect(lfoGain);
      lfoGain.connect(waveGain.gain);

      const filterLfo = ctx.createOscillator();
      const filterLfoGain = ctx.createGain();
      filterLfo.frequency.value = 0.11;
      filterLfoGain.gain.value = 260;
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filter.frequency);

      src.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(bus);

      src.start();
      lfo.start();
      filterLfo.start();
      this.activeNodes.push(src, filter, waveGain, lfo, lfoGain, filterLfo, filterLfoGain);
    }
  }

  stopSoundscape() {
    this.isPlaying = false;
    this.activeTimers.forEach((id) => clearInterval(id));
    this.activeTimers = [];
    this.activeNodes.forEach((node) => {
      try {
        if (typeof node.stop === "function") node.stop();
        if (typeof node.disconnect === "function") node.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.activeNodes = [];
  }

  preview(mode) {
    this.startSoundscape(mode, this.volume);
    if (mode === "silence") {
      this.playBell(256, 4.0, 0.3);
      return;
    }
    const previewTimer = setTimeout(() => {
      if (this.isPlaying) this.stopSoundscape();
    }, 3600);
    this.activeTimers.push(previewTimer);
  }
}

export const zenAudio = new ZenAudioEngine();
