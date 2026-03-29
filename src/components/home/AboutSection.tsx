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
            className="flex flex-col"
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
                href="https://www.linkedin.com/in/will-dzierson-1081963/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white/70 transition-colors text-sm font-sans"
              >
                LinkedIn
              </a>
            </div>
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
              I sit at the intersection of design and engineering.
              I love to design, and I love to build. I've spent my career making
              software for healthcare, AI, and consumer products.
            </p>

            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4 font-sans">
                Previously
              </p>
              <p className="text-sm text-white/50 font-sans font-light leading-relaxed">
                Google &middot; Yahoo &middot; Salesforce &middot; Dexterity Robotics &middot; Darwin AI &middot; Noodle &middot; Included Health &middot; Gigwalk &middot; Lockheed-Martin &middot; John Hancock &middot; IBM &middot; Softbank Japan &middot; Bose &middot; Dr. Seuss Enterprises &middot; PepsiCo &middot; Lincoln Center &middot; Harvard Medical School &middot; The Smithsonian &middot; Caterpillar &middot; The Public Health Company &middot; Optum &middot; Obvious Ventures
              </p>
            </div>

            <div className="mt-8">
              <a
                href="https://lovable.dev/guides/11-ux-portfolio-examples"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 text-white/40 hover:text-white/70 transition-colors group"
              >
                <span className="text-xs font-sans shrink-0 tracking-wide">Featured by</span>
                <img
                  src="https://lovable.dev/img/logo/logowhite.svg"
                  alt="Lovable"
                  className="h-3 opacity-40 group-hover:opacity-70 transition-opacity"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)?.removeAttribute('hidden');
                  }}
                />
                <span hidden className="text-sm font-sans font-medium">Lovable</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
