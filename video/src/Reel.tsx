import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadText } from "@remotion/google-fonts/Figtree";

const { fontFamily: DISPLAY } = loadDisplay();
const { fontFamily: TEXT } = loadText();

const C = { paper: "#f7f8f1", ink: "#1b1d14", lime: "#b7cd32", limeInk: "#4a5706", offer: "#c93a22", night: "#1f2318" };
const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
export const REEL_FRAMES = s(30);

// Scene boundaries in seconds; the voiceover line for each scene starts just after its boundary.
const T = { hook: 0, fees: 3.3, deal: 7.3, meme: 11.2, reveal: 15.4, flow: 18.6, save: 21.6, cta: 25.1 };

const useSpring = (at: number, damping = 11, mass = 0.6) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - s(at), fps, config: { damping, mass } });
};

// Screen shake that decays over ~10 frames after each impact time.
const useShake = (hits: number[], power = 26) => {
  const f = useCurrentFrame();
  let x = 0, y = 0, r = 0;
  for (const h of hits) {
    const d = f - s(h);
    if (d >= 0 && d < 12) {
      const k = power * (1 - d / 12);
      x += Math.sin(d * 2.7) * k; y += Math.cos(d * 3.1) * k * 0.7; r += Math.sin(d * 1.9) * k * 0.05;
    }
  }
  return `translate(${x}px, ${y}px) rotate(${r}deg)`;
};

const Pop = ({ at, children, style, from = 0, tilt = 0 }: { at: number; children: ReactNode; style?: CSSProperties; from?: number; tilt?: number }) => {
  const p = useSpring(at);
  const f = useCurrentFrame();
  if (f < s(at)) return null;
  const wobble = Math.sin((f - s(at)) / 6) * 2;
  return <div style={{ position: "absolute", transform: `scale(${from + (1 - from) * p}) rotate(${tilt * p + wobble}deg)`, ...style }}>{children}</div>;
};

const Sticker = ({ name, at, x, y, w, tilt = -6 }: { name: string; at: number; x: number; y: number; w: number; tilt?: number }) => (
  <Pop at={at} tilt={tilt} style={{ left: x, top: y, width: w, filter: "drop-shadow(0 18px 24px rgba(27,29,20,0.35))" }}>
    <Img src={staticFile(`stickers/${name}.png`)} style={{ width: "100%" }} />
  </Pop>
);

// A headline whose words slam in one after another; words wrapped in * get the lime highlighter.
const Slam = ({ text, at, top, size = 128, color = C.ink, gap = 0.12, align = "center" }: { text: string; at: number; top: number; size?: number; color?: string; gap?: number; align?: "center" | "left" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div style={{ position: "absolute", top, left: 70, right: 70, display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start", columnGap: size * 0.28, rowGap: 0, fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.03, color }}>
      {words.map((w, i) => {
        const start = s(at) + Math.round(i * gap * fps);
        const p = spring({ frame: f - start, fps, config: { damping: 9, mass: 0.5 } });
        const hl = w.startsWith("*");
        const word = w.replace(/\*/g, "");
        const wipe = interpolate(f - start - 4, [0, 8], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", opacity: f < start ? 0 : 1, transform: `scale(${0.3 + 0.7 * p}) translateY(${(1 - p) * 60}px)` }}>
            {hl && <span style={{ position: "absolute", left: -8, right: -8, top: "48%", height: "46%", background: C.lime, borderRadius: 10, clipPath: `inset(0 ${100 - wipe}% 0 0)`, zIndex: -1 }} />}
            <span style={{ position: "relative" }}>{word}</span>
          </span>
        );
      })}
    </div>
  );
};

const Pill = ({ at, text, x, y, bg = C.ink, fg = C.lime, size = 44, tilt = -4 }: { at: number; text: string; x: number; y: number; bg?: string; fg?: string; size?: number; tilt?: number }) => (
  <Pop at={at} tilt={tilt} style={{ left: x, top: y }}>
    <div style={{ background: bg, color: fg, fontFamily: TEXT, fontWeight: 800, fontSize: size, padding: `${size * 0.35}px ${size * 0.7}px`, borderRadius: 999, whiteSpace: "nowrap", boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}>{text}</div>
  </Pop>
);

const Phone = ({ src, at, x, y, h = 1180, from = 1200, tilt = 0 }: { src: string; at: number; x: number; y: number; h?: number; from?: number; tilt?: number }) => {
  const p = useSpring(at, 14, 0.8);
  const f = useCurrentFrame();
  if (f < s(at)) return null;
  const float = Math.sin((f - s(at)) / 14) * 10;
  return <Img src={staticFile(`screens/${src}.png`)} style={{ position: "absolute", left: x, top: y + (1 - p) * from + float, height: h, transform: `rotate(${tilt * p}deg)`, filter: "drop-shadow(0 40px 60px rgba(40,52,0,0.45))" }} />;
};

// Emoji that drift upward and fade, like reactions on a live stream.
const Floaters = ({ from, to, emojis, seed = 1 }: { from: number; to: number; emojis: string[]; seed?: number }) => {
  const f = useCurrentFrame();
  const items = Array.from({ length: 14 }, (_, i) => {
    const r = (n: number) => { const v = Math.sin((i + 1) * 9301 * seed + n * 49297) * 233280; return v - Math.floor(v); };
    const start = s(from) + Math.floor(r(1) * (s(to) - s(from) - 30));
    const d = f - start;
    if (d < 0 || d > 60) return null;
    return <div key={i} style={{ position: "absolute", left: 60 + r(2) * 900, top: 1650 - d * (14 + r(3) * 10), fontSize: 70 + r(4) * 50, opacity: interpolate(d, [0, 8, 45, 60], [0, 1, 1, 0]), transform: `rotate(${(r(5) - 0.5) * 40 + Math.sin(d / 5) * 10}deg)` }}>{emojis[i % emojis.length]}</div>;
  });
  return <>{items}</>;
};

const Bg = ({ color }: { color: string }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: color, overflow: "hidden" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", background: "rgba(183,205,50,0.22)", left: -300 + i * 500 + Math.sin(f / 40 + i) * 80, top: 200 + i * 600 + Math.cos(f / 50 + i) * 90 }} />
      ))}
    </AbsoluteFill>
  );
};

