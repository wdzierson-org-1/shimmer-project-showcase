import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// ── Music ────────────────────────────────────────────────────────────────────
const MUSIC_URL = 'https://uilvozcryifnpldfpwiz.supabase.co/storage/v1/object/public/videos/a-day-in-my-life-dark-cat-main-version-32322-02-31.mp3';

// ── NPC dialogue data ─────────────────────────────────────────────────────────
export interface NpcDialogue {
  id: string;
  name: string;
  greeting: string;
  lines: Array<{
    text: string;
    choices?: Array<{ label: string; next: string }>;
  } & { id: string }>;
}

const NPCS: NpcDialogue[] = [
  {
    id: 'guide',
    name: 'Mavi the Guide',
    greeting: "Hello, traveler! I know every corner of this island. Let me show you around William's career.",
    lines: [
      {
        id: 'start',
        text: "This island traces a career arc — four acts and a lighthouse pointing forward. Where would you like to start?",
        choices: [
          { label: 'Act I — The Foundation (NW)', next: 'foundation' },
          { label: 'Act II — Healthcare Design (NE)', next: 'institution' },
          { label: 'Act III — Founding & Fractional (SW)', next: 'ai' },
          { label: "Act IV — Builder Era (SE)", next: 'builder' },
          { label: "Just wandering, thanks!", next: 'bye' },
        ],
      },
      {
        id: 'foundation',
        text: "Northwest corner — the amber-roofed building. That's where the fundamentals were built: interactive design in Boston starting in 1999, mobile design at Yahoo! and then Google, and then Gigwalk as first design hire building a mobile platform from scratch.",
        choices: [
          { label: 'What was Gigwalk?', next: 'gigwalk' },
          { label: 'Tell me about William', next: 'about' },
          { label: "Thanks!", next: 'bye' },
        ],
      },
      {
        id: 'gigwalk',
        text: "Gigwalk connected businesses with gig workers for field data collection — like Uber for on-the-ground tasks. William was the first design hire. Built everything: iOS app, enterprise dashboard, design system. Shipped fast, broke things, learned faster.",
        choices: [{ label: "Sounds intense!", next: 'bye' }],
      },
      {
        id: 'institution',
        text: "Northeast — the teal-roofed clinic. That's nine years of healthcare design: Grand Rounds, which became Included Health. Second opinions, care navigation, AI assistants, a full design system. The longest chapter by far.",
        choices: [
          { label: "What's Included Health?", next: 'ih' },
          { label: "Nine years is a long time!", next: 'bye' },
        ],
      },
      {
        id: 'ih',
        text: "A healthcare navigation platform — one app that books doctors, explains benefits, connects you to nurses by video, gets you specialist second opinions. William led design from product designer to Staff Designer, eventually leading AI product design.",
        choices: [{ label: "Impressive. Thanks!", next: 'bye' }],
      },
      {
        id: 'ai',
        text: "Southwest — the crystal observatory. That's the Founding & Fractional chapter: founding Noodle AI (an AI-powered personal medical history app), a stint as Designer in Residence at Obvious Ventures, and fractional design leadership across several companies. Building the vocabulary for the AI era, years early.",
        choices: [
          { label: "What's model explainability?", next: 'explain' },
          { label: "Got it, thanks!", next: 'bye' },
        ],
      },
      {
        id: 'explain',
        text: "How do you show a non-technical user *why* an AI model made a specific decision? How do you build trust in a system that's probabilistic, not deterministic? Those were the core design challenges. Still are.",
        choices: [{ label: "Deep questions. Thanks!", next: 'bye' }],
      },
      {
        id: 'builder',
        text: "Southeast — the elevated treehouse with the green roof and the work light on late. That's the current chapter: building independently. Stash, weOS, this very site. When you control the whole stack, you move differently.",
        choices: [
          { label: "What is Stash?", next: 'stash' },
          { label: "And the lighthouse to the south?", next: 'lighthouse' },
          { label: "Thanks!", next: 'bye' },
        ],
      },
      {
        id: 'stash',
        text: "A personal life-organization app — universal inbox for voice memos, photos, links, thoughts. AI does the organizing. The premise: our digital lives have outpaced our tools.",
        choices: [{ label: "Clever. Thanks!", next: 'bye' }],
      },
      {
        id: 'lighthouse',
        text: "That beacon points forward — agentic AI. Systems that don't just respond, but *act*. Schedule, code, research, communicate on your behalf. The design challenge of the next decade. That's where William's headed.",
        choices: [{ label: "Exciting times!", next: 'bye' }],
      },
      {
        id: 'about',
        text: "William operates across the full stack — design tools, production code, and product strategy, often in the same afternoon. He's worked at every scale: solo founder, staff designer at a 2,000-person company, Google. Comfortable owning a feature from concept to shipped.",
        choices: [
          { label: "What are his recent projects?", next: 'builder' },
          { label: "Thanks Mavi!", next: 'bye' },
        ],
      },
      {
        id: 'bye',
        text: "Safe travels! Press WASD or click to move. Walk up to any hut to enter. And keep an eye out — not everything on the island is labeled. 🏝️",
        choices: [],
      },
    ],
  },
  {
    id: 'historian',
    name: 'Theo the Historian',
    greeting: "Psst — want to know how this island was actually built?",
    lines: [
      {
        id: 'start',
        text: "This whole scene is hand-coded Three.js — custom geometry, procedural textures, a GLSL water shader, Web Audio music. No game engine. The site itself is a portfolio project.",
        choices: [
          { label: 'How was it made?', next: 'tech' },
          { label: "Is there anything hidden here?", next: 'easter' },
          { label: 'Cool! Carry on.', next: 'bye' },
        ],
      },
      {
        id: 'tech',
        text: "React + Vite for the app shell. Three.js with an orthographic camera for the isometric view. Supabase for live project data. Tailwind for UI. The music is procedural Web Audio — oscillators and gain nodes, no audio files.",
        choices: [
          { label: 'What about the water?', next: 'water' },
          { label: "That's a lot of work.", next: 'bye' },
        ],
      },
      {
        id: 'water',
        text: "Custom GLSL vertex shader displaces mesh vertices with overlapping sine waves. The fragment shader blends three color zones — electric turquoise shallows, vivid azure mid, deep sapphire center — plus scrolling foam lines and caustic shimmer.",
        choices: [{ label: 'That explains the depth!', next: 'bye' }],
      },
      {
        id: 'easter',
        text: "The clouds drift at different speeds. The beach decor — starfish, shells, pebbles — is procedurally seeded. The trees are randomized geometry. And... there's a little cove tucked into the eastern shore that isn't labeled. A lantern marks the way.",
        choices: [
          { label: "I'll go look.", next: 'bye' },
          { label: "Tell me more.", next: 'ariadne_hint' },
          { label: "Take me there!", next: 'lead_to_cave' },
        ],
      },
      {
        id: 'ariadne_hint',
        text: "Head east along the beach until you see a glowing lantern between two rock formations. It looks like a small cove — walk in. Not everything on this island is part of the official portfolio.",
        choices: [{ label: "Lead me there!", next: 'lead_to_cave' }],
      },
      {
        id: 'lead_to_cave',
        text: "Follow me to the eastern shore! *Theo strides toward the beach* There's a cove with a lantern — walk right in. What's inside may surprise you.",
        choices: [{ label: "Let's go!", next: 'cave_walk' }],
      },
      {
        id: 'bye',
        text: "Go explore! The huts are where the real stories are. ✨",
        choices: [],
      },
    ],
  },
];

