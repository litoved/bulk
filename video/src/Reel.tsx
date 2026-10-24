import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadText } from "@remotion/google-fonts/Figtree";

const { fontFamily: DISPLAY } = loadDisplay();
const { fontFamily: TEXT } = loadText();

const C = { paper: "#f7f8f1", ink: "#1b1d14", lime: "#b7cd32", limeInk: "#4a5706", offer: "#c93a22", night: "#1f2318" };
const FPS = 30;
// Animation inside a scene runs K times faster than it is written; scenes and audio are placed in real seconds.
const K = 1.35;
const s = (sec: number) => Math.round((sec * FPS) / K);
const r = (sec: number) => Math.round(sec * FPS);
const END = 25;
export const REEL_FRAMES = r(END);

// Scene boundaries in real seconds, sized to the voiceover line each scene carries.
const T = { hook: 0, fees: 2.1, deal: 6.3, meme: 9.6, reveal: 14.6, flow: 16.3, save: 19.4, cta: 22.4 };

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
        const start = s(at) + Math.round((i * gap * fps) / K);
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
  <Sequence from={r(from)} durationInFrames={r(to) - r(from)} layout="none">{children}</Sequence>
);

// Children of a Scene see frames relative to the scene start, so times inside are local seconds.
const Hook = () => (
  <AbsoluteFill style={{ transform: useShake([0.1]) }}>
    <Bg color={C.paper} />
    <Floaters from={0.8} to={2.8} emojis={["😭", "💸", "🥲"]} />
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

// Times in the meme are real seconds (rk converts them to animation time) because they sync to the "tung" line.
const rk = (sec: number) => sec * K;
const KNOCKS = [0.05, 0.33, 0.61, 0.89, 1.17];
const SAHUR = 1.55, STOP = 2.45;

// An original wooden-log character in the style of the Tung Tung Tung Sahur meme; `swing` 0..1 drives the bat.
const Sahur = ({ swing }: { swing: number }) => (
  <svg viewBox="0 0 420 640" style={{ width: "100%", overflow: "visible" }} aria-label="A wooden log character swinging a bat">
    <g stroke="#1b1d14" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M160 520 L120 610 L80 612" fill="none" />
      <path d="M260 520 L300 610 L340 612" fill="none" />
      <rect x="110" y="90" width="200" height="450" rx="40" fill="#b5713a" />
      <ellipse cx="210" cy="96" rx="100" ry="26" fill="#d9a066" />
      <ellipse cx="210" cy="96" rx="56" ry="13" fill="none" strokeWidth="5" />
      <path d="M140 160 L148 300 M280 200 L272 360 M150 380 L156 480 M262 420 L268 510" fill="none" strokeWidth="6" stroke="#7a4520" />
      <circle cx="170" cy="230" r="34" fill="#fff" />
      <circle cx="252" cy="222" r="38" fill="#fff" />
      <circle cx="176" cy="236" r="13" fill="#1b1d14" stroke="none" />
      <circle cx="246" cy="228" r="15" fill="#1b1d14" stroke="none" />
      <ellipse cx="212" cy="330" rx="34" ry="46" fill="#3a1408" />
      <path d="M118 300 Q 60 330 70 400" fill="none" />
      <g transform={`rotate(${swing * 95} 300 300)`}>
        <path d="M300 300 Q 350 290 370 250" fill="none" />
        <rect x="350" y="40" width="40" height="230" rx="20" fill="#e3b27a" transform="rotate(12 370 250)" />
      </g>
    </g>
  </svg>
);

const Meme = () => {
  const f = useCurrentFrame();
  const stopped = f >= s(rk(STOP));
  const sahurTime = f >= s(rk(SAHUR));
  const sinceKnock = KNOCKS.reduce((m, k) => { const d = f - s(rk(k)); return d >= 0 ? Math.min(m, d) : m; }, 99);
  const swing = sinceKnock < 4 ? 1 - sinceKnock / 4 : 0;
  const jolt = sinceKnock < 8 ? (8 - sinceKnock) * 4 : 0;
  const flash = sinceKnock < 2 || (f - s(rk(SAHUR)) >= 0 && f - s(rk(SAHUR)) < 3);
  const big = spring({ frame: f - s(rk(SAHUR)), fps: FPS, config: { damping: 8, mass: 0.6 } });
  const shake = useShake([...KNOCKS, SAHUR].map(rk), 44);
  return (
    <AbsoluteFill style={{ transform: stopped ? "none" : shake }}>
      <AbsoluteFill style={{ background: stopped ? C.paper : flash ? "#ffffff" : C.night }} />
      {!stopped && !sahurTime && KNOCKS.map((k, i) => (
        <Pop key={i} at={rk(k)} from={3} tilt={(i % 2 ? 1 : -1) * 8} style={{ left: [60, 420, 110, 400, 80][i], top: 150 + i * 150 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 130, color: C.lime, WebkitTextStroke: "4px #000", textShadow: "8px 8px 0 #000" }}>TUNG</div>
        </Pop>
      ))}
      {!stopped && !sahurTime && (
        <>
          <div style={{ position: "absolute", left: 40, top: 960, width: 460 }}><Sahur swing={swing} /></div>
          <div style={{ position: "absolute", left: 520, top: 1180, width: 480, transform: `translate(${jolt}px, ${-jolt}px) rotate(${jolt / 2}deg)` }}>
            <Img src={staticFile("stickers/helmet-sad.png")} style={{ width: "100%" }} />
          </div>
        </>
      )}
      {!stopped && sahurTime && (
        <>
          <div style={{ position: "absolute", left: 140, top: 520, width: 800, transform: `scale(${0.3 + 0.7 * big}) rotate(${(1 - big) * -25 + Math.sin(f / 2) * 3}deg)` }}><Sahur swing={Math.abs(Math.sin(f / 3))} /></div>
          <Pop at={rk(SAHUR)} from={4} tilt={-6} style={{ left: 0, right: 0, top: 170, display: "flex", justifyContent: "center" }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 210, color: C.offer, WebkitTextStroke: "6px #000", textShadow: "12px 12px 0 #000" }}>SAHUR!!!</div>
          </Pop>
        </>
      )}
      {stopped && (
        <>
          <Pop at={rk(STOP)} from={2} style={{ left: 0, right: 0, top: 360, display: "flex", justifyContent: "center" }}><div style={{ fontSize: 260 }}>🛑</div></Pop>
          <Slam text="okay *STOP.*" at={rk(STOP + 0.1)} top={700} size={170} />
          <Slam text="there's a better way" at={rk(STOP + 0.8)} top={1000} size={96} color={C.limeInk} gap={0.08} />
          <Sticker name="dream-food" at={rk(STOP + 0.9)} x={260} y={1230} w={560} tilt={-5} />
        </>
      )}
    </AbsoluteFill>
  );
};