const Marquee = () => {
  const f = useCurrentFrame();
  const text = "ORDER TOGETHER ✦ UNLOCK THE DEAL ✦ SHARE ONE DELIVERY ✦ ";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 96, background: C.ink, overflow: "hidden", display: "flex", alignItems: "center" }}>
      <div style={{ whiteSpace: "nowrap", fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, color: C.lime, transform: `translateX(${-(f * 7) % 1700}px)` }}>{text.repeat(4)}</div>
    </div>
  );
};

const Progress = () => {
  const f = useCurrentFrame();
  return <div style={{ position: "absolute", top: 40, left: 40, right: 40, height: 10, borderRadius: 10, background: "rgba(27,29,20,0.15)" }}><div style={{ width: `${(f / REEL_FRAMES) * 100}%`, height: "100%", borderRadius: 10, background: C.ink }} /></div>;
};

const Scene = ({ from, to, children }: { from: number; to: number; children: ReactNode }) => (
  <Sequence from={s(from)} durationInFrames={s(to) - s(from)} layout="none">{children}</Sequence>
);

// Children of a Scene see frames relative to the scene start, so times inside are local seconds.
const Hook = () => (
  <AbsoluteFill style={{ transform: useShake([0.1]) }}>
    <Bg color={C.paper} />
    <Floaters from={0.8} to={3.3} emojis={["😭", "💸", "🥲"]} />
    <Pill at={0.05} text="POV: it's 11pm in halls" x={170} y={170} size={48} tilt={-3} />
    <Slam text="Ordering takeaway *alone?*" at={0.3} top={340} size={150} />
    <Sticker name="dream-desert" at={0.6} x={140} y={860} w={800} tilt={4} />
    <Pill at={1.6} text="💀 big mistake" x={600} y={1560} bg={C.offer} fg="#fff" size={52} tilt={8} />
  </AbsoluteFill>
);

