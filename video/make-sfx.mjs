// Synthesises the reel's sound effects and backing beat as 44.1 kHz mono WAVs.
import fs from "node:fs";

const SR = 44100;
const save = (name, data) => {
  const n = data.length, buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32000), 44 + i * 2);
  fs.writeFileSync(`public/sfx/${name}.wav`, buf);
};
const make = (sec, fn) => { const a = new Float32Array(Math.round(sec * SR)); let ph = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; const r = fn(t, ph); a[i] = r.v; ph = r.ph ?? ph; } return a; };
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const noise = () => Math.random() * 2 - 1;
// phase-accumulating oscillator so pitch sweeps stay smooth
const osc = (sec, freqAt, shape, amp) => { const a = new Float32Array(Math.round(sec * SR)); let ph = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; ph += (2 * Math.PI * freqAt(t)) / SR; a[i] = shape(ph) * amp(t); } return a; };
const sin = Math.sin, saw = (p) => ((p / Math.PI) % 2) - 1, sq = (p) => (Math.sin(p) > 0 ? 1 : -1);
const mix = (...xs) => { const n = Math.max(...xs.map((x) => x.length)), o = new Float32Array(n); for (const x of xs) for (let i = 0; i < x.length; i++) o[i] += x[i]; return o; };
const gain = (x, g) => x.map((v) => v * g);
const drive = (x, k) => x.map((v) => Math.tanh(v * k));

// vine-boom style hit: deep sine drop, saturated
save("boom", drive(osc(1.4, (t) => 55 + 90 * Math.exp(-t * 18), sin, (t) => env(t, 0.004, 0.45)), 2.2));
// cartoon boing: sine with wobbling vibrato rising
save("boing", osc(0.7, (t) => 180 + 260 * t + 40 * Math.sin(2 * Math.PI * 14 * t), sin, (t) => env(t, 0.005, 0.25) * 0.9));
// pop
save("pop", osc(0.12, (t) => 900 - 5000 * t, sin, (t) => env(t, 0.002, 0.03)));
// whoosh: noise with a sweeping lowpass
save("whoosh", (() => { const a = new Float32Array(Math.round(0.55 * SR)); let y = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; const c = 0.02 + 0.25 * Math.sin(Math.PI * t / 0.55); y += c * (noise() - y); a[i] = y * 2.4 * Math.sin(Math.PI * t / 0.55); } return a; })());
// cash register ka-ching: click plus bell partials
save("kaching", mix(make(0.05, (t) => ({ v: noise() * env(t, 0.001, 0.01) * 0.8 })), ...[1, 2.76, 5.4, 8.93].map((m, i) => { const pad = new Float32Array(Math.round(0.08 * SR)); return Float32Array.from([...pad, ...osc(1.1, () => 1318 * m, sin, (t) => env(t, 0.002, 0.35 / (i + 1)) * 0.35 / (i + 1))]); })));
// wrong-answer buzzer
save("buzzer", gain(mix(osc(0.7, () => 110, sq, (t) => (t < 0.65 ? 0.35 : 0)), osc(0.7, () => 116, sq, (t) => (t < 0.65 ? 0.35 : 0))), 0.8));
// record scratch: noisy pitch swoop back and forth
save("scratch", (() => { const a = new Float32Array(Math.round(0.45 * SR)); let ph = 0, y = 0; for (let i = 0; i < a.length; i++) { const t = i / SR; const f = 300 + 900 * Math.abs(Math.sin(2 * Math.PI * 4.5 * t)); ph += (2 * Math.PI * f) / SR; y += 0.3 * (noise() - y); a[i] = (saw(ph) * 0.5 + y * 0.7) * env(t, 0.005, 0.2); } return a; })());
// bonk: hollow wooden hit for the tung-tung beats
save("tung", mix(osc(0.35, (t) => 210 * (1 - 0.3 * t), sin, (t) => env(t, 0.001, 0.07)), osc(0.35, () => 530, sin, (t) => env(t, 0.001, 0.03) * 0.5), make(0.02, (t) => ({ v: noise() * env(t, 0.0005, 0.004) * 0.6 }))));
// air horn: stacked detuned saws
save("airhorn", drive(mix(...[466, 470, 587, 591, 698].map((f) => osc(1.2, (t) => f * (t < 0.05 ? 0.94 + t : 1), saw, (t) => (t < 1.05 ? Math.min(1, t * 40) : Math.max(0, 1 - (t - 1.05) * 7)) * 0.16))), 1.6));
// slide whistle up
save("slide", osc(0.6, (t) => 500 * Math.pow(2.6, t / 0.6), sin, (t) => Math.min(1, t * 20) * Math.max(0, 1 - Math.max(0, t - 0.5) * 10) * 0.6));

// backing beat, 128 bpm, 32 s: kick, clap, hats, bass
const BPM = 128, beat = 60 / BPM, LEN = 32, track = new Float32Array(LEN * SR);
const add = (at, x, g = 1) => { const s = Math.round(at * SR); for (let i = 0; i < x.length && s + i < track.length; i++) track[s + i] += x[i] * g; };
const kick = osc(0.4, (t) => 50 + 120 * Math.exp(-t * 30), sin, (t) => env(t, 0.002, 0.18));
const clap = make(0.2, (t) => ({ v: noise() * (env(t, 0.001, 0.012) + env(Math.max(0, t - 0.012), 0.001, 0.07)) * 0.5 }));
const hat = (() => { const a = new Float32Array(Math.round(0.05 * SR)); let p = 0; for (let i = 0; i < a.length; i++) { const n = noise(); a[i] = (n - p) * env(i / SR, 0.0005, 0.015) * 0.35; p = n; } return a; })();
const bassNotes = [43.65, 43.65, 51.91, 38.89];
for (let b = 0; b * beat < LEN; b++) {
  const t = b * beat, bar = Math.floor(b / 4);
  add(t, kick, 0.9);
  if (b % 2 === 1) add(t, clap, 0.6);
  add(t + beat / 2, hat, 0.8); add(t, hat, 0.4);
  const f = bassNotes[bar % 4] * 2;
  add(t + beat / 2, osc(beat / 2, () => f, (p) => saw(p) * 0.6 + sin(p) * 0.4, (tt) => env(tt, 0.005, 0.12) * 0.35));
}
save("beat", gain(drive(track, 1.1), 0.7));
console.log("sfx done");
