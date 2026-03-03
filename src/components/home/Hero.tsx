import { useRef, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import GradientBlob from './GradientBlob';
import { getTimeTheme, CONTENT_BG_CSS } from '@/lib/timeTheme';

const CODE_LINES = [
  { text: 'import React from "react"', x: '3%', y: '8%' },
  { text: 'import { motion } from "framer-motion"', x: '3%', y: '11%' },
  { text: '', x: '3%', y: '14%' },
  { text: 'const Portfolio = () => {', x: '3%', y: '17%' },
  { text: '  const [ready, setReady] = useState(false)', x: '3%', y: '20%' },
  { text: '', x: '3%', y: '23%' },
  { text: '  useEffect(() => {', x: '3%', y: '26%' },
  { text: '    initWebGL(canvas)', x: '3%', y: '29%' },
  { text: '    setReady(true)', x: '3%', y: '32%' },
  { text: '  }, [])', x: '3%', y: '35%' },

  { text: 'return (', x: '62%', y: '56%' },
  { text: '  <motion.div', x: '62%', y: '59%' },
  { text: '    initial={{ opacity: 0 }}', x: '62%', y: '62%' },
  { text: '    animate={{ opacity: 1 }}', x: '62%', y: '65%' },
  { text: '    className="craft"', x: '62%', y: '68%' },
  { text: '  >', x: '62%', y: '71%' },
  { text: '    <Header name="William" />', x: '62%', y: '74%' },
  { text: '    <ProjectGrid />', x: '62%', y: '77%' },
  { text: '  </motion.div>', x: '62%', y: '80%' },
  { text: ')', x: '62%', y: '83%' },

  { text: 'interface Craft {', x: '5%', y: '72%' },
  { text: '  design: boolean', x: '5%', y: '75%' },
  { text: '  engineering: boolean', x: '5%', y: '78%' },
  { text: '  ship: () => Promise<void>', x: '5%', y: '81%' },
  { text: '}', x: '5%', y: '84%' },

  { text: 'import { supabase } from "./db"', x: '55%', y: '10%' },
  { text: 'import type { Project } from "./types"', x: '55%', y: '13%' },

  { text: 'async function deploy(project: Project) {', x: '8%', y: '50%' },
  { text: '  await project.validate()', x: '8%', y: '53%' },
  { text: '  return project.ship()', x: '8%', y: '56%' },
  { text: '}', x: '8%', y: '59%' },
];

type TK = 'kw' | 'fn' | 'num' | 'op';

const TERMINAL_LINES: { indent: number; tokens: { text: string; t: TK }[] }[] = [
  { indent: 0, tokens: [
    { text: 'float ', t: 'kw' },
    { text: 'figure', t: 'fn' },
    { text: '(vec2 uv, vec2 c) {', t: 'op' },
  ]},
  { indent: 1, tokens: [
    { text: 'vec2 ', t: 'kw' },
    { text: 'p = (uv - c) / scale;', t: 'op' },
  ]},
  { indent: 1, tokens: [
    { text: 'p = ', t: 'op' },
    { text: 'rot', t: 'fn' },
    { text: '(t * ', t: 'op' },
    { text: '0.15', t: 'num' },
    { text: ') * p;', t: 'op' },
  ]},
  { indent: 1, tokens: [
    { text: 'float ', t: 'kw' },
    { text: 'n = ', t: 'op' },
    { text: 'snoise', t: 'fn' },
    { text: '(p * ', t: 'op' },
    { text: '1.5', t: 'num' },
    { text: ');', t: 'op' },
  ]},
  { indent: 1, tokens: [
    { text: 'p += n * ', t: 'op' },
    { text: '0.12', t: 'num' },
    { text: ';', t: 'op' },
  ]},
  { indent: 1, tokens: [
    { text: 'float ', t: 'kw' },
    { text: 'd = ', t: 'op' },
    { text: 'length', t: 'fn' },
    { text: '(p);', t: 'op' },
  ]},
  { indent: 1, tokens: [
    { text: 'float ', t: 'kw' },
    { text: 'r = ', t: 'op' },
    { text: '0.32', t: 'num' },
    { text: ' + ', t: 'op' },
    { text: '0.04', t: 'num' },
  ]},
  { indent: 2, tokens: [
    { text: '* ', t: 'op' },
    { text: 'sin', t: 'fn' },
    { text: '(a * ', t: 'op' },
    { text: '2.0', t: 'num' },
    { text: ' + t);', t: 'op' },
  ]},
  { indent: 1, tokens: [
    { text: 'return ', t: 'kw' },
    { text: 'smoothstep', t: 'fn' },
    { text: '(r, r-', t: 'op' },
    { text: '0.2', t: 'num' },
    { text: ', d);', t: 'op' },
  ]},
  { indent: 0, tokens: [
    { text: '}', t: 'op' },
  ]},
];

function tokenColor(type: TK, light: boolean): string {
  if (light) {
    switch (type) {
      case 'kw':  return 'text-[#8250df]/55';
      case 'fn':  return 'text-[#953800]/55';
      case 'num': return 'text-[#0550ae]/55';
      case 'op':  return 'text-black/25';
    }
  } else {
    switch (type) {
      case 'kw':  return 'text-[#c792ea]/55';
      case 'fn':  return 'text-[#82aaff]/55';
      case 'num': return 'text-[#f78c6c]/55';
      case 'op':  return 'text-white/20';
    }
  }
}

const Hero = () => {
  const theme = useMemo(() => getTimeTheme(), []);
  const { isLight, bgRgb, colorA, colorB, colorC } = theme;

  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const codeY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '55%']);
  const terminalY = useTransform(scrollYProgress, [0, 1], ['15%', '-25%']);

  const heroOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const terminalOpacity = useTransform(
    scrollYProgress,
    [0, 0.06, 0.18, 0.32, 0.48],
    [0, 0, 0.4, 0.4, 0]
  );

  const fg = isLight ? 'black' : 'white';

  return (
    <div ref={containerRef} className="relative h-[150vh]">
      <section className="sticky top-0 h-screen overflow-hidden">

        {/* Full-bleed WebGL gradient */}
        <div className="absolute inset-0">
          <GradientBlob
            className="w-full h-full"
            bgColor={bgRgb}
            colorA={colorA}
            colorB={colorB}
            colorC={colorC}
          />
        </div>

        {/* Ambient code */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ y: codeY, opacity: heroOpacity }}
        >
          {CODE_LINES.map((line, i) => (
            <span
              key={i}
              className={`absolute font-mono text-[10px] select-none whitespace-nowrap`}
              style={{ left: line.x, top: line.y, color: isLight ? 'rgba(0,0,0,0.055)' : 'rgba(255,255,255,0.055)' }}
            >
              {line.text}
            </span>
          ))}
        </motion.div>

        {/* Ephemeral terminal — real GLSL code */}
        <motion.div
          className="absolute pointer-events-none z-[5]"
          style={{
            y: terminalY,
            opacity: terminalOpacity,
            right: '8%',
            bottom: '14%',
          }}
        >
          <div
            className={`w-[clamp(240px,20vw,320px)] rounded-xl overflow-hidden backdrop-blur-md ${
              isLight
                ? 'bg-white/50'
                : 'bg-white/[0.06] border border-white/[0.06]'
            }`}
          >
            <div className={`flex items-center gap-1.5 px-3 py-2 border-b ${
              isLight ? 'border-black/[0.03]' : 'border-white/[0.04]'
            }`}>
              <div className="w-2 h-2 rounded-full bg-[#ff5f57]/50" />
              <div className="w-2 h-2 rounded-full bg-[#febc2e]/50" />
              <div className="w-2 h-2 rounded-full bg-[#28c840]/50" />
              <span className={`ml-2 text-[8px] font-mono ${
                isLight ? 'text-black/15' : 'text-white/15'
              }`}>gradient.glsl</span>
            </div>
            <div className="px-3 py-2.5 font-mono text-[9px] leading-[1.8]">
              {TERMINAL_LINES.map((line, i) => (
                <div key={i} className="flex">
                  <span className={`w-4 text-right mr-2 select-none shrink-0 text-[8px] ${
                    isLight ? 'text-black/10' : 'text-white/10'
                  }`}>
                    {i + 1}
                  </span>
                  <span style={{ paddingLeft: line.indent * 12 }}>
                    {line.tokens.map((tok, j) => (
                      <span key={j} className={tokenColor(tok.t, isLight)}>{tok.text}</span>
                    ))}
                    {i === TERMINAL_LINES.length - 1 && (
                      <span className={`inline-block w-[4px] h-[10px] ml-0.5 terminal-cursor ${
                        isLight ? 'bg-black/20' : 'bg-white/25'
                      }`} />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Hero text */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-6"
          style={{ y: textY, opacity: textOpacity }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-[clamp(3rem,10vw,9rem)] leading-[0.95] tracking-tight text-center"
            style={{ fontWeight: 200, color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.90)' }}
          >
            William Dzierson
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            className="mt-6 font-sans text-[clamp(1rem,2vw,1.35rem)] font-light tracking-wide text-center"
            style={{ color: isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.45)' }}
          >
            I design and build software.
          </motion.p>
        </motion.div>

        {/* Soft bottom edge — blends hero into content below */}
        <div
          className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none z-[25]"
          style={{ background: `linear-gradient(to bottom, transparent, ${CONTENT_BG_CSS})` }}
        />

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30"
          style={{ opacity: textOpacity }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-[1px] h-10 bg-gradient-to-b to-transparent"
            style={{ ['--tw-gradient-from' as string]: `${fg}33` }}
          />
        </motion.div>
      </section>
    </div>
  );
};

export default Hero;