const Fees = () => {
  const f = useCurrentFrame();
  const total = interpolate(f, [s(2.2), s(2.8)], [12, 15.93], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const row = (label: string, value: string, at: number, red = false) => (
    <Pop at={at} from={0.4} style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: 760, fontFamily: TEXT, fontWeight: 700, fontSize: 52, color: red ? C.offer : C.ink, padding: "14px 0" }}><span>{label}</span><span>{value}</span></div>
    </Pop>
  );
  return (
    <AbsoluteFill style={{ transform: useShake([2.6], 34) }}>
      <Bg color={C.paper} />
      <Floaters from={2.6} to={4} emojis={["💸", "🫠", "💀"]} seed={2} />
      <Slam text="The *fees* though" at={0} top={200} size={140} />
      <div style={{ position: "absolute", left: 120, top: 560, width: 840, padding: "40px 40px 30px", background: "#fff", borderRadius: 36, boxShadow: "0 30px 60px rgba(27,29,20,0.18)", transform: "rotate(-2deg)" }}>
        <div style={{ fontFamily: TEXT, fontWeight: 800, fontSize: 32, letterSpacing: 4, color: "#5d6150", marginBottom: 10 }}>YOUR RECEIPT 🧾</div>
        {row("Burger + fries", "£12.00", 0.3)}
        {row("Service fee", "+£1.44", 0.9, true)}
        {row("Delivery", "+£2.49", 1.5, true)}
        <div style={{ borderTop: "4px dashed #dde1cf", marginTop: 16, paddingTop: 18, display: "flex", justifyContent: "space-between", fontFamily: DISPLAY, fontWeight: 800, fontSize: 110, color: C.ink }}>
          <span style={{ fontSize: 56, alignSelf: "center" }}>Total</span><span>£{total.toFixed(2)}</span>
        </div>
      </div>
      <Pill at={2.6} text="+33% 😵" x={620} y={1170} bg={C.offer} fg="#fff" size={70} tilt={10} />
      <Sticker name="desk-sad2" at={1.2} x={80} y={1280} w={560} tilt={-8} />
    </AbsoluteFill>
  );
};

const Deal = () => {
  const f = useCurrentFrame();
  const fill = interpolate(f, [s(0.6), s(1.6)], [0, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ transform: useShake([2.0], 30) }}>
      <Bg color={C.lime} />
      <Slam text="30% OFF over £20" at={0} top={220} size={130} />
      <div style={{ position: "absolute", left: 110, top: 560, width: 860 }}>
        <div style={{ fontFamily: TEXT, fontWeight: 800, fontSize: 44, color: C.ink, marginBottom: 18 }}>Your basket: £12</div>
        <div style={{ height: 90, borderRadius: 45, background: "rgba(27,29,20,0.15)", overflow: "hidden", position: "relative" }}>
          <div style={{ width: `${fill}%`, height: "100%", background: C.ink, borderRadius: 45 }} />
          <div style={{ position: "absolute", left: "100%", top: 0 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: TEXT, fontWeight: 700, fontSize: 36, color: C.ink, marginTop: 12 }}><span>£0</span><span>£20 🔒</span></div>
      </div>
      <Pop at={2.0} from={2.5} tilt={-12} style={{ left: 300, top: 840 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 150, color: "#fff", background: C.offer, padding: "10px 50px", borderRadius: 30, border: "10px solid #fff" }}>NOPE ❌</div>
      </Pop>
      <Sticker name="worried" at={0.8} x={500} y={1120} w={520} tilt={6} />
      <Pop at={2.6} tilt={-3} style={{ left: 70, top: 1300 }}>
        <div style={{ width: 460, background: C.paper, borderRadius: 30, padding: 30, fontFamily: TEXT, fontWeight: 700, fontSize: 38, color: C.ink, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}><div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, lineHeight: 1 }}>63%</div>of students skip meals to save money</div>
      </Pop>
    </AbsoluteFill>
  );
};

// The tung-tung-tung parody: each knock slams a word and jolts the croc, then a record scratch stops it.
const KNOCKS = [0.15, 0.55, 0.95, 1.35, 1.75];
const Meme = () => {
  const f = useCurrentFrame();
  const stopped = f >= s(2.25);
  const jolt = KNOCKS.reduce((a, k) => { const d = f - s(k); return d >= 0 && d < 8 ? a + (8 - d) * 3 : a; }, 0);
  const flash = KNOCKS.some((k) => { const d = f - s(k); return d >= 0 && d < 3; });
  const shake = useShake(KNOCKS, 40);
  return (
    <AbsoluteFill style={{ transform: stopped ? "none" : shake }}>
      <AbsoluteFill style={{ background: stopped ? C.paper : flash ? "#3a3f2c" : C.night }} />
      {!stopped && KNOCKS.map((k, i) => (
        <Pop key={i} at={k} from={3} tilt={(i % 2 ? 1 : -1) * 8} style={{ left: [60, 400, 110, 380, 70][i], top: 150 + i * 165 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 140, color: C.lime, WebkitTextStroke: "4px #000", textShadow: "8px 8px 0 #000" }}>TUNG</div>
        </Pop>
      ))}
      {!stopped && (
        <div style={{ position: "absolute", left: 240, top: 1000, width: 600, transform: `translateY(${-jolt}px) scale(${1 + jolt / 200}) rotate(${Math.sin(f / 2) * 6}deg)` }}>
          <Img src={staticFile("stickers/helmet-sad.png")} style={{ width: "100%" }} />
        </div>
      )}
      {stopped && (
        <>
          <Pop at={2.25} from={2} style={{ left: 0, right: 0, top: 380, display: "flex", justifyContent: "center" }}><div style={{ fontSize: 260 }}>🛑</div></Pop>
          <Slam text="okay *STOP.*" at={2.3} top={720} size={170} />
          <Slam text="there's a better way" at={2.9} top={1020} size={96} color={C.limeInk} gap={0.08} />
          <Sticker name="dream-food" at={3.0} x={260} y={1250} w={560} tilt={-5} />
        </>
      )}
    </AbsoluteFill>
  );
};

