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

// riser: noise and a rising saw that swell into the drop
save("riser", (() => { const L = 1.6, a = new Float32Array(Math.round(L * SR)); let y = 0, ph = 0; for (let i = 0; i < a.length; i++) { const t = i / SR, k = t / L; y += (0.02 + 0.5 * k * k) * (noise() - y); ph += (2 * Math.PI * (200 + 1800 * k * k)) / SR; a[i] = (y * 1.6 + saw(ph) * 0.25) * k * k; } return a; })());
// snare roll accelerating into the drop
save("snareroll", (() => { const L = 1.0, a = new Float32Array(Math.round(L * SR)); const hit = make(0.12, (t) => ({ v: (noise() * 0.8 + Math.sin(2 * Math.PI * 190 * t) * 0.5) * env(t, 0.001, 0.05) })); let t = 0, gap = 0.125; while (t < L) { const s0 = Math.round(t * SR), g = 0.3 + 0.7 * (t / L); for (let i = 0; i < hit.length && s0 + i < a.length; i++) a[s0 + i] += hit[i] * g; t += gap; gap = Math.max(0.03, gap * 0.82); } return a; })());
// impact: sub drop plus a noise crack, for slams
save("impact", drive(mix(osc(1.2, (t) => 40 + 160 * Math.exp(-t * 12), sin, (t) => env(t, 0.002, 0.4)), make(0.3, (t) => ({ v: noise() * env(t, 0.001, 0.06) * 0.9 }))), 2));
// ding: bright bell for each fee line
save("ding", mix(...[1, 2.01, 3.9].map((m, i) => osc(0.6, () => 1760 * m, sin, (t) => env(t, 0.001, 0.18 / (i + 1)) * 0.4 / (i + 1)))));

// backing beat, 150 bpm, 28 s: four-on-the-floor kick, clap on 2 and 4, 16th and open hats,
// sidechain-pumped saw bass and a chiptune square arp
const BPM = 150, beat = 60 / BPM, LEN = 28, track = new Float32Array(LEN * SR);
const add = (at, x, g = 1) => { const s = Math.round(at * SR); for (let i = 0; i < x.length && s + i < track.length; i++) track[s + i] += x[i] * g; };
const kick = drive(osc(0.35, (t) => 48 + 150 * Math.exp(-t * 35), sin, (t) => env(t, 0.001, 0.16)), 1.8);
const clap = make(0.22, (t) => ({ v: noise() * (env(t, 0.001, 0.01) + env(Math.max(0, t - 0.011), 0.001, 0.01) + env(Math.max(0, t - 0.022), 0.001, 0.08)) * 0.45 }));
const hp = (len, d) => { const a = new Float32Array(Math.round(len * SR)); let p = 0; for (let i = 0; i < a.length; i++) { const n = noise(); a[i] = (n - p) * env(i / SR, 0.0005, d) * 0.3; p = n; } return a; };
const hat = hp(0.04, 0.012), openHat = hp(0.25, 0.09);
// i - IV - vi - V in E minor-ish: root notes in Hz and arp chord tones
const prog = [[82.41, [329.6, 392.0, 493.9, 659.3]], [65.41, [261.6, 329.6, 392.0, 523.3]], [73.42, [293.7, 370.0, 440.0, 587.3]], [61.74, [246.9, 311.1, 370.0, 493.9]]];
for (let b = 0; b * beat < LEN; b++) {
  const t = b * beat, bar = Math.floor(b / 4), [root, chord] = prog[bar % 4];
  add(t, kick, 0.95);
  if (b % 2 === 1) add(t, clap, 0.55);
  add(t + beat / 2, openHat, 0.6);
  for (let q = 0; q < 4; q++) add(t + (q * beat) / 4, hat, q % 2 ? 0.5 : 0.8);
  // bass ducks under each kick, then swells back: the pumping feel
  add(t, osc(beat, () => root * 2, (p) => saw(p) * 0.7 + sin(p / 2) * 0.5, (tt) => Math.min(1, tt / (beat * 0.6)) ** 2 * 0.32));
  for (let q = 0; q < 4; q++) add(t + (q * beat) / 4, osc(beat / 4, () => chord[(b * 4 + q) % 4], sq, (tt) => env(tt, 0.002, 0.05) * 0.07));
}
save("beat", gain(drive(track, 1.2), 0.75));
console.log("sfx done");
