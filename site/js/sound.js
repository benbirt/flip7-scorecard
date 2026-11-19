// Sound effects made with the Web Audio API, so there are no audio files.

let ctx = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Call from a tap, so that mobile browsers allow sound later on.
export function unlock() {
  audio();
}

function noiseBuffer(ac, seconds) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function noise(ac, { at = 0, duration, type = "bandpass", freq, q = 1, gain, attack = 0.002 }) {
  const t = ac.currentTime + at;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, duration);
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + duration);
}

function tone(ac, { at = 0, duration, from, to, gain, type = "sine" }) {
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration);
}

export function pop(at = 0) {
  const ac = audio();
  if (!ac) return;
  tone(ac, { at, duration: 0.12, from: 520, to: 90, gain: 0.7 });
  noise(ac, { at, duration: 0.08, freq: 1800, q: 0.8, gain: 0.6 });
}

export function fizz(at = 0, duration = 2.5) {
  const ac = audio();
  if (!ac) return;
  noise(ac, { at, duration, type: "highpass", freq: 5000, q: 0.5, gain: 0.12, attack: 0.05 });
}

export function boom(at = 0) {
  const ac = audio();
  if (!ac) return;
  noise(ac, { at, duration: 0.9, type: "lowpass", freq: 400, q: 0.7, gain: 0.6 });
  for (let i = 0; i < 6; i++) {
    noise(ac, { at: at + 0.25 + Math.random() * 0.5, duration: 0.04, freq: 3000 + Math.random() * 3000, q: 2, gain: 0.15 });
  }
}

export function fanfare(at = 0) {
  const ac = audio();
  if (!ac) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    tone(ac, { at: at + i * 0.13, duration: i === notes.length - 1 ? 0.8 : 0.2, from: f, to: f * 1.001, gain: 0.25, type: "triangle" });
  });
}

export function tick() {
  const ac = audio();
  if (!ac) return;
  tone(ac, { duration: 0.04, from: 1400, to: 900, gain: 0.08, type: "square" });
}