// ── NPC positions on island ────────────────────────────────────────────────────
export const NPC_POSITIONS = [
  { id: 'guide',     wx: -0.5, wz: -2.5 },   // center plaza
  { id: 'historian', wx:  5.5, wz:  0.0 },   // near the eastern beach cove
];

const MAVI_GREETINGS = [
  "Hello, traveler! I know every corner of this island. Let me show you around William's career.",
  "Back again! Let me point you somewhere new — there's still plenty to discover here.",
  "Welcome back! The northwest corner is especially worth a look — the foundations of everything were laid there.",
  "Good to see you again! The builder era in the southeast is where things really accelerated. Want to explore?",
  "Each hut has its own story. The healthcare chapter in the northeast ran for nearly a decade — worth a closer look.",
];

// ── NPC Chat UI Component ──────────────────────────────────────────────────────
interface NpcChatProps {
  npcId: string;
  screenX: number;
  screenY: number;
  onClose: () => void;
  onCaveAction?: () => void;
  visitCount?: number;
}

export const NpcChat = ({ npcId, screenX, screenY, onClose, onCaveAction, visitCount }: NpcChatProps) => {
  const npc = NPCS.find(n => n.id === npcId);
  const [lineId, setLineId] = useState('start');
  const [phase, setPhase] = useState<'greeting' | 'dialogue'>('greeting');

  if (!npc) return null;

  const line = npc.lines.find(l => l.id === lineId);

  return (
    <div
      className="absolute z-30 pointer-events-auto"
      style={{
        left: Math.min(screenX, window.innerWidth - 320),
        top: Math.max(screenY - 180, 50),
        width: 300,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Bubble */}
      <div className="bg-[#1a1435]/92 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: npcId === 'guide' ? '#4ade80' : '#a78bfa' }} />
            <span className="text-[11px] font-sans font-semibold text-white/80 tracking-wide">{npc.name}</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xs">✕</button>
        </div>

        {/* Text */}
        <div className="px-4 py-3">
          <p className="text-[12px] font-sans text-white/75 leading-relaxed">
            {phase === 'greeting'
              ? (npc.id === 'guide' ? MAVI_GREETINGS[(visitCount ?? 0) % MAVI_GREETINGS.length] : npc.greeting)
              : line?.text}
          </p>
        </div>

        {/* Choices */}
        <div className="px-4 pb-4 space-y-1.5">
          {phase === 'greeting' ? (
            <button
              onClick={() => setPhase('dialogue')}
              className="w-full text-left text-[11px] font-sans px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors border border-white/6"
            >
              Tell me more →
            </button>
          ) : line?.choices && line.choices.length > 0 ? (
            line.choices.map(c => (
              <button
                key={c.label}
                onClick={() => {
                  if (c.next === 'cave_walk') { onCaveAction?.(); onClose(); }
                  else if (c.next === 'close') { onClose(); }
                  else { setLineId(c.next); }
                }}
                className="w-full text-left text-[11px] font-sans px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors border border-white/6"
              >
                {c.label}
              </button>
            ))
          ) : (
            <button
              onClick={onClose}
              className="w-full text-left text-[11px] font-sans px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-colors border border-white/6"
            >
              Goodbye →
            </button>
          )}
        </div>
      </div>
      {/* Tail */}
      <div className="w-3 h-3 bg-[#1a1435]/92 border-b border-r border-white/10 rotate-45 mx-auto -mt-1.5" />
    </div>
  );
};

// ── Music Player Hook ──────────────────────────────────────────────────────────
export function useIslandMusic() {
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(true);

  useEffect(() => {
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.4;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nowMuted = !mutedRef.current;
    mutedRef.current = nowMuted;
    setMuted(nowMuted);
    if (nowMuted) {
      audio.pause();
    } else {
      audio.volume = volume;
      audio.play().catch(() => {});
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  return { muted, toggle, volume, setVolume };
}

// ── Volume Control UI ──────────────────────────────────────────────────────────
export const VolumeControl = ({
  muted, toggle, volume, setVolume,
}: ReturnType<typeof useIslandMusic>) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {expanded && (
        <input
          type="range" min="0" max="1" step="0.05"
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          className="w-20 accent-white/60 cursor-pointer"
        />
      )}
      <button
        onClick={() => { toggle(); setExpanded(true); }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white/50 hover:text-white/80 rounded-lg px-2.5 py-1.5 transition-colors"
        title={muted ? 'Unmute island music' : 'Mute'}
      >
        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        <span className="text-[9px] font-mono uppercase tracking-widest">{muted ? 'music' : '♪'}</span>
      </button>
    </div>
  );
};