const Reveal = () => {
  const f = useCurrentFrame();
  const drive = interpolate(f, [s(1.2), s(2.6)], [-700, 1200], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const logo = useSpring(0, 8, 0.7);
  return (
    <AbsoluteFill style={{ transform: useShake([0], 30) }}>
      <Bg color={C.lime} />
      <Floaters from={0.2} to={3.2} emojis={["🔥", "🍔", "🎉"]} seed={3} />
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 30, transform: `scale(${0.2 + 0.8 * logo})` }}>
        <svg viewBox="0 0 48 48" style={{ width: 170, height: 170 }}><rect x="31.5" y="19.5" width="6.5" height="8.5" rx="2" fill="#ffffff" stroke="#1b1d14" strokeWidth="2.6" /><path d="M39 21.5C42.5 21.5 43.5 17 41.5 14.5C38 9 31.5 5 24 5C13 5 5 13.5 5 24.5C5 35 11 43.5 20 43.5H40.5C44.5 43.5 45 38 41.5 37C40.5 36.7 39.5 36.5 38 36.5H24C17.5 36.5 14.5 31 16.5 26.5C18.5 22.5 23 21.5 27 21.5Z" fill="#f7f8f1" stroke="#1b1d14" strokeWidth="3" strokeLinejoin="round" /></svg>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 200, letterSpacing: -8, color: C.ink }}>BULK</div>
      </div>
      <Phone src="home" at={0.3} x={250} y={470} h={1150} tilt={-4} />
      <Pill at={0.9} text="📍 parties near you" x={560} y={620} size={46} tilt={6} />
      <div style={{ position: "absolute", left: drive, top: 1330, width: 480 }}><Img src={staticFile("stickers/scooter.png")} style={{ width: "100%" }} /></div>
    </AbsoluteFill>
  );
};

const Flow = () => (
  <AbsoluteFill>
    <Bg color={C.paper} />
    <Slam text="*Unlock* the deal" at={0} top={150} size={120} />
    <Phone src="basket" at={0.05} x={40} y={420} h={1000} tilt={-6} />
    <Phone src="accept" at={0.7} x={560} y={500} h={1000} tilt={5} />
    <Pill at={1.0} text="15% OFF! 🎉" x={560} y={430} bg={C.offer} fg="#fff" size={60} tilt={-8} />
    <Slam text="Split *one* delivery" at={1.6} top={1480} size={104} />
    <Pill at={2.2} text="£2.49 ÷ 3 = 83p" x={260} y={1660} size={50} tilt={3} />
  </AbsoluteFill>
);

const Save = () => {
  const f = useCurrentFrame();
  const price = interpolate(f, [s(0.5), s(1.4)], [15.24, 11.67], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ transform: useShake([1.4], 30) }}>
      <Bg color={C.lime} />
      <Floaters from={1.4} to={3.4} emojis={["🤑", "💚", "🎉", "🍔"]} seed={4} />
      <Slam text="Same burger." at={0} top={170} size={130} />
      <div style={{ position: "absolute", top: 380, left: 0, right: 0, textAlign: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: 280, color: C.ink, letterSpacing: -10 }}>£{price.toFixed(2)}</div>
      <Pop at={0.4} style={{ left: 300, top: 360 }}><div style={{ fontFamily: TEXT, fontWeight: 700, fontSize: 64, color: C.limeInk, textDecoration: "line-through", transform: "rotate(-8deg)" }}>£15.24</div></Pop>
      <Pop at={1.4} from={3} tilt={12} style={{ left: 640, top: 600 }}>
        <div style={{ width: 340, height: 340, borderRadius: "50%", background: C.offer, border: "12px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 800, fontSize: 120, color: "#fff" }}>−23%</div>
      </Pop>
      <Phone src="basket-price" at={0.2} x={120} y={820} h={1000} tilt={-5} />
      <Sticker name="handover" at={1.8} x={560} y={1130} w={480} tilt={7} />
    </AbsoluteFill>
  );
};

