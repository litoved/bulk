// Generates the voiceover lines with Kokoro, one WAV per line; each line picks its own voice and pace for emotion.
import { KokoroTTS } from "kokoro-js";
const HYPE = "af_heart", DEEP = "bm_george";
const lines = {
  l1: [HYPE, 1.25, "Wait... you're ordering takeaway ALONE?!"],
  l2: [HYPE, 1.3, "Twelve quid of food... and the fees make it SIXTEEN?! Nooo!"],
  l3: [HYPE, 1.3, "Thirty percent off! Oh... over twenty pounds. Of course."],
  l4: [DEEP, 1.15, "Tung tung tung tung tung... SAHUR!"],
  l4b: [HYPE, 1.2, "Okay. STOP. There's a better way!"],
  l5: [HYPE, 1.2, "Say hello to BULK!"],
  l6: [HYPE, 1.3, "Join a party nearby, unlock the deal, split ONE delivery!"],
  l7: [HYPE, 1.25, "Same burger... twenty three percent cheaper! Let's GO!"],
  l8: [HYPE, 1.2, "Order together. Try Bulk!"],
  bruh: [DEEP, 0.85, "Bruh."],
  damage: [DEEP, 1.0, "Emotional damage!"],
};
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
for (const [k, [voice, speed, text]] of Object.entries(lines)) {
  const audio = await tts.generate(text, { voice, speed });
  await audio.save(`public/vo/${k}.wav`);
  console.log(k, (audio.audio.length / audio.sampling_rate).toFixed(2));
}