const Reveal = () => {
  const f = useCurrentFrame();
  const drive = interpolate(f, [s(0.5), s(1.9)], [-700, 1200], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
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
      <Floaters from={0.8} to={3.4} emojis={["❤️", "🔥", "🍔", "💚"]} seed={5} />
      <Slam text="Order *together.*" at={0} top={200} size={150} />
      <Sticker name="scooter" at={0.5} x={260} y={560} w={560} tilt={-6} />
      <Pop at={1.0} style={{ left: 0, right: 0, top: 1180, display: "flex", justifyContent: "center" }}>
        <div style={{ transform: `scale(${pulse})`, background: C.ink, color: C.lime, fontFamily: DISPLAY, fontWeight: 800, fontSize: 110, padding: "30px 80px", borderRadius: 999 }}>Try Bulk 👉</div>
      </Pop>
      <Pop at={1.5} style={{ left: 0, right: 0, top: 1450, textAlign: "center" }}><div style={{ display: "inline-block", fontFamily: TEXT, fontWeight: 800, fontSize: 54, color: C.ink, background: C.paper, padding: "12px 36px", borderRadius: 999, boxShadow: "0 10px 24px rgba(27,29,20,0.18)" }}>bulk-theta.vercel.app</div></Pop>
    </AbsoluteFill>
  );
};

