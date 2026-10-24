// Generates the voiceover lines with Kokoro, one WAV per line.
import { KokoroTTS } from "kokoro-js";
const lines = {
  l1: "Ordering takeaway alone? Big mistake.",
  l2: "A twelve pound meal? Fees make it almost sixteen.",
  l3: "That thirty percent off deal? Not for one basket.",
  l4: "Tung tung tung tung tung... okay, stop. There's a better way.",
  l5: "Bulk. Join a party of students nearby.",
  l6: "Unlock the deal. Split one delivery.",
  l7: "Same burger. Twenty three percent cheaper.",
  l8: "Order together. Try Bulk.",
};
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
for (const [k, t] of Object.entries(lines)) {
  const audio = await tts.generate(t, { voice: "bf_emma", speed: 1.12 });
  await audio.save(`public/vo/${k}.wav`);
  console.log(k, (audio.audio.length / audio.sampling_rate).toFixed(2));
}
