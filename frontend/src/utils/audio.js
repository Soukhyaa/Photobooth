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

  // 3. Authentic Physical Camera Shutter Click
  // Two-phase mechanical focal-plane / leaf shutter actuation:
  // Phase 1 (0ms): Initial release blade snap + subtle chassis body thump
  // Phase 2 (45ms): Shutter curtain catch & mechanical latch click
  // Crisp, tactile, and completely mechanical — no electronic tones, sine beeps, or synthetic chirps.
  playShutter() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // --- PHASE 1: Initial Shutter Blade Release & Snap (t = 0ms) ---
    // High-frequency tactile mechanical snap (metal/resin leaf click)
    const snapDuration = 0.025;
    const snapBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * snapDuration), ctx.sampleRate);
    const snapData = snapBuffer.getChannelData(0);
    for (let i = 0; i < snapData.length; i++) {
      // High-density transient burst with exponential decay
      const env = Math.exp(-i / (ctx.sampleRate * 0.004));
      snapData[i] = (Math.random() * 2 - 1) * env;
    }
    const snapSource = ctx.createBufferSource();
    snapSource.buffer = snapBuffer;

    const snapFilter = ctx.createBiquadFilter();
    snapFilter.type = 'bandpass';
    snapFilter.frequency.setValueAtTime(3400, now);
    snapFilter.Q.value = 2.2;

    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.35, now);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + snapDuration);

    snapSource.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapSource.start(now);

    // Subtle chassis body resonance (low acoustic mechanical thump)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    const bodyFilter = ctx.createBiquadFilter();

    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(220, now);

    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(150, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(40, now + 0.035);

    bodyGain.gain.setValueAtTime(0.22, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    bodyOsc.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(ctx.destination);

    bodyOsc.start(now);
    bodyOsc.stop(now + 0.04);

    // --- PHASE 2: Shutter Blade Catch / Curtain Closure (t = 45ms) ---
    // The second tactile click of the mechanical focal plane curtain hitting the stop
    const catchTime = now + 0.045;
    const catchDuration = 0.03;
    const catchBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * catchDuration), ctx.sampleRate);
    const catchData = catchBuffer.getChannelData(0);
    for (let i = 0; i < catchData.length; i++) {
      const env = Math.exp(-i / (ctx.sampleRate * 0.005));
      catchData[i] = (Math.random() * 2 - 1) * env;
    }
    const catchSource = ctx.createBufferSource();
    catchSource.buffer = catchBuffer;

    const catchFilter = ctx.createBiquadFilter();
    catchFilter.type = 'bandpass';
    catchFilter.frequency.setValueAtTime(2600, catchTime);
    catchFilter.Q.value = 2.0;

    const catchGain = ctx.createGain();
    catchGain.gain.setValueAtTime(0.28, catchTime);
    catchGain.gain.exponentialRampToValueAtTime(0.0001, catchTime + catchDuration);

    catchSource.connect(catchFilter);
    catchFilter.connect(catchGain);
    catchGain.connect(ctx.destination);
    catchSource.start(catchTime);

    // Secondary subtle mechanical click transient (blade catch latch)
    const latchOsc = ctx.createOscillator();
    const latchGain = ctx.createGain();
    const latchFilter = ctx.createBiquadFilter();

    latchFilter.type = 'bandpass';
    latchFilter.frequency.setValueAtTime(1200, catchTime);
    latchFilter.Q.value = 3.0;

    latchOsc.type = 'triangle';
    latchOsc.frequency.setValueAtTime(320, catchTime);
    latchOsc.frequency.exponentialRampToValueAtTime(80, catchTime + 0.025);

    latchGain.gain.setValueAtTime(0.12, catchTime);
    latchGain.gain.exponentialRampToValueAtTime(0.0001, catchTime + 0.025);

    latchOsc.connect(latchFilter);
    latchFilter.connect(latchGain);
    latchGain.connect(ctx.destination);

    latchOsc.start(catchTime);
    latchOsc.stop(catchTime + 0.03);
  }
};