const Sfx = ({ at, name, volume = 0.8 }: { at: number; name: string; volume?: number }) => (
  <Sequence from={r(at)} layout="none"><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>
);
const Vo = ({ at, line }: { at: number; line: string }) => (
  <Sequence from={r(at)} layout="none"><Audio src={staticFile(`vo/${line}.wav`)} volume={1} /></Sequence>
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
    <Scene from={T.cta} to={END}><Cta /></Scene>
    <Progress />
    <Marquee />

    {/* beat drops out for the meme so the knocks land, then a riser and snare roll throw back to the drop */}
    <Sequence from={0} durationInFrames={r(T.meme)} layout="none"><Audio src={staticFile("sfx/beat.wav")} volume={0.3} /></Sequence>
    <Sequence from={r(T.reveal)} layout="none"><Audio src={staticFile("sfx/beat.wav")} trimBefore={r(T.reveal)} volume={0.3} /></Sequence>

    <Vo at={0.15} line="l1" />
    <Vo at={T.fees + 0.05} line="l2" />
    <Vo at={T.fees + 2.9} line="damage" />
    <Vo at={T.deal + 0.05} line="l3" />
    <Vo at={T.deal + 2.6} line="bruh" />
    <Vo at={T.meme + 0.05} line="l4" />
    <Vo at={T.meme + STOP + 0.1} line="l4b" />
    <Vo at={T.reveal + 0.15} line="l5" />
    <Vo at={T.flow + 0.05} line="l6" />
    <Vo at={T.save + 0.05} line="l7" />
    <Vo at={T.cta + 0.1} line="l8" />

    {[T.fees, T.deal, T.flow, T.save, T.cta].map((at) => <Sfx key={at} at={at - 0.12} name="whoosh" volume={0.7} />)}
    <Sfx at={0.05} name="boom" volume={0.45} />
    <Sfx at={1.2} name="pop" />
    {[0.22, 0.67, 1.11].map((d) => <Sfx key={d} at={T.fees + d} name="ding" volume={0.6} />)}
    <Sfx at={T.fees + 1.93} name="impact" volume={0.45} />
    <Sfx at={T.fees + 1.93} name="boom" volume={0.45} />
    <Sfx at={T.deal + 0.44} name="slide" volume={0.5} />
    <Sfx at={T.deal + 1.48} name="buzzer" volume={0.6} />
    <Sfx at={T.deal + 1.93} name="pop" />
    {KNOCKS.map((k) => <Sfx key={k} at={T.meme + k} name="tung" volume={0.8} />)}
    <Sfx at={T.meme + SAHUR} name="impact" volume={0.45} />
    <Sfx at={T.meme + SAHUR} name="boom" volume={0.45} />
    <Sfx at={T.meme + STOP} name="scratch" volume={0.9} />
    <Sfx at={T.reveal - 1.6} name="riser" volume={0.45} />
    <Sfx at={T.reveal - 1.0} name="snareroll" volume={0.6} />
    <Sfx at={T.reveal} name="airhorn" volume={0.38} />
    <Sfx at={T.reveal} name="impact" volume={0.45} />
    <Sfx at={T.reveal + 0.37} name="whoosh" volume={0.9} />
    <Sfx at={T.flow + 0.52} name="pop" />
    <Sfx at={T.flow + 0.74} name="kaching" volume={0.7} />
    <Sfx at={T.flow + 1.63} name="ding" volume={0.6} />
    <Sfx at={T.save + 1.04} name="kaching" volume={0.8} />
    <Sfx at={T.save + 1.04} name="impact" volume={0.45} />
    <Sfx at={T.save + 1.33} name="boing" volume={0.6} />
    <Sfx at={T.cta + 0.74} name="pop" />
    <Sfx at={T.cta + 1.6} name="boing" volume={0.6} />
  </AbsoluteFill>
);
