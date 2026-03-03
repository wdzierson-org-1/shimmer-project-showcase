import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Github } from 'lucide-react';

const AboutSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-24 md:py-32 bg-[#08070b] text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2
              className="font-serif text-[clamp(2.5rem,5vw,4.5rem)] leading-[1.05] tracking-tight text-white/90"
              style={{ fontWeight: 200 }}
            >
              Designer,<br />
              technologist,<br />
              <em className="font-serif" style={{ fontWeight: 200 }}>
                builder.
              </em>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.15,
            }}
            className="flex flex-col justify-center"
          >
            <p className="text-lg text-white/50 font-sans font-light leading-relaxed">
              I sit at the intersection of design and engineering — always have.
              I love to design, and I love to build. I've spent my career making
              software for healthcare, AI, and consumer products.
            </p>

            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4 font-sans">
                Previously
              </p>
              <p className="text-sm text-white/50 font-sans font-light">
                Included Health &middot; Google &middot; Grand Rounds &middot;
                Optum &middot; Gigwalk
              </p>
            </div>

            <div className="mt-8 flex items-center gap-6">
              <a
                href="https://github.com/wdzierson"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm font-sans"
              >
                <Github size={16} />
                GitHub
              </a>
              <a
                href="https://linkedin.com/in/wdzierson"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white/70 transition-colors text-sm font-sans"
              >
                LinkedIn
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
