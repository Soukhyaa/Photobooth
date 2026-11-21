// Web Audio API Synthesizer for Vintage Photo Booth
// Warm, soft, authentic acoustic & analog aesthetics — no harsh or metallic clangs.

let audioCtx = null;
let isMuted = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const soundEngine = {
  get isMuted() {
    return isMuted;
  },

  setMuted(muted) {
    isMuted = muted;
  },

  toggleMute() {
    isMuted = !isMuted;
    return isMuted;
  },

  // 1. Velvet Curtain (Gentle fabric sliding / rustling)
  playCurtain() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.5;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Warm pink-noise fabric texture
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      const pink = b0 + b1 + b2 + white * 0.1;
      const progress = i / bufferSize;
      const envelope = Math.sin(progress * Math.PI);
      data[i] = pink * 0.35 * envelope;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to warm fabric frequencies (360Hz - 240Hz sweep)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(360, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + duration);
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  },

  // 2. Soft, Warm Retro Electronic Countdown Beep
  playBeep(isFinal = false) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);

    osc.type = 'sine';
    const freq = isFinal ? 659.25 : 523.25; // E5 for flash, C5 for countdown (warm and musical)
    const duration = isFinal ? 0.22 : 0.12;

    osc.frequency.setValueAtTime(freq, now);

    // Soft attack to avoid transient clicks
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  },

  // 3. Authentic Vintage Camera Shutter & Subtle Flash
  playShutter() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First shutter leaf open (soft acoustic click)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter1 = ctx.createBiquadFilter();

    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(750, now);
    filter1.Q.value = 2.0;

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(240, now);
    osc1.frequency.exponentialRampToValueAtTime(80, now + 0.04);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.005);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.06);

    // Second shutter leaf close (subtle mechanical snap 45ms later)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    const filter2 = ctx.createBiquadFilter();

    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(900, now + 0.045);
    filter2.Q.value = 2.5;

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(280, now + 0.045);
    osc2.frequency.exponentialRampToValueAtTime(90, now + 0.09);

    gain2.gain.setValueAtTime(0.001, now + 0.045);
    gain2.gain.linearRampToValueAtTime(0.14, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.045);
    osc2.stop(now + 0.11);

    // Subtle, gentle flash capacitor whisper
    const oscFlash = ctx.createOscillator();
    const gainFlash = ctx.createGain();
    const filterFlash = ctx.createBiquadFilter();

    filterFlash.type = 'lowpass';
    filterFlash.frequency.setValueAtTime(1800, now + 0.08);

    oscFlash.type = 'sine';
    oscFlash.frequency.setValueAtTime(900, now + 0.08);
    oscFlash.frequency.exponentialRampToValueAtTime(2200, now + 0.35);

    gainFlash.gain.setValueAtTime(0.001, now + 0.08);
    gainFlash.gain.linearRampToValueAtTime(0.025, now + 0.12);
    gainFlash.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    oscFlash.connect(filterFlash);
    filterFlash.connect(gainFlash);
    gainFlash.connect(ctx.destination);

    oscFlash.start(now + 0.08);
    oscFlash.stop(now + 0.4);
  },

  // 4. Gentle Mechanical Printer Whirr
  playPrintingGear() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 2.2;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.6);
    osc.frequency.linearRampToValueAtTime(115, now + 1.8);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.15);
    gain.gain.setValueAtTime(0.07, now + duration - 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  },

  // 5. Soft Paper Drop
  playTrayDrop() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.25;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }
};
