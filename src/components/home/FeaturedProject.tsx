import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

interface FeaturedProjectProps {
  id: string;
  title: string;
  client: string;
  description: string;
  imageUrl: string;
  tags: string[];
  index: number;
  liveUrl?: string;
}

const layoutVariants = [
  'image-left',
  'full-bleed',
  'image-right',
] as const;

const FeaturedProject = ({
  id,
  title,
  client,
  description,
  imageUrl,
  tags,
  index,
  liveUrl,
}: FeaturedProjectProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const layout = layoutVariants[index % layoutVariants.length];

  const truncatedDescription =
    description.length > 200
      ? description.slice(0, 200).replace(/\s+\S*$/, '') + '...'
      : description;

  const imageBlock = (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className={`overflow-hidden rounded-sm ${
        layout === 'full-bleed' ? 'aspect-[21/9]' : 'aspect-[4/3]'
      }`}
    >
      <Link to={`/project/${id}`} className="block h-full no-underline">
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-[1.03]"
        />
      </Link>
    </motion.div>
  );

  const textBlock = (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
      className="flex flex-col justify-center"
    >
      <p
        className="text-muted-foreground font-sans mb-3"
        style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase' }}
      >
        {client}
      </p>
      <Link to={`/project/${id}`} className="no-underline">
        <h2
          className="font-serif text-foreground hover:opacity-70 transition-opacity"
          style={{
            fontSize: 'clamp(2.4rem, 4.8vw, 4.2rem)',
            fontWeight: 200,
            lineHeight: '1.0',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
      </Link>
      <p className="mt-4 text-base text-muted-foreground font-sans font-light leading-relaxed max-w-lg">
        {truncatedDescription}
      </p>
      <div className="flex flex-wrap gap-2 mt-5">
        {tags.slice(0, 4).map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="text-xs font-sans font-normal tracking-wide border-foreground/15 text-muted-foreground"
          >
            {tag}
          </Badge>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-8">
        <Link
          to={`/project/${id}`}
          className="text-sm font-sans text-foreground/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5 no-underline group"
        >
          <span className="border-b border-foreground/20 group-hover:border-foreground/50 pb-0.5 transition-colors">
            Case study
          </span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-sans text-foreground/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5 no-underline group"
          >
            <span className="border-b border-foreground/20 group-hover:border-foreground/50 pb-0.5 transition-colors">
              Live site
            </span>
            <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        )}
      </div>
    </motion.div>
  );

  if (layout === 'full-bleed') {
    return (
      <div ref={ref} className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {imageBlock}
          <div className="mt-8 max-w-2xl">{textBlock}</div>
        </div>
      </div>
    );
  }

  const isImageLeft = layout === 'image-left';

  return (
    <div ref={ref} className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
            !isImageLeft ? 'lg:[direction:rtl] lg:[&>*]:[direction:ltr]' : ''
          }`}
        >
          {imageBlock}
          {textBlock}
        </div>
      </div>
    </div>
  );
};

export default FeaturedProject;
