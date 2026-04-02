import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Github, Mail, Calendar, FileText, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';

interface SiteSettings {
  about_headline: string;
  about_bio: string;
  about_email: string;
  about_resume_url: string;
  about_calendar_url: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  about_headline: 'Principal Product Designer specializing in AI-native experiences.',
  about_bio: `I sit at the intersection of design and engineering — I love to design, and I love to build.

At Google, I led design on mobile experiences that [reshaped how millions of users](https://www.youtube.com/watch?v=JKxzX3p1iRs) interact with information on their phones. Since then I've shipped software for healthcare, AI, and consumer products at Salesforce, Included Health, Dexterity Robotics, and a dozen others.

I'm drawn to the hard problems: building AI interfaces that feel intuitive, designing systems that scale, and bridging the gap between what's technically possible and what's genuinely useful.`,
  about_email: '',
  about_resume_url: '',
  about_calendar_url: '',
};

const PREVIOUSLY = [
  'Google', 'Yahoo', 'Salesforce', 'Dexterity Robotics', 'Darwin AI',
  'Noodle', 'Included Health', 'Gigwalk', 'Lockheed-Martin', 'John Hancock',
  'IBM', 'Softbank Japan', 'Bose', 'Dr. Seuss Enterprises', 'PepsiCo',
  'Lincoln Center', 'Harvard Medical School', 'The Smithsonian', 'Caterpillar',
  'The Public Health Company', 'Optum', 'Obvious Ventures',
];

const About = () => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['about_headline', 'about_bio', 'about_email', 'about_resume_url', 'about_calendar_url']);

      if (error || !data) return;

      const merged = { ...DEFAULT_SETTINGS };
      data.forEach(({ key, value }) => {
        if (key in merged && value) {
          (merged as Record<string, string>)[key] = value;
        }
      });
      setSettings(merged);
    };

    fetchSettings();
  }, []);

  const contactLinks = [
    settings.about_email && {
      href: `mailto:${settings.about_email}`,
      icon: <Mail size={15} />,
      label: settings.about_email,
      external: false,
    },
    settings.about_resume_url && {
      href: settings.about_resume_url,
      icon: <FileText size={15} />,
      label: 'Resume',
      external: true,
    },
    settings.about_calendar_url && {
      href: settings.about_calendar_url,
      icon: <Calendar size={15} />,
      label: "Let's talk",
      external: true,
    },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string; external: boolean }[];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-32 pb-24">
        <div ref={ref} className="max-w-7xl mx-auto px-6 md:px-12">

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mb-16"
          >
            <h1
              className="font-serif text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.08] tracking-tight text-foreground/90"
              style={{ fontWeight: 200 }}
            >
              {settings.about_headline}
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">

            {/* Left — bio + contact */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="flex flex-col gap-8"
            >
              <div className="flex flex-col gap-4 text-base md:text-lg text-foreground/60 font-sans font-light leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-base md:text-lg text-foreground/60 font-sans font-light leading-relaxed">{children}</p>,
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/70 underline underline-offset-2 decoration-foreground/25 hover:text-foreground hover:decoration-foreground/50 transition-colors"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {settings.about_bio}
                </ReactMarkdown>
              </div>

              {/* Contact CTAs */}
              {contactLinks.length > 0 && (
                <div className="flex flex-col gap-3">
                  {contactLinks.map(({ href, icon, label, external }) => (
                    <a
                      key={href}
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-2.5 text-sm font-sans text-foreground/60 hover:text-foreground transition-colors group w-fit"
                    >
                      <span className="text-foreground/40 group-hover:text-foreground/70 transition-colors">
                        {icon}
                      </span>
                      <span className="border-b border-foreground/15 group-hover:border-foreground/40 pb-px transition-colors">
                        {label}
                      </span>
                      {external && (
                        <ExternalLink size={11} className="text-foreground/30 group-hover:text-foreground/50 transition-colors" />
                      )}
                    </a>
                  ))}
                </div>
              )}

              {/* Social links */}
              <div className="flex items-center gap-6 pt-2">
                <a
                  href="https://github.com/wdzierson"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-sans text-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  <Github size={15} />
                  GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/will-dzierson-1081963/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-sans text-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  LinkedIn
                </a>
                <a
                  href="https://www.threads.com/@willd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-sans text-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  Threads
                  <ExternalLink size={10} className="opacity-60" />
                </a>
              </div>
            </motion.div>

            {/* Right — previously */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="flex flex-col"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/30 mb-5 font-sans">
                Previously
              </p>
              <div className="flex flex-wrap gap-x-0 gap-y-0">
                {PREVIOUSLY.map((name, i) => (
                  <span key={name} className="text-sm text-foreground/50 font-sans font-light">
                    {name}
                    {i < PREVIOUSLY.length - 1 && (
                      <span className="mx-2 text-foreground/20">&middot;</span>
                    )}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
