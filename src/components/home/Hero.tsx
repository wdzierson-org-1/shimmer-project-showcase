import { useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import GradientBlob from './GradientBlob';
import { getTimeTheme, CONTENT_BG_CSS } from '@/lib/timeTheme';

const Hero = () => {
  const theme = useMemo(() => getTimeTheme(), []);
  const { isLight, bgRgb, colorA, colorB, colorC } = theme;

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative h-[55vh] min-h-[420px]">
      <section className="h-full overflow-hidden relative">

        {/* Full-bleed WebGL gradient */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <GradientBlob
            className="w-full h-full"
            bgColor={bgRgb}
            colorA={colorA}
            colorB={colorB}
            colorC={colorC}
          />
        </motion.div>

        {/* Wordmark — bottom-left */}
        <motion.div
          className="absolute bottom-8 left-6 md:left-12 z-30 pointer-events-none"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          <p
            className="font-serif leading-none tracking-tight"
            style={{
              fontSize: 'clamp(1.4rem, 2.2vw, 2rem)',
              fontWeight: 200,
              color: isLight ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.85)',
            }}
          >
            William Dzierson
          </p>
          <p
            className="mt-1.5 font-sans uppercase tracking-[0.18em] text-[10px]"
            style={{ color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)' }}
          >
            Design &amp; Engineering
          </p>
        </motion.div>

        {/* Soft bottom edge — blends hero into content below */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none z-[25]"
          style={{ background: `linear-gradient(to bottom, transparent, ${CONTENT_BG_CSS})` }}
        />
      </section>
    </div>
  );
};

export default Hero;

export const AmbientStrip = () => {
  const theme = useMemo(() => getTimeTheme(), []);
  const { bgRgb, colorA, colorB, colorC } = theme;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-0 h-[72px] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <GradientBlob
        className="w-full h-full"
        bgColor={bgRgb}
        colorA={colorA}
        colorB={colorB}
        colorC={colorC}
      />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
};
