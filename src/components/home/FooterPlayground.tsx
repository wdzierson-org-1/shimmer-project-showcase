import { useCallback, useEffect, useRef, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PX = 5;
const CHAR_W = 7 * PX;
const CHAR_H = 14 * PX;
const SCENE_H = 220;
const GROUND_H = 44;
const GROUND_Y = SCENE_H - GROUND_H;
const CHAR_GROUND_TOP = GROUND_Y - CHAR_H;

const WALK_SPEED_MAX = 180;   // px/s top speed
const WALK_ACCEL = 520;       // px/s² acceleration
const WALK_DECEL_DIST = 55;   // px from target where braking starts
const WALK_STOP = 3;

const SPRING_K = 0.12;
const DAMPING = 0.78;
const GRAVITY_PF = 1.4;
const AIR_FRICTION = 0.992;
const BOUNCE = 0.3;
const TILT_SCALE = 0.4;
const MAX_TILT = 40;
const HANG_OFFSET_Y = 12;           // character hangs this far below cursor

const HOLE_FRAC = 0.24;
const HOLE_HIT_R = 40;
const HOLE_RX = 32;
const HOLE_RY = 10;

// SVG hole layout constants (derived from HOLE_R* above)
const HOLE_SVG_PAD_X  = 22;    // horizontal padding for feather/glow overflow
const HOLE_SVG_PAD_TOP = 16;   // space above hole center for effect headroom
const HOLE_SVG_W  = HOLE_RX * 2 + HOLE_SVG_PAD_X * 2;   // 108
const HOLE_SVG_CX = HOLE_SVG_W / 2;                       // 54
const HOLE_SVG_CY = HOLE_SVG_PAD_TOP + HOLE_RY;           // 26 — hole center in SVG coords

const STORAGE_KEY = 'fp-explorer';
const MAX_FEED = 5;

type DragPhase = 'none' | 'held' | 'flung' | 'falling';
type IdlePhase = 'still' | 'tap' | 'think' | 'jump' | 'look';
type Mood = 'neutral' | 'happy' | 'annoyed' | 'angry';
type Behavior = 'normal' | 'zombie' | 'hyper' | 'giant' | 'tiny' | 'dizzy' | 'floating';

interface Traits { m: number; b: number; p: number }

interface Visual {
  body: string; skin: string; hair: string; eyes: string;
  legs: string; feet: string;
  hat: 'none' | 'mushroom' | 'crown' | 'wizard' | 'antenna' | 'halo';
  aura: 'none' | 'electric' | 'purple' | 'rainbow' | 'green' | 'fire';
  spots: boolean; sparks: boolean; thirdEye: boolean;
  name: string; behavior: Behavior; scale: number; walkMul: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOOD CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const FOODS = [
  { id: 'm', emoji: '🍄', label: 'Mushroom' },
  { id: 'b', emoji: '⚡', label: 'Bolt' },
  { id: 'p', emoji: '🧪', label: 'Potion' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

function loadTraits(): Traits {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const t = JSON.parse(raw); if (typeof t.m === 'number') return t; }
  } catch { /* noop */ }
  return { m: 0, b: 0, p: 0 };
}
function saveTraits(t: Traits) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch { /* noop */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL + BEHAVIOR COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

function mix(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => Math.round(v + (b[i] - v) * Math.min(t, 1)));
}
function hex(rgb: number[]): string {
  return '#' + rgb.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

const FORM_NAMES: Record<string, string> = {
  '000': 'Explorer',
  '100': 'Verdant', '200': 'Mossy', '300': 'Fungal King', '400': 'Colossal Shroom', '500': 'World Tree',
  '010': 'Sparked', '020': 'Charged', '030': 'Thunder Being', '040': 'Lightning Rod', '050': 'Pure Energy',
  '001': 'Tainted', '002': 'Corrupted', '003': 'Void Walker', '004': 'Phase Shifter', '005': 'Quantum Ghost',
  '110': 'Electroflora', '101': 'Mycelial Mind', '011': 'Plasma Wisp',
  '220': 'Storm Spore', '202': 'Cosmic Fungus', '022': 'Chaos Lightning',
  '111': 'Trifecta', '211': 'Nature\'s Fury', '121': 'Arcane Storm', '112': 'Dark Synthesis',
  '221': 'Emerald Thunder', '212': 'Toxic Bloom', '122': 'Spectral Surge',
  '222': 'Primordial', '321': 'Jungle Storm', '312': 'Myco-Plasma', '231': 'Emerald Vortex',
  '213': 'Toxic Nova', '132': 'Spectral Shroom', '123': 'Neon Abyss',
  '310': 'Living Dynamo', '301': 'Eldritch Spore', '130': 'Thundercap',
  '031': 'Storm Wraith', '013': 'Abyssal Spark', '103': 'Deep Mycelium',
  '320': 'Titan Bloom', '230': 'Tempest Moss', '302': 'Void Fungus',
  '203': 'Shadow Spore', '032': 'Lightning Shade', '023': 'Dark Surge',
  '330': 'Overgrowth', '303': 'Eldritch King', '033': 'Nova Wraith',
  '333': 'Primordial Apex', '331': 'Almost There...', '313': 'So Close...',
  '133': 'One More...', '332': 'Edge of Omega', '323': 'Near Apex', '233': 'Penultimate',
  '444': 'Ascendant', '445': 'Beyond Mortal', '454': 'Quantum Titan', '544': 'Eldritch Colossus',
  '455': 'Demiurge', '545': 'Reality Weaver', '554': 'Cosmic Architect',
  '555': 'O M E G A',
  '500': 'World Tree', '050': 'Pure Energy', '005': 'Quantum Ghost',
  '550': 'Solar Bloom', '505': 'Phantom Grove', '055': 'Plasma God',
  '551': 'Solar Bloom+', '515': 'Ghost Lightning', '155': 'Void Storm',
  '440': 'Mega Flora', '404': 'Null Fungus', '044': 'Hyper Wraith',
  '430': 'Jungle Titan', '340': 'Thunder Fern', '403': 'Void Colossus',
  '304': 'Phase Spore', '034': 'Storm Phase', '043': 'Dark Tesla',
  '350': 'Tempest King', '530': 'Bio Lightning', '503': 'Quantum Shroom',
  '305': 'Ghost Mycelium', '035': 'Plasma Wraith', '053': 'Tesla Ghost',
  '450': 'Hyper Bloom', '540': 'Mega Dynamo', '504': 'Phase Colossus',
  '405': 'Null Ghost', '045': 'Lightning God', '054': 'Storm Titan',
};

function computeVisual(t: Traits): Visual {
  const { m, b, p } = t;
  const total = m + b + p;
  let body = [41, 128, 185];
  let skin = [245, 214, 184];
  let hair = [93, 58, 26];
  let eyes = [26, 26, 46];
  let legs = [44, 62, 80];
  let feet = [26, 26, 46];

  if (m > 0) {
    body = mix(body, [34, 197, 94], m * 0.16);
    if (m >= 2) skin = mix(skin, [167, 243, 208], m * 0.1);
    if (m >= 4) { hair = [22, 163, 74]; body = mix(body, [21, 128, 61], 0.4); }
    if (m >= 5) { skin = mix(skin, [74, 222, 128], 0.4); feet = mix(feet, [21, 94, 47], 0.5); }
  }
  if (b > 0) {
    eyes = [251, 191, 36];
    if (b >= 2) body = mix(body, [251, 191, 36], b * 0.1);
    if (b >= 3) hair = mix([93, 58, 26], [251, 191, 36], b * 0.12);
    if (b >= 4) { legs = mix(legs, [161, 98, 7], 0.5); feet = mix(feet, [120, 80, 10], 0.4); }
    if (b >= 5) body = mix(body, [255, 220, 50], 0.3);
  }
  if (p > 0) {
    if (b === 0) eyes = [168, 85, 247]; else eyes = mix([251, 191, 36], [168, 85, 247], p / (b + p));
    if (p >= 2) body = mix(body, [124, 58, 237], p * 0.1);
    if (p >= 3) skin = mix(skin, [196, 181, 253], p * 0.08);
    if (p >= 4) { feet = mix(feet, [88, 28, 135], 0.5); hair = mix(hair, [100, 30, 180], 0.4); }
    if (p >= 5) { body = mix(body, [80, 20, 180], 0.3); skin = mix(skin, [180, 160, 230], 0.3); }
  }

  if (m >= 2 && b >= 2) body = mix(body, [80, 200, 120], 0.2);
  if (m >= 2 && p >= 2) body = mix(body, [100, 40, 160], 0.2);
  if (b >= 2 && p >= 2) body = mix(body, [200, 100, 255], 0.2);
  if (total >= 10) body = mix(body, [220, 80, 220], 0.1 * (total - 9));

  const hat: Visual['hat'] =
    total >= 13 ? 'halo'
    : m >= 4 ? 'mushroom'
    : b >= 4 ? 'crown'
    : p >= 4 ? 'wizard'
    : (m >= 2 && b >= 2) ? 'antenna'
    : m >= 2 ? 'mushroom' : b >= 3 ? 'crown' : p >= 2 ? 'wizard' : 'none';

  const aura: Visual['aura'] =
    total >= 12 ? 'rainbow'
    : (m >= 3 && b >= 3) ? 'fire'
    : b >= 3 ? 'electric'
    : m >= 3 ? 'green'
    : p >= 3 ? 'purple'
    : 'none';

  // Behavior
  let behavior: Behavior = 'normal';
  let scale = 1;
  let walkMul = 1;
  if (total >= 13) { behavior = 'floating'; walkMul = 0.5; }
  else if (m >= 4 && b <= 1 && p <= 1) { behavior = 'giant'; scale = 1.45; walkMul = 0.65; }
  else if (p >= 4 && m <= 1 && b <= 1) { behavior = 'tiny'; scale = 0.55; walkMul = 1.6; }
  else if (b >= 4) { behavior = 'hyper'; walkMul = 2.2; }
  else if (total >= 9 && m >= 3) { behavior = 'zombie'; walkMul = 0.4; }
  else if (total >= 8 && p >= 3) { behavior = 'dizzy'; walkMul = 0.7; }

  const key = `${m}${b}${p}`;
  const name = FORM_NAMES[key] || (total >= 12 ? 'Transcendent' : total >= 9 ? 'Evolved Being' : total >= 6 ? 'Hybrid' : total >= 1 ? 'Modified' : 'Explorer');

  return {
    body: hex(body), skin: hex(skin), hair: hex(hair), eyes: hex(eyes),
    legs: hex(legs), feet: hex(feet),
    hat, aura, spots: m >= 1, sparks: b >= 1, thirdEye: p >= 1,
    name, behavior, scale, walkMul,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOUNDS
// ═══════════════════════════════════════════════════════════════════════════════

function playYelp() {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.connect(g); g.connect(c.destination);
    o.frequency.setValueAtTime(720, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(95, c.currentTime + 0.48);
    g.gain.setValueAtTime(0.09, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.52);
    o.start(); o.stop(c.currentTime + 0.55);
    setTimeout(() => c.close(), 800);
  } catch { /* noop */ }
}
function playGiggle() {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.connect(g); g.connect(c.destination);
    o.frequency.setValueAtTime(500, c.currentTime);
    o.frequency.setValueAtTime(700, c.currentTime + 0.06);
    o.frequency.setValueAtTime(500, c.currentTime + 0.12);
    o.frequency.setValueAtTime(800, c.currentTime + 0.18);
    g.gain.setValueAtTime(0.06, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.26);
    o.start(); o.stop(c.currentTime + 0.28);
    setTimeout(() => c.close(), 500);
  } catch { /* noop */ }
}
function playAngrySound() {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.connect(g); g.connect(c.destination);
    o.frequency.setValueAtTime(200, c.currentTime);
    o.frequency.setValueAtTime(120, c.currentTime + 0.15);
    g.gain.setValueAtTime(0.05, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    o.start(); o.stop(c.currentTime + 0.22);
    setTimeout(() => c.close(), 400);
  } catch { /* noop */ }
}
function playEatSound() {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.connect(g); g.connect(c.destination);
    o.frequency.setValueAtTime(300, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.15);
    g.gain.setValueAtTime(0.06, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
    o.start(); o.stop(c.currentTime + 0.2);
    setTimeout(() => c.close(), 400);
  } catch { /* noop */ }
}
function playFormSound() {
  try {
    const c = new AudioContext();
    [440, 554, 659, 880].forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.connect(g); g.connect(c.destination);
      const t = c.currentTime + i * 0.08;
      o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.start(t); o.stop(t + 0.14);
    });
    setTimeout(() => c.close(), 800);
  } catch { /* noop */ }
}
function playNervousWhimper() {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.connect(g); g.connect(c.destination);
    const t = c.currentTime;
    o.frequency.setValueAtTime(380, t);
    o.frequency.setValueAtTime(420, t + 0.05);
    o.frequency.setValueAtTime(350, t + 0.1);
    o.frequency.setValueAtTime(400, t + 0.15);
    o.frequency.setValueAtTime(320, t + 0.2);
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.start(); o.stop(t + 0.27);
    setTimeout(() => c.close(), 500);
  } catch { /* noop */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYFRAMES
// ═══════════════════════════════════════════════════════════════════════════════

const KEYFRAMES = `
@keyframes fp-walkL{0%,100%{transform:translateY(0)}50%{transform:translateY(-${PX}px)}}
@keyframes fp-walkR{0%,100%{transform:translateY(0)}50%{transform:translateY(${PX}px)}}
@keyframes fp-armWalkL{0%,100%{transform:translateY(${PX}px)}50%{transform:translateY(-${PX}px)}}
@keyframes fp-armWalkR{0%,100%{transform:translateY(-${PX}px)}50%{transform:translateY(${PX}px)}}
@keyframes fp-tap{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-${PX - 1}px)}}
@keyframes fp-jump{0%,100%{transform:translateY(0)}40%,60%{transform:translateY(-${PX * 3}px)}}
@keyframes fp-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
@keyframes fp-speech{0%{opacity:0;transform:translateY(6px) scale(.85)}12%{opacity:1;transform:translateY(0) scale(1)}72%{opacity:1;transform:translateY(-8px)}100%{opacity:0;transform:translateY(-28px) scale(.9)}}
@keyframes fp-puff{0%{transform:scale(.5);opacity:.9}100%{transform:scale(var(--puff-scale,2.6));opacity:0}}
@keyframes fp-fallInHole{0%{transform:translateY(0) scale(1);opacity:1}15%{transform:translateY(-7px) scale(1.04,1.1);opacity:1}55%{transform:translateY(10px) scale(0.85,0.9);opacity:1}80%{transform:translateY(20px) scale(0.4,0.22);opacity:0.7}100%{transform:translateY(28px) scale(0.04,0.02);opacity:0}}
@keyframes fp-flash{0%,100%{filter:brightness(1)}30%,70%{filter:brightness(4) saturate(0)}}
@keyframes fp-dropIn{0%{transform:translateY(-30px) scaleY(1.2);opacity:.6}70%{transform:translateY(4px) scaleY(.9);opacity:1}100%{transform:translateY(0) scaleY(1);opacity:1}}
@keyframes fp-holePulse{0%,100%{opacity:.7;transform:scaleX(1)}50%{opacity:1;transform:scaleX(1.06)}}
@keyframes fp-hintFade{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}70%{opacity:.9}100%{opacity:0;transform:translateY(-12px)}}
@keyframes fp-nameReveal{0%{opacity:0;transform:translateY(6px) scale(.9)}15%{opacity:1;transform:translateY(0) scale(1)}80%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}
@keyframes fp-spark{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--sx),var(--sy)) scale(0)}}
@keyframes fp-auraGlow{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.6;transform:scale(1.08)}}
@keyframes fp-grassWave{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes fp-tremble{0%,100%{transform:translateX(0)}25%{transform:translateX(-1.5px)}75%{transform:translateX(1.5px)}}
@keyframes fp-sweat{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(8px)}}
@keyframes fp-zombieArms{0%,100%{transform:rotate(-85deg)}50%{transform:rotate(-80deg)}}
@keyframes fp-hyperVibe{0%,100%{transform:translateX(-1px)}50%{transform:translateX(1px)}}
@keyframes fp-floatBob{0%,100%{transform:translateY(-12px)}50%{transform:translateY(-18px)}}
@keyframes fp-dizzyWobble{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes fp-dustPart{0%{opacity:.8;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0.3)}}
@keyframes fp-squash{0%{transform:scaleX(1) scaleY(1)}30%{transform:scaleX(1.3) scaleY(0.7)}60%{transform:scaleX(0.9) scaleY(1.1)}100%{transform:scaleX(1) scaleY(1)}}
@keyframes fp-rayRise{0%{opacity:0;transform:rotate(var(--ra)) scaleY(0.05)}15%{opacity:.85;transform:rotate(var(--ra)) scaleY(0.6)}40%{opacity:.7;transform:rotate(var(--ra)) scaleY(1)}100%{opacity:0;transform:rotate(var(--ra)) scaleY(1.55)}}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLORER SPRITE
// ═══════════════════════════════════════════════════════════════════════════════

interface SpriteProps {
  visual: Visual;
  walking: boolean;
  walkSpeed: number;        // 0-1 normalized speed for animation cadence
  held: boolean;
  falling: boolean;
  flashing: boolean;
  spawning: boolean;
  mood: Mood;
  idlePhase: IdlePhase;
  tiltDeg: number;
  eyeOffX: number;
  eyeOffY: number;
  nervousLevel: number;
  squashLanding: boolean;
}

function blk(x: number, y: number, w: number, h: number, color: string): React.CSSProperties {
  return { position: 'absolute', left: x * PX, top: y * PX, width: w * PX, height: h * PX, background: color };
}

function ExplorerSprite({
  visual, walking, walkSpeed, held, falling, flashing, spawning, mood, idlePhase,
  tiltDeg, eyeOffX, eyeOffY, nervousLevel, squashLanding,
}: SpriteProps) {
  const isTapping = idlePhase === 'tap' && !walking && !held;
  const isJumping = idlePhase === 'jump' && !walking && !held;
  const isAngry = mood === 'angry';
  const beh = visual.behavior;
  const isZombie = beh === 'zombie';
  const isHyper = beh === 'hyper';
  const isDizzy = beh === 'dizzy';
  const isFloating = beh === 'floating';
  const nervous = nervousLevel > 0.1 && held;

  const mouthColor = isAngry ? '#c0392b' : nervous ? '#c0a070' : mood === 'happy' ? '#e8a87c' : isZombie ? '#4a7a4a' : 'transparent';
  const faceFlush = isAngry ? 'rgba(220,38,38,0.25)' : nervous ? `rgba(200,180,100,${nervousLevel * 0.2})` : 'none';

  // Walk cadence scales with speed: slow start/stop, fast at full speed
  const baseWalkDur = isHyper ? 0.18 : isZombie ? 0.7 : 0.36;
  const walkDurS = (baseWalkDur / Math.max(0.25, walkSpeed)).toFixed(3) + 's';
  const walkAnim = (name: string) => walking ? `${name} ${walkDurS} steps(2, end) infinite` : 'none';

  const eyeScale = nervous ? 1 + nervousLevel * 0.6 : 1;

  const wrapAnim = falling ? 'fp-fallInHole 1.3s ease-in forwards'
    : flashing ? 'fp-flash 0.4s ease-in-out'
    : spawning ? 'fp-dropIn 0.45s cubic-bezier(.22,1,.36,1) forwards'
    : squashLanding ? 'fp-squash 0.35s ease-out'
    : isJumping ? 'fp-jump 0.6s ease-in-out'
    : mood === 'happy' ? 'fp-shake 0.3s ease-in-out'
    : nervous ? `fp-tremble ${0.15 + (1 - nervousLevel) * 0.15}s linear infinite`
    : isHyper && !walking ? 'fp-hyperVibe 0.08s linear infinite'
    : isDizzy ? 'fp-dizzyWobble 1.2s ease-in-out infinite'
    : isFloating ? 'fp-floatBob 3s ease-in-out infinite'
    : 'none';

  return (
    <div style={{
      position: 'relative', width: CHAR_W, height: CHAR_H,
      animation: wrapAnim,
      cursor: held ? 'grabbing' : 'grab',
      userSelect: 'none',
      transform: held ? `rotate(${tiltDeg}deg)` : `scale(${visual.scale})`,
      transformOrigin: held ? 'top center' : 'center bottom',
      transition: held ? 'none' : 'transform 0.3s ease',
      opacity: isFloating ? 0.7 : 1,
    }}>
      {/* Hat accessories */}
      {visual.hat === 'mushroom' && (
        <div style={{ ...blk(0, -2, 7, 2, '#dc2626'), zIndex: 3 }}>
          <div style={{ position: 'absolute', left: PX, top: 0, width: PX, height: PX, background: '#fef2f2' }} />
          <div style={{ position: 'absolute', left: 4 * PX, top: 0, width: PX, height: PX, background: '#fef2f2' }} />
        </div>
      )}
      {visual.hat === 'crown' && (
        <div style={{ ...blk(1, -2, 5, 2, '#fbbf24'), zIndex: 3, clipPath: 'polygon(0% 100%, 10% 0%, 30% 60%, 50% 0%, 70% 60%, 90% 0%, 100% 100%)' }} />
      )}
      {visual.hat === 'wizard' && (<>
        <div style={{ ...blk(2, -4, 3, 4, '#7c3aed'), zIndex: 3, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
        <div style={{ position: 'absolute', left: 3 * PX + 1, top: -4 * PX + 1, width: PX - 2, height: PX - 2, background: '#fbbf24', zIndex: 4 }} />
      </>)}
      {visual.hat === 'antenna' && (<>
        <div style={{ position: 'absolute', left: 3 * PX, top: -3 * PX, width: 2, height: 3 * PX, background: '#888', zIndex: 3 }} />
        <div style={{ position: 'absolute', left: 3 * PX - 2, top: -3 * PX - 3, width: 6, height: 6, background: '#4ade80', borderRadius: '50%', zIndex: 3 }} />
      </>)}
      {visual.hat === 'halo' && (
        <div style={{
          position: 'absolute', left: -2, top: -3 * PX, width: CHAR_W + 4, height: PX * 1.5,
          border: '2px solid rgba(251,191,36,0.6)', borderRadius: '50%', zIndex: 3,
        }} />
      )}

      {/* Hair */}
      <div style={blk(2, 0, 3, 1, visual.hair)} />
      <div style={blk(1, 1, 5, 1, visual.hair)} />

      {/* Head */}
      <div style={{ ...blk(1, 2, 5, 4, visual.skin), boxShadow: faceFlush !== 'none' ? `inset 0 0 0 20px ${faceFlush}` : 'none' }}>
        {visual.thirdEye && <div style={{ position: 'absolute', left: 2 * PX, top: 0, width: PX, height: PX, background: visual.eyes }} />}
        {visual.spots && <div style={{ position: 'absolute', right: PX * 0.5, top: PX * 0.5, width: PX * 0.6, height: PX * 0.6, background: '#4ade80', opacity: 0.5 }} />}
      </div>

      {/* Sweat drops when nervous */}
      {nervous && nervousLevel > 0.3 && (
        <div style={{
          position: 'absolute', left: 5 * PX + 2, top: 2 * PX,
          width: 3, height: 5, background: '#7dd3fc',
          animation: `fp-sweat ${0.6 + (1 - nervousLevel) * 0.4}s ease-in infinite`,
          zIndex: 5,
        }} />
      )}

      {/* Eyes — scale up when nervous, spiral when dizzy */}
      {isDizzy ? (<>
        <div style={{ ...blk(2, 3, 1, 1, 'transparent'), zIndex: 2, fontSize: PX * 0.9, lineHeight: `${PX}px`, textAlign: 'center', color: visual.eyes }}>@</div>
        <div style={{ ...blk(4, 3, 1, 1, 'transparent'), zIndex: 2, fontSize: PX * 0.9, lineHeight: `${PX}px`, textAlign: 'center', color: visual.eyes }}>@</div>
      </>) : (<>
        <div style={{
          ...blk(2, 3, 1, 1, visual.eyes),
          transform: `translate(${eyeOffX}px, ${eyeOffY}px) scale(${eyeScale})`,
          transition: 'transform 0.1s',
        }} />
        <div style={{
          ...blk(4, 3, 1, 1, visual.eyes),
          transform: `translate(${eyeOffX}px, ${eyeOffY}px) scale(${eyeScale})`,
          transition: 'transform 0.1s',
        }} />
      </>)}

      {/* Angry brows */}
      {isAngry && (<>
        <div style={{ ...blk(2, 2, 1, 0.4, '#1a1a2e'), transform: 'rotate(15deg)', transformOrigin: 'left', zIndex: 2 }} />
        <div style={{ ...blk(4, 2, 1, 0.4, '#1a1a2e'), transform: 'rotate(-15deg)', transformOrigin: 'right', zIndex: 2 }} />
      </>)}

      {/* Mouth */}
      {mouthColor !== 'transparent' && (
        <div style={{
          position: 'absolute', left: 2.5 * PX, top: nervous ? 5 * PX : 4.5 * PX,
          width: 2 * PX, height: isAngry ? 2 : nervous ? 4 : 3,
          background: mouthColor,
          borderRadius: nervous ? '50%' : isAngry ? 0 : '0 0 3px 3px',
        }} />
      )}

      {/* Body */}
      <div style={blk(1, 6, 5, 4, visual.body)}>
        {visual.spots && (<>
          <div style={{ position: 'absolute', left: PX, top: PX, width: PX * 0.6, height: PX * 0.6, background: '#4ade80', opacity: 0.4 }} />
          <div style={{ position: 'absolute', left: 3 * PX, top: 2 * PX, width: PX * 0.6, height: PX * 0.6, background: '#4ade80', opacity: 0.4 }} />
        </>)}
      </div>

      {/* Arms */}
      {isZombie && !held && !falling ? (<>
        <div style={{ ...blk(0, 7, 1, 3, visual.body), transformOrigin: 'top center', animation: 'fp-zombieArms 1.5s ease-in-out infinite' }} />
        <div style={{ ...blk(6, 7, 1, 3, visual.body), transformOrigin: 'top center', animation: 'fp-zombieArms 1.5s ease-in-out infinite 0.2s' }} />
      </>) : falling ? (<>
        {/* Both arms shoot up in surprise */}
        <div style={{ ...blk(0, 7, 1, 3, visual.body), transformOrigin: 'top center', transform: 'rotate(-155deg)' }} />
        <div style={{ ...blk(6, 7, 1, 3, visual.body), transformOrigin: 'top center', transform: 'rotate(155deg)' }} />
      </>) : isFloating ? (<>
        {/* Enlightenment: arms spread peacefully wide */}
        <div style={{ ...blk(0, 7, 1, 3, visual.body), transformOrigin: 'top center', transform: 'rotate(-70deg)', transition: 'transform 0.4s ease' }} />
        <div style={{ ...blk(6, 7, 1, 3, visual.body), transformOrigin: 'top center', transform: 'rotate(70deg)', transition: 'transform 0.4s ease' }} />
      </>) : (<>
        {/* Left arm: hangs relaxed when held, walks otherwise */}
        <div style={{
          ...blk(0, 7, 1, 3, visual.body),
          transformOrigin: 'top center',
          animation: held ? 'none' : walkAnim('fp-armWalkL'),
          transform: held ? 'rotate(8deg)' : undefined,
          transition: held ? 'transform 0.15s' : undefined,
        }} />
        {/* Right arm: extends straight UP when held (hanging by one arm from peg) */}
        <div style={{
          ...blk(6, 7, 1, 3, visual.body),
          transformOrigin: 'top center',
          animation: held ? 'none' : walkAnim('fp-armWalkR'),
          transform: held ? 'rotate(-178deg)' : undefined,
          transition: held ? 'transform 0.12s' : undefined,
        }} />
      </>)}

      {/* Hands */}
      <div style={{
        ...blk(0, 10, 1, 1, visual.skin),
        animation: held || isZombie || falling || isFloating ? 'none' : walkAnim('fp-armWalkL'),
        transform: falling ? 'rotate(-155deg) translateX(-2px) translateY(-20px)' : held ? 'rotate(8deg)' : isFloating ? 'rotate(-70deg) translateX(-8px) translateY(-4px)' : undefined,
        transformOrigin: 'top center',
      }} />
      <div style={{
        ...blk(6, 10, 1, 1, visual.skin),
        animation: held || isZombie || falling || isFloating ? 'none' : walkAnim('fp-armWalkR'),
        transform: falling ? 'rotate(155deg) translateX(2px) translateY(-20px)' : held ? `rotate(-178deg) translateX(${PX}px) translateY(-${PX * 5}px)` : isFloating ? 'rotate(70deg) translateX(8px) translateY(-4px)' : undefined,
        transformOrigin: 'top center',
      }} />

      {/* Legs — dangle when held, lotus spread when enlightened */}
      <div style={{
        ...blk(2, 10, 1, 3, visual.legs),
        animation: isTapping ? 'fp-tap 0.5s ease-in-out infinite' : (held || isFloating) ? 'none' : walkAnim('fp-walkL'),
        transform: isFloating ? 'rotate(-55deg)' : held ? `rotate(${8 + Math.abs(tiltDeg) * 0.3}deg)` : undefined,
        transformOrigin: 'top center',
        transition: isFloating ? 'transform 0.4s ease' : held ? 'transform 0.15s' : undefined,
      }} />
      <div style={{
        ...blk(4, 10, 1, 3, visual.legs),
        animation: (held || isFloating) ? 'none' : walkAnim('fp-walkR'),
        transform: isFloating ? 'rotate(55deg)' : held ? `rotate(${-8 - Math.abs(tiltDeg) * 0.3}deg)` : undefined,
        transformOrigin: 'top center',
        transition: isFloating ? 'transform 0.4s ease' : held ? 'transform 0.15s' : undefined,
      }} />

      {/* Feet */}
      <div style={{ ...blk(1, 13, 2, 1, visual.feet), animation: isTapping ? 'fp-tap 0.5s ease-in-out infinite' : (held || isFloating) ? 'none' : walkAnim('fp-walkL'), transform: isFloating ? 'rotate(-55deg) translateX(-4px) translateY(-4px)' : undefined, transformOrigin: 'top center' }} />
      <div style={{ ...blk(4, 13, 2, 1, visual.feet), animation: (held || isFloating) ? 'none' : walkAnim('fp-walkR'), transform: isFloating ? 'rotate(55deg) translateX(4px) translateY(-4px)' : undefined, transformOrigin: 'top center' }} />

      {/* Aura */}
      {visual.aura !== 'none' && !held && (
        <div style={{
          position: 'absolute', inset: -8, borderRadius: '50%', pointerEvents: 'none', zIndex: -1,
          animation: 'fp-auraGlow 2s ease-in-out infinite',
          background: visual.aura === 'rainbow' ? 'conic-gradient(from 0deg, rgba(239,68,68,0.15), rgba(251,191,36,0.15), rgba(34,197,94,0.15), rgba(59,130,246,0.15), rgba(168,85,247,0.15), rgba(239,68,68,0.15))'
            : visual.aura === 'fire' ? 'radial-gradient(ellipse, rgba(239,68,68,0.2) 0%, rgba(251,191,36,0.1) 50%, transparent 70%)'
            : visual.aura === 'green' ? 'radial-gradient(ellipse, rgba(34,197,94,0.2) 0%, transparent 70%)'
            : visual.aura === 'electric' ? 'radial-gradient(ellipse, rgba(251,191,36,0.2) 0%, transparent 70%)'
            : 'radial-gradient(ellipse, rgba(168,85,247,0.2) 0%, transparent 70%)',
        }} />
      )}

      {/* Sparks */}
      {visual.sparks && !held && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 5 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute', left: [5, 25, 15][i], top: [10, 30, 50][i],
              width: 3, height: 3, background: '#fbbf24',
              '--sx': `${[-8, 10, -6][i]}px`, '--sy': `${[-12, -8, -14][i]}px`,
              animation: 'fp-spark 0.6s ease-out infinite', animationDelay: `${i * 0.25}s`,
            } as React.CSSProperties} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DUST CLOUD (landing particles)
// ═══════════════════════════════════════════════════════════════════════════════

function DustCloud({ x, y, intensity }: { x: number; y: number; intensity: number }) {
  const count = 4 + Math.floor(intensity * 8);
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const dist = 12 + intensity * 45;
    return {
      dx: Math.cos(angle) * dist * (0.7 + Math.random() * 0.6),
      dy: Math.sin(angle) * dist * 0.4 - intensity * 15 - Math.random() * 10,
      size: 3 + Math.random() * (2 + intensity * 5),
      delay: Math.random() * 0.08,
      dur: 0.35 + intensity * 0.25 + Math.random() * 0.15,
    };
  });
  return (
    <div style={{ position: 'fixed', left: x, top: y, pointerEvents: 'none', zIndex: 10001 }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', width: p.size, height: p.size,
          background: `rgba(255,255,255,${0.12 + intensity * 0.18})`,
          '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
          animation: `fp-dustPart ${p.dur}s ease-out forwards`,
          animationDelay: `${p.delay}s`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLYING FOOD / SPEECH BUBBLE
// ═══════════════════════════════════════════════════════════════════════════════

function FlyingFood({ emoji, fromX, fromY, toX, toY }: { emoji: string; fromX: number; fromY: number; toX: number; toY: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.style.transition = 'transform 0.38s cubic-bezier(.22,1,.36,1), opacity 0.2s ease-in 0.18s';
      el.style.transform = `translate(${toX - fromX}px, ${toY - fromY}px) scale(0.25)`;
      el.style.opacity = '0';
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={ref} style={{ position: 'absolute', left: fromX, top: fromY, fontSize: 20, pointerEvents: 'none', zIndex: 30, transform: 'scale(1.15)', opacity: 1, lineHeight: 1 }}>
      {emoji}
    </div>
  );
}

function SpeechBubble({ text, x, y, dur = 2.2 }: { text: string; x: number; y: number; dur?: number }) {
  return (
    <div style={{ position: 'fixed', left: x, top: y - 50, transform: 'translateX(-50%)', zIndex: 10000, pointerEvents: 'none', animation: `fp-speech ${dur}s ease-out forwards` }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)', color: '#1a1a2e', fontSize: 12,
        fontFamily: '"Comic Sans MS","Chalkboard SE",cursive', fontWeight: 700,
        padding: '4px 9px', borderRadius: 7, whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)', position: 'relative',
      }}>
        {text}
        <div style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid rgba(255,255,255,0.95)' }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// HOLE DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

function HoleSvg({ active }: { active: boolean }) {
  const RX = HOLE_RX;
  const RY = HOLE_RY;
  const SW = HOLE_SVG_W;
  const SH = HOLE_SVG_PAD_TOP + RY * 2 + 8;  // 44px tall
  const CX = HOLE_SVG_CX;
  const CY = HOLE_SVG_CY;
  const gc = '#0d0e13';  // ground mid-tone for feather gradient

  return (
    <svg
      width={SW} height={SH}
      viewBox={`0 0 ${SW} ${SH}`}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        {/* Deep void interior — slight purple tint at center for depth illusion */}
        <radialGradient id="fp-hv" cx="50%" cy="22%" r="55%">
          <stop offset="0%"   stopColor={active ? '#1c0b35' : '#080410'} />
          <stop offset="38%"  stopColor="#030108" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>

        {/* Ground feather — fades void edge into ground surface */}
        <radialGradient id="fp-hf" cx="50%" cy="50%" r="50%">
          <stop offset="40%"  stopColor={gc} stopOpacity="0"   />
          <stop offset="57%"  stopColor={gc} stopOpacity="0.25"/>
          <stop offset="71%"  stopColor={gc} stopOpacity="0.60"/>
          <stop offset="83%"  stopColor={gc} stopOpacity="0.87"/>
          <stop offset="95%"  stopColor={gc} stopOpacity="1"   />
        </radialGradient>

        {/* Soft blur (ambient-occlusion shadow, inner wall) */}
        <filter id="fp-hbl" x="-50%" y="-80%" width="200%" height="260%">
          <feGaussianBlur stdDeviation="3" />
        </filter>

        {/* Larger blur for portal glow */}
        <filter id="fp-hgl" x="-120%" y="-250%" width="340%" height="600%">
          <feGaussianBlur stdDeviation="10" />
        </filter>

        {/* Clip to the void ellipse (for inner wall shadow) */}
        <clipPath id="fp-hcp">
          <ellipse cx={CX} cy={CY} rx={RX} ry={RY} />
        </clipPath>
      </defs>

      {/* ── Ambient-occlusion shadow cast on the ground surface ── */}
      <ellipse
        cx={CX} cy={CY + RY * 0.55}
        rx={RX + 13} ry={RY + 6}
        fill="rgba(0,0,0,0.68)"
        filter="url(#fp-hbl)"
      />

      {/* ── Portal glow rising from below (active only) ── */}
      {active && (
        <ellipse
          cx={CX} cy={CY - 2}
          rx={RX + 4} ry={RY + 2}
          fill="rgba(145,55,255,0.32)"
          filter="url(#fp-hgl)"
          style={{ animation: 'fp-holePulse 0.9s ease-in-out infinite' }}
        />
      )}

      {/* ── Dark void interior ── */}
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="url(#fp-hv)" />

      {/* ── Inner-wall shadow: rim casts a shadow into the hole top ── */}
      <ellipse
        cx={CX} cy={CY - RY * 0.12}
        rx={RX - 4} ry={RY - 1}
        fill="none"
        stroke="rgba(0,0,0,0.92)"
        strokeWidth="7"
        clipPath="url(#fp-hcp)"
        filter="url(#fp-hbl)"
      />

      {/* ── Ground feather overlay — blends hole edge into floor ── */}
      <ellipse
        cx={CX} cy={CY}
        rx={RX + HOLE_SVG_PAD_X - 3} ry={RY + 9}
        fill="url(#fp-hf)"
      />

      {/* ── Rim: ambient light on the top lip of the hole ── */}
      <path
        d={`M ${CX - RX + 6} ${CY} A ${RX - 6} ${RY - 1.5} 0 0 1 ${CX + RX - 6} ${CY}`}
        fill="none"
        stroke={active ? 'rgba(210,155,255,0.50)' : 'rgba(255,255,255,0.09)'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* ── Active: glowing rim ring ── */}
      {active && (
        <ellipse
          cx={CX} cy={CY}
          rx={RX + 1} ry={RY + 0.5}
          fill="none"
          stroke="rgba(175,85,255,0.65)"
          strokeWidth="1.5"
          filter="url(#fp-hbl)"
          style={{ animation: 'fp-holePulse 0.9s ease-in-out infinite' }}
        />
      )}
    </svg>
  );
}

export default function FooterPlayground({ onHoleFall, gameOpen }: { onHoleFall?: () => void; gameOpen?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep a stable ref so handleHoleFall closure doesn't go stale
  const onHoleFallRef = useRef(onHoleFall);
  useEffect(() => { onHoleFallRef.current = onHoleFall; }, [onHoleFall]);

  const [traits, setTraits] = useState<Traits>(loadTraits);
  const traitsRef = useRef(traits);
  const visual = computeVisual(traits);
  useEffect(() => { traitsRef.current = traits; saveTraits(traits); }, [traits]);

  const [explorerX, setExplorerX] = useState(0);
  const xRef = useRef(0);
  const [facingLeft, setFacingLeft] = useState(false);
  const facingRef = useRef(false);
  const [walking, setWalking] = useState(false);
  const [walkSpeed, setWalkSpeed] = useState(1);  // normalized 0-1 for animation cadence
  const walkTargetRef = useRef<number | null>(null);
  const walkVelRef = useRef(0);                   // current px/s signed velocity
  const walkRafRef = useRef(0);
  const lastWalkTRef = useRef(0);

  // Stable refs for auto-fall sequence (walk-to-hole when all items maxed)
  const shouldFallWhenArrivingRef = useRef(false);
  const handleHoleFallRef = useRef<((hf: { x: number; y: number }) => void) | null>(null);
  const startWalkRef = useRef<((tx: number) => void) | null>(null);
  // Prevent re-triggering if traits are already all-maxed on page load
  const autoFallFiredRef = useRef(
    traits.m >= MAX_FEED && traits.b >= MAX_FEED && traits.p >= MAX_FEED
  );

  const [dragPhase, setDragPhase] = useState<DragPhase>('none');
  const dragPhaseRef = useRef<DragPhase>('none');
  const physRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const cursorRef = useRef({ x: 0, y: 0 });
  const physRafRef = useRef(0);
  const [physPos, setPhysPos] = useState({ x: 0, y: 0 });
  const [tiltDeg, setTiltDeg] = useState(0);
  const flungStartYRef = useRef(0);

  const [falling, setFalling] = useState(false);
  const [spawning, setSpawning] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [squashLanding, setSquashLanding] = useState(false);

  const [nervousLevel, setNervousLevel] = useState(0);
  const lastNervousSoundRef = useRef(0);

  const [bubbles, setBubbles] = useState<Array<{ id: number; text: string; x: number; y: number; dur?: number }>>([]);
  const bubbleIdRef = useRef(0);
  const addBubble = useCallback((text: string, x: number, y: number, dur = 2.2) => {
    const id = ++bubbleIdRef.current;
    setBubbles(prev => [...prev, { id, text, x, y, dur }]);
    setTimeout(() => setBubbles(prev => prev.filter(b => b.id !== id)), dur * 1000 + 200);
  }, []);

  const [dustClouds, setDustClouds] = useState<Array<{ id: number; x: number; y: number; intensity: number }>>([]);
  const addDust = useCallback((x: number, y: number, fallDist: number) => {
    const intensity = Math.min(1, Math.max(0, fallDist / 500));
    const id = ++bubbleIdRef.current;
    setDustClouds(prev => [...prev, { id, x, y, intensity }]);
    setTimeout(() => setDustClouds(prev => prev.filter(d => d.id !== id)), 1200);
  }, []);

  const [cooldowns, setCooldowns] = useState<Set<string>>(new Set());
  const [flyingFood, setFlyingFood] = useState<{ emoji: string; fromX: number; fromY: number; toX: number; toY: number } | null>(null);

  const [idlePhase, setIdlePhase] = useState<IdlePhase>('still');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastActionRef = useRef(Date.now());

  const clicksRef = useRef<number[]>([]);
  const [mood, setMood] = useState<Mood>('neutral');
  const moodTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [nameReveal, setNameReveal] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [eyeOff, setEyeOff] = useState({ x: 0, y: 0 });

  const setDragPhase_ = useCallback((p: DragPhase) => { dragPhaseRef.current = p; setDragPhase(p); }, []);

  const getGroundFixed = useCallback(() => {
    const r = containerRef.current?.getBoundingClientRect();
    return r ? r.top + CHAR_GROUND_TOP : window.innerHeight - GROUND_H - CHAR_H;
  }, []);
  const getHoleCenterFixed = useCallback(() => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: r.left + HOLE_FRAC * r.width, y: r.top + GROUND_Y };
  }, []);

  // ── Idle behavior ──
  const scheduleIdle = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    if (Date.now() - lastActionRef.current < 2000) {
      idleTimerRef.current = setTimeout(() => scheduleIdle(), 2000);
      return;
    }
    const beh = visual.behavior;
    const phases: IdlePhase[] = beh === 'zombie' ? ['tap', 'look'] : beh === 'hyper' ? ['jump', 'jump', 'look', 'think'] : ['tap', 'think', 'jump', 'look'];
    const next = phases[Math.floor(Math.random() * phases.length)];
    setIdlePhase(next);
    const dur = next === 'tap' ? 1800 : next === 'think' ? 3000 : next === 'jump' ? 800 : 1200;
    idleTimerRef.current = setTimeout(() => {
      setIdlePhase('still');
      idleTimerRef.current = setTimeout(() => scheduleIdle(), (beh === 'hyper' ? 1500 : 3000) + Math.random() * 4000);
    }, dur);
  }, [visual.behavior]);

  const resetIdleTimer = useCallback(() => {
    lastActionRef.current = Date.now();
    setIdlePhase('still');
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => scheduleIdle(), 3500 + Math.random() * 3000);
  }, [scheduleIdle]);

  // ── Walk ──
  const stopWalk = useCallback(() => {
    walkTargetRef.current = null; walkVelRef.current = 0;
    setWalking(false); setWalkSpeed(1);
    cancelAnimationFrame(walkRafRef.current); resetIdleTimer();
  }, [resetIdleTimer]);

  const walkLoop = useCallback((now: number) => {
    if (dragPhaseRef.current !== 'none') return;
    const target = walkTargetRef.current;
    if (target === null) { stopWalk(); return; }
    const dt = Math.min((now - lastWalkTRef.current) / 1000, 0.05);
    lastWalkTRef.current = now;
    const cur = xRef.current;
    const dist = target - cur;
    if (Math.abs(dist) <= WALK_STOP) {
      xRef.current = target; setExplorerX(target); stopWalk();
      if (shouldFallWhenArrivingRef.current) {
        shouldFallWhenArrivingRef.current = false;
        handleHoleFallRef.current?.(getHoleCenterFixed());
      }
      return;
    }

    const dir = Math.sign(dist);
    const absDist = Math.abs(dist);
    const topSpeed = WALK_SPEED_MAX * visual.walkMul;

    // Deceleration: clamp max speed so we can stop cleanly at target
    const brakingSpeed = Math.sqrt(2 * WALK_ACCEL * absDist);
    const targetSpeed = Math.min(topSpeed, brakingSpeed);

    // Accelerate/decelerate toward targetSpeed
    let vel = walkVelRef.current;
    if (Math.abs(vel) < targetSpeed) {
      vel += dir * WALK_ACCEL * dt;
      // Don't overshoot target speed
      if (Math.abs(vel) > targetSpeed) vel = dir * targetSpeed;
    } else if (Math.abs(vel) > targetSpeed) {
      vel -= dir * WALK_ACCEL * dt;
      if (Math.abs(vel) < targetSpeed) vel = dir * targetSpeed;
    }
    walkVelRef.current = vel;

    const step = Math.sign(dist) * Math.min(Math.abs(vel * dt), absDist);
    xRef.current += step; setExplorerX(xRef.current);

    // Normalized speed for walk animation cadence (0.3 = slow shamble, 1 = full sprint)
    const speedFrac = Math.max(0.25, Math.abs(vel) / topSpeed);
    setWalkSpeed(speedFrac);

    const f = dist < 0;
    if (f !== facingRef.current) { facingRef.current = f; setFacingLeft(f); }
    walkRafRef.current = requestAnimationFrame(walkLoop);
  }, [stopWalk, visual.walkMul, getHoleCenterFixed]);

  const startWalk = useCallback((tx: number) => {
    if (dragPhaseRef.current !== 'none' || falling || spawning) return;
    cancelAnimationFrame(walkRafRef.current);
    walkTargetRef.current = tx; lastWalkTRef.current = performance.now();
    setWalking(true); resetIdleTimer();
    walkRafRef.current = requestAnimationFrame(walkLoop);
  }, [walkLoop, falling, spawning, resetIdleTimer]);

  // ── Physics ──
  const physicsLoop = useCallback(() => {
    const ph = physRef.current;
    const phase = dragPhaseRef.current;

    if (phase === 'held') {
      // Character hangs BELOW cursor (one-arm clinging)
      const targetX = cursorRef.current.x - CHAR_W / 2;
      const targetY = cursorRef.current.y + HANG_OFFSET_Y;
      const fx = (targetX - ph.x) * SPRING_K;
      const fy = (targetY - ph.y) * SPRING_K;
      ph.vx = (ph.vx + fx) * DAMPING;
      ph.vy = (ph.vy + fy) * DAMPING;
      ph.x += ph.vx; ph.y += ph.vy;
      setPhysPos({ x: ph.x, y: ph.y });
      setTiltDeg(Math.max(-MAX_TILT, Math.min(MAX_TILT, ph.vx * TILT_SCALE)));

      // Nervous detection: how far above the footer?
      const groundFx = getGroundFixed();
      const distAbove = groundFx - (ph.y + CHAR_H);
      const nLevel = Math.max(0, Math.min(1, distAbove / 750));
      setNervousLevel(nLevel);

      // Nervous whimper
      if (nLevel > 0.3) {
        const now = performance.now();
        if (now - lastNervousSoundRef.current > 1200 + (1 - nLevel) * 2000) {
          lastNervousSoundRef.current = now;
          playNervousWhimper();
          const bx = ph.x + CHAR_W / 2;
          const nervous_texts = ['😰', '😱', '😨', '🥺', '😬', '💦'];
          addBubble(nervous_texts[Math.floor(Math.random() * nervous_texts.length)], bx, ph.y, 1.2);
        }
      }

      physRafRef.current = requestAnimationFrame(physicsLoop);
    } else if (phase === 'flung') {
      ph.vy += GRAVITY_PF;
      ph.vx *= AIR_FRICTION;
      ph.x += ph.vx; ph.y += ph.vy;

      const vw = window.innerWidth;
      if (ph.x < 0) { ph.x = 0; ph.vx = Math.abs(ph.vx) * BOUNCE; }
      if (ph.x > vw - CHAR_W) { ph.x = vw - CHAR_W; ph.vx = -Math.abs(ph.vx) * BOUNCE; }
      if (ph.y < 0) { ph.y = 0; ph.vy = Math.abs(ph.vy) * BOUNCE; }

      const groundFixed = getGroundFixed();
      const holeFx = getHoleCenterFixed();
      const charCX = ph.x + CHAR_W / 2;

      if (ph.y + CHAR_H >= groundFixed && Math.abs(charCX - holeFx.x) < HOLE_HIT_R && Math.abs(ph.y + CHAR_H - holeFx.y) < HOLE_HIT_R * 1.5) {
        handleHoleFall(holeFx); return;
      }

      if (ph.y >= groundFixed) {
        const fallDist = ph.y - flungStartYRef.current;
        ph.y = groundFixed;
        ph.vy = -Math.abs(ph.vy) * BOUNCE;

        if (Math.abs(ph.vy) < 3 && Math.abs(ph.vx) < 3) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) { const sx = Math.max(8, Math.min(rect.width - CHAR_W - 8, ph.x - rect.left)); xRef.current = sx; setExplorerX(sx); }
          setDragPhase_('none'); setTiltDeg(0); setNervousLevel(0);
          addDust(ph.x + CHAR_W / 2, ph.y + CHAR_H, Math.max(0, fallDist));
          if (fallDist > 80) { setSquashLanding(true); setTimeout(() => setSquashLanding(false), 400); }
          resetIdleTimer(); return;
        } else {
          addDust(ph.x + CHAR_W / 2, ph.y + CHAR_H, Math.max(0, fallDist) * 0.4);
        }
      }

      setPhysPos({ x: ph.x, y: ph.y });
      setTiltDeg(Math.max(-MAX_TILT, Math.min(MAX_TILT, ph.vx * TILT_SCALE)));
      physRafRef.current = requestAnimationFrame(physicsLoop);
    }
  }, [getGroundFixed, getHoleCenterFixed, setDragPhase_, addDust, addBubble, resetIdleTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHoleFall = useCallback((holeFx: { x: number; y: number }) => {
    cancelAnimationFrame(physRafRef.current);
    setDragPhase_('falling'); setFalling(true); setNervousLevel(0);
    setPhysPos({ x: holeFx.x - CHAR_W / 2, y: holeFx.y - CHAR_H }); setTiltDeg(0);
    playYelp(); addBubble('!!!', holeFx.x, holeFx.y - 20);
    // Open the game modal after the fall-in animation starts
    setTimeout(() => onHoleFallRef.current?.(), 350);
    setTimeout(() => {
      setFalling(false);
      const rect = containerRef.current?.getBoundingClientRect();
      const cw = rect?.width ?? 600;
      const rx = cw / 2 - CHAR_W / 2;
      xRef.current = rx; setExplorerX(rx); setSpawning(true);
      addDust((rect?.left ?? 0) + rx + CHAR_W / 2, (rect?.top ?? 0) + CHAR_GROUND_TOP + CHAR_H, 0.4);
      setTimeout(() => { setSpawning(false); setDragPhase_('none'); resetIdleTimer(); }, 500);
    }, 1400);
  }, [setDragPhase_, addBubble, addDust, resetIdleTimer]);

  // Keep stable refs in sync so walkLoop can safely call these without stale closures
  useEffect(() => { handleHoleFallRef.current = handleHoleFall; }, [handleHoleFall]);
  useEffect(() => { startWalkRef.current = startWalk; }, [startWalk]);

  // ── Pointer handlers ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (dragPhaseRef.current === 'falling') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    cancelAnimationFrame(walkRafRef.current); cancelAnimationFrame(physRafRef.current);
    setWalking(false); walkTargetRef.current = null;

    const rect = containerRef.current?.getBoundingClientRect();
    const startX = rect ? rect.left + xRef.current : e.clientX - CHAR_W / 2;
    const startY = rect ? rect.top + CHAR_GROUND_TOP : e.clientY;

    physRef.current = { x: startX, y: startY, vx: 0, vy: 0 };
    cursorRef.current = { x: e.clientX, y: e.clientY };
    setPhysPos({ x: startX, y: startY });
    setDragPhase_('held'); resetIdleTimer();
    physRafRef.current = requestAnimationFrame(physicsLoop);
  }, [setDragPhase_, physicsLoop, resetIdleTimer]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragPhaseRef.current !== 'held') return;
    cursorRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragPhaseRef.current !== 'held') return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    flungStartYRef.current = physRef.current.y;
    setDragPhase_('flung'); setNervousLevel(0);
  }, [setDragPhase_]);

  // ── Click personality ──
  const handleExplorerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragPhaseRef.current !== 'none') return;
    const now = Date.now();
    clicksRef.current = clicksRef.current.filter(t => now - t < 4000);
    clicksRef.current.push(now);
    const count = clicksRef.current.length;
    const rect = containerRef.current?.getBoundingClientRect();
    const bx = (rect?.left ?? 0) + xRef.current + CHAR_W / 2;
    const by = (rect?.top ?? 0) + CHAR_GROUND_TOP;
    clearTimeout(moodTimerRef.current);
    if (count <= 2) { setMood('happy'); playGiggle(); addBubble('😊', bx, by, 1.5); }
    else if (count <= 4) { setMood('happy'); playGiggle(); addBubble('😄', bx, by, 1.5); }
    else if (count <= 6) { setMood('annoyed'); addBubble('😒', bx, by, 1.8); }
    else { setMood('angry'); playAngrySound(); addBubble('😠', bx, by, 2); }
    moodTimerRef.current = setTimeout(() => setMood('neutral'), 3000);
    resetIdleTimer();
  }, [addBubble, resetIdleTimer]);

  const handleSceneClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragPhaseRef.current !== 'none' || falling || spawning) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (e.clientY - rect.top < 30) return;
    const tx = Math.max(8, Math.min(rect.width - CHAR_W - 8, e.clientX - rect.left - CHAR_W / 2));
    startWalk(tx);
  }, [startWalk, falling, spawning]);

  // ── Feed food ──
  const handleFeed = useCallback((foodId: string, emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cooldowns.has(foodId) || dragPhaseRef.current !== 'none' || falling || spawning) return;
    const key = foodId as keyof Traits;
    if (traitsRef.current[key] >= MAX_FEED) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const el = e.currentTarget as HTMLElement;
    const fr = el.getBoundingClientRect();
    const fromX = fr.left + fr.width / 2 - (rect?.left ?? 0);
    const fromY = fr.top + fr.height / 2 - (rect?.top ?? 0);
    const toX = xRef.current + CHAR_W / 2;
    const toY = CHAR_GROUND_TOP + CHAR_H / 2;

    setCooldowns(prev => new Set([...prev, foodId]));
    setFlyingFood({ emoji, fromX, fromY, toX, toY });
    setTimeout(() => setFlyingFood(null), 420);

    setTimeout(() => {
      playEatSound();
      setFlashing(true);
      setTimeout(() => {
        setFlashing(false);
        const prev = traitsRef.current;
        const next = { ...prev, [key]: Math.min(prev[key] + 1, MAX_FEED) };
        setTraits(next);

        // If every item is now maxed, walk to the hole and jump in
        if (next.m >= MAX_FEED && next.b >= MAX_FEED && next.p >= MAX_FEED && !autoFallFiredRef.current) {
          autoFallFiredRef.current = true;
          shouldFallWhenArrivingRef.current = true;
          const cRect = containerRef.current?.getBoundingClientRect();
          if (cRect) {
            const holeTargetX = HOLE_FRAC * cRect.width - CHAR_W / 2;
            // Delay so the transformation bubble & name reveal can play before the character runs off
            setTimeout(() => startWalkRef.current?.(holeTargetX), 2500);
          }
        }

        const prevVis = computeVisual(prev);
        const nextVis = computeVisual(next);
        if (nextVis.name !== prevVis.name) {
          playFormSound();
          setNameReveal(nextVis.name);
          setTimeout(() => setNameReveal(null), 3000);
        }
        // Behavioral reaction bubbles
        if (nextVis.behavior !== prevVis.behavior && nextVis.behavior !== 'normal') {
          const br = containerRef.current?.getBoundingClientRect();
          const bx2 = (br?.left ?? 0) + xRef.current + CHAR_W / 2;
          const by2 = (br?.top ?? 0) + CHAR_GROUND_TOP;
          const behaviorLines: Record<string, string> = {
            zombie: '🧟', hyper: '⚡', giant: '😳',
            tiny: '🐭', dizzy: '💫', floating: '✨',
          };
          setTimeout(() => addBubble(behaviorLines[nextVis.behavior] || '!', bx2, by2, 2), 300);
        }
      }, 200);
    }, 380);

    setTimeout(() => setCooldowns(prev => { const n = new Set(prev); n.delete(foodId); return n; }), 1200);
    resetIdleTimer();
  }, [cooldowns, falling, spawning, resetIdleTimer, addBubble]);

  // ── Eye tracking ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + xRef.current + CHAR_W / 2;
      const cy = rect.top + CHAR_GROUND_TOP + 3 * PX;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) { setEyeOff({ x: 0, y: 0 }); return; }
      const s = Math.min(1, dist / 200);
      // Negate x when facing left (sprite is scaleX(-1), so offset would flip otherwise)
      const xDir = facingRef.current ? -1 : 1;
      setEyeOff({ x: Math.round(dx / dist * s * 2) * xDir, y: Math.round(dy / dist * s * 1.5) });
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // ── Entrance ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !entered) {
        setEntered(true);
        const startX = el.clientWidth / 2 - CHAR_W / 2;
        xRef.current = startX; setExplorerX(startX);
        setSpawning(true);
        setTimeout(() => { setSpawning(false); resetIdleTimer(); }, 500);
        setTimeout(() => { setShowHint(true); setTimeout(() => setShowHint(false), 3200); }, 900);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [entered, resetIdleTimer]);

  useEffect(() => () => {
    cancelAnimationFrame(walkRafRef.current); cancelAnimationFrame(physRafRef.current);
    clearTimeout(idleTimerRef.current); clearTimeout(moodTimerRef.current);
  }, []);

  // ── Idle thought bubbles ──
  const thinkRef = useRef(false);
  useEffect(() => {
    if (idlePhase === 'think' && !thinkRef.current) {
      thinkRef.current = true;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const bx = rect.left + xRef.current + CHAR_W / 2;
        const by = rect.top + CHAR_GROUND_TOP;
        const thoughts = ['⬆', '↑', '☝️', '⬆', '↑', '⬆'];
        addBubble(thoughts[Math.floor(Math.random() * thoughts.length)], bx, by, 2.8);
      }
    } else if (idlePhase !== 'think') thinkRef.current = false;
  }, [idlePhase, addBubble, visual.behavior]);

  useEffect(() => {
    if (idlePhase === 'look') {
      const flip = () => { facingRef.current = !facingRef.current; setFacingLeft(facingRef.current); };
      flip(); const t = setTimeout(flip, 600); return () => clearTimeout(t);
    }
  }, [idlePhase]);

  // ── Render ──
  const isPhysics = dragPhase === 'held' || dragPhase === 'flung' || dragPhase === 'falling';
  const isHoleActive = dragPhase === 'held' || dragPhase === 'flung';
  const total = traits.m + traits.b + traits.p;

  // Rays fan from -75° to +75° (0° = straight up), purple-blue-cyan portal palette
  const RAY_PARTICLES = [
    { id: 0,  angle: -72, dur: '1.4s', delay: '0s',    w: 2, h: 22, color: '#22d3ee' },
    { id: 1,  angle: -50, dur: '1.1s', delay: '0.28s', w: 3, h: 16, color: '#818cf8' },
    { id: 2,  angle: -28, dur: '1.7s', delay: '0.6s',  w: 2, h: 26, color: '#a78bfa' },
    { id: 3,  angle:  -6, dur: '1.25s', delay: '0.85s', w: 3, h: 20, color: '#60a5fa' },
    { id: 4,  angle:  15, dur: '1.15s', delay: '0.08s', w: 2, h: 24, color: '#c084fc' },
    { id: 5,  angle:  37, dur: '1.5s', delay: '0.42s', w: 3, h: 18, color: '#22d3ee' },
    { id: 6,  angle:  58, dur: '1.05s', delay: '0.72s', w: 2, h: 20, color: '#818cf8' },
    { id: 7,  angle:  74, dur: '1.65s', delay: '1.0s',  w: 2, h: 15, color: '#a78bfa' },
    { id: 8,  angle: -42, dur: '1.3s', delay: '1.18s', w: 2, h: 14, color: '#60a5fa' },
    { id: 9,  angle:  24, dur: '1.1s', delay: '1.35s', w: 2, h: 18, color: '#c084fc' },
  ];

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: SCENE_H, overflow: 'visible' }} onClick={handleSceneClick}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 80% at 20% 60%, rgba(41,128,185,0.05) 0%, transparent 70%), radial-gradient(ellipse 50% 70% at 75% 50%, rgba(125,60,152,0.04) 0%, transparent 70%)' }} />

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: GROUND_H, background: 'linear-gradient(180deg, #111218 0%, #0d0e13 40%, #0a0b0f 100%)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
          {/* Hole — positioned so SVG's CY lands right at the ground surface */}
          <div style={{
            position: 'absolute',
            left: `${HOLE_FRAC * 100}%`,
            top: -HOLE_SVG_CY,
            transform: 'translateX(-50%)',
            width: HOLE_SVG_W,
            pointerEvents: 'none',
            overflow: 'visible',
          }}>
            <HoleSvg active={isHoleActive} />
            {/* Portal ray burst — rays emanate from hole opening when character is held/flung */}
            {isHoleActive && (
              <div style={{
                position: 'absolute',
                left: HOLE_SVG_CX,
                top: HOLE_SVG_PAD_TOP,
                width: 0, height: 0,
                pointerEvents: 'none',
              }}>
                {RAY_PARTICLES.map(r => (
                  <div key={r.id} style={{
                    position: 'absolute',
                    left: -r.w / 2,
                    top: -r.h,
                    width: r.w,
                    height: r.h,
                    transformOrigin: `${r.w / 2}px ${r.h}px`,
                    background: `linear-gradient(to top, ${r.color}cc 0%, ${r.color}55 55%, transparent 100%)`,
                    boxShadow: `0 0 ${r.w + 3}px ${r.w + 1}px ${r.color}44`,
                    borderRadius: '50% 50% 20% 20%',
                    '--ra': `${r.angle}deg`,
                    animation: `fp-rayRise ${r.dur} ease-out ${r.delay} infinite`,
                  } as React.CSSProperties} />
                ))}
              </div>
            )}
          </div>
          {[{ left: '40%', w: 12, h: 8, c: '#1a1b22' }, { left: '55%', w: 8, h: 5, c: '#181920' }, { left: '82%', w: 14, h: 9, c: '#1c1d25' }, { left: '10%', w: 10, h: 6, c: '#191a21' }].map((r, i) => (
            <div key={i} style={{ position: 'absolute', left: r.left, bottom: 5, width: r.w, height: r.h, background: r.c, borderRadius: '40% 40% 20% 20%', border: '1px solid rgba(255,255,255,0.03)' }} />
          ))}
          {[14, 36, 50, 68, 88].map((pct, i) => (
            <div key={i} style={{ position: 'absolute', left: `${pct}%`, bottom: GROUND_H - 10, display: 'flex', gap: 2 }}>
              {[3, 5, 3].map((h, j) => (<div key={j} style={{ width: 2, height: h, background: `rgba(255,255,255,${0.04 + j * 0.01})`, animation: `fp-grassWave ${1.4 + i * 0.3}s ease-in-out infinite`, animationDelay: `${j * 0.2}s`, transformOrigin: 'bottom center' }} />))}
            </div>
          ))}
        </div>

        {/* Food pile */}
        <div style={{ position: 'absolute', right: 20, top: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, zIndex: 20 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {FOODS.map(food => {
              const count = traits[food.id as keyof Traits];
              const disabled = cooldowns.has(food.id) || count >= MAX_FEED;
              return (
                <div key={food.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div title={`${food.label} (${count}/${MAX_FEED})`} onClick={e => handleFeed(food.id, food.emoji, e)}
                    style={{ fontSize: 19, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.25 : 1, transition: 'opacity 0.3s, transform 0.12s', userSelect: 'none', lineHeight: 1, filter: count >= MAX_FEED ? 'grayscale(0.8)' : 'none' }}
                    onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'scale(1.3) translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>
                    {food.emoji}
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: MAX_FEED }).map((_, i) => (
                      <div key={i} style={{ width: 3, height: 3, background: i < count ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)', borderRadius: '50%', transition: 'background 0.3s' }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {total > 0 && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginTop: 1, userSelect: 'none' }}>{visual.name}</div>}
        </div>

        {/* Explorer */}
        <div
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
          onClick={handleExplorerClick}
          style={isPhysics ? {
            position: 'fixed', left: physPos.x, top: physPos.y, zIndex: 9999,
            opacity: gameOpen ? 0 : 1,
            filter: dragPhase === 'held' ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.6))' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
            willChange: 'left, top', touchAction: 'none',
            pointerEvents: (gameOpen || dragPhase === 'falling') ? 'none' : 'auto',
          } : {
            position: 'absolute', left: explorerX, top: visual.behavior === 'floating' ? CHAR_GROUND_TOP - 55 : CHAR_GROUND_TOP, zIndex: 10, touchAction: 'none',
            opacity: gameOpen ? 0 : 1,
            transition: 'top 1.2s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
          }}
        >
          {showHint && dragPhase === 'none' && (
            <div style={{ position: 'absolute', left: '50%', bottom: CHAR_H + 6, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', letterSpacing: '0.06em', pointerEvents: 'none', animation: 'fp-hintFade 3.2s ease-out forwards' }}>↑ drag me</div>
          )}
          {nameReveal && (
            <div style={{ position: 'absolute', left: '50%', bottom: CHAR_H + 10, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', letterSpacing: '0.08em', pointerEvents: 'none', animation: 'fp-nameReveal 3s ease-out forwards' }}>✦ {nameReveal} ✦</div>
          )}
          {dragPhase === 'held' && (
            <div style={{ position: 'absolute', left: '50%', bottom: -14, transform: 'translateX(-50%)', width: 24, height: 8, background: 'radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)', borderRadius: '50%' }} />
          )}
          <div style={{ transform: `scaleX(${facingLeft ? -1 : 1})`, transition: 'transform 0.08s ease', transformOrigin: 'center bottom' }}>
            <ExplorerSprite
              visual={visual} walking={walking && dragPhase === 'none'} walkSpeed={walkSpeed}
              held={dragPhase === 'held'} falling={falling} flashing={flashing} spawning={spawning}
              mood={mood} idlePhase={dragPhase === 'none' && !walking ? idlePhase : 'still'}
              tiltDeg={tiltDeg} eyeOffX={eyeOff.x} eyeOffY={eyeOff.y}
              nervousLevel={nervousLevel} squashLanding={squashLanding}
            />
          </div>
        </div>

        {/* Dust clouds */}
        {dustClouds.map(d => <DustCloud key={d.id} x={d.x} y={d.y} intensity={d.intensity} />)}

        {flyingFood && <FlyingFood key={`${flyingFood.emoji}-${flyingFood.fromX}`} {...flyingFood} />}

        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 24, pointerEvents: 'none', zIndex: 5 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', userSelect: 'none' }}>© {new Date().getFullYear()} William Dzierson</p>
          <p className="hidden sm:block" style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', userSelect: 'none' }}>press <span style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>⌘K</span> to explore</p>
        </div>
      </div>

      {bubbles.map(b => <SpeechBubble key={b.id} text={b.text} x={b.x} y={b.y} dur={b.dur} />)}
    </>
  );
}