const Cta = () => {
  const f = useCurrentFrame();
  const pulse = 1 + Math.sin(f / 4) * 0.04;
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <Floaters from={1.0} to={4.9} emojis={["❤️", "🔥", "🍔", "💚"]} seed={5} />
      <Slam text="Order *together.*" at={0} top={200} size={150} />
      <Sticker name="scooter" at={0.5} x={260} y={560} w={560} tilt={-6} />
      <Pop at={1.0} style={{ left: 0, right: 0, top: 1180, display: "flex", justifyContent: "center" }}>
        <div style={{ transform: `scale(${pulse})`, background: C.ink, color: C.lime, fontFamily: DISPLAY, fontWeight: 800, fontSize: 110, padding: "30px 80px", borderRadius: 999 }}>Try Bulk 👉</div>
      </Pop>
      <Pop at={1.5} style={{ left: 0, right: 0, top: 1450, textAlign: "center" }}><div style={{ fontFamily: TEXT, fontWeight: 800, fontSize: 54, color: C.ink }}>bulk-theta.vercel.app</div></Pop>
    </AbsoluteFill>
  );
};

const Sfx = ({ at, name, volume = 0.8 }: { at: number; name: string; volume?: number }) => (
  <Sequence from={s(at)} layout="none"><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>
);
const Vo = ({ at, line }: { at: number; line: string }) => (
  <Sequence from={s(at)} layout="none"><Audio src={staticFile(`vo/${line}.wav`)} volume={1} /></Sequence>
);

export const Reel = () => (
  <AbsoluteFill style={{ background: C.paper }}>
    <Scene from={T.hook} to={T.fees}><Hook /></Scene>
    <Scene from={T.fees} to={T.deal}><Fees /></Scene>
    <Scene from={T.deal} to={T.meme}><Deal /></Scene>
    <Scene from={T.meme} to={T.reveal}><Meme /></Scene>
    <Scene from={T.reveal} to={T.flow}><Reveal /></Scene>
    <Scene from={T.flow} to={T.save}><Flow /></Scene>
    <Scene from={T.save} to={T.cta}><Save /></Scene>
    <Scene from={T.cta} to={30}><Cta /></Scene>
    <Progress />
    <Marquee />

    {/* beat drops out for the meme so the knocks land, then comes back with the air horn */}
    <Sequence from={0} durationInFrames={s(T.meme)} layout="none"><Audio src={staticFile("sfx/beat.wav")} volume={0.22} /></Sequence>
    <Sequence from={s(T.reveal)} layout="none"><Audio src={staticFile("sfx/beat.wav")} trimBefore={s(T.reveal)} volume={0.26} /></Sequence>

    <Vo at={0.25} line="l1" />
    <Vo at={T.fees + 0.1} line="l2" />
    <Vo at={T.deal + 0.1} line="l3" />
    <Vo at={T.meme + 0.05} line="l4" />
    <Vo at={T.reveal + 0.35} line="l5" />
    <Vo at={T.flow + 0.1} line="l6" />
    <Vo at={T.save + 0.1} line="l7" />
    <Vo at={T.cta + 0.2} line="l8" />

    <Sfx at={0.1} name="boom" volume={0.9} />
    <Sfx at={1.6} name="pop" />
    <Sfx at={T.fees + 0.9} name="pop" />
    <Sfx at={T.fees + 1.5} name="pop" />
    <Sfx at={T.fees + 2.6} name="boom" volume={0.9} />
    <Sfx at={T.deal + 0.6} name="slide" volume={0.5} />
    <Sfx at={T.deal + 2.0} name="buzzer" volume={0.6} />
    {KNOCKS.map((k, i) => <Sfx key={i} at={T.meme + k} name="tung" volume={1} />)}
    <Sfx at={T.meme + 2.2} name="scratch" volume={0.9} />
    <Sfx at={T.meme + 2.9} name="slide" volume={0.5} />
    <Sfx at={T.reveal} name="airhorn" volume={0.55} />
    <Sfx at={T.reveal + 1.2} name="whoosh" volume={0.9} />
    <Sfx at={T.flow + 0.7} name="whoosh" volume={0.7} />
    <Sfx at={T.flow + 1.0} name="kaching" volume={0.7} />
    <Sfx at={T.save + 1.4} name="kaching" volume={0.8} />
    <Sfx at={T.save + 1.8} name="boing" volume={0.6} />
    <Sfx at={T.cta + 1.0} name="pop" />
    <Sfx at={T.cta + 2.6} name="boing" volume={0.6} />
  </AbsoluteFill>
);
