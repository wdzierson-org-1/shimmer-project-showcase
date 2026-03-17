import { motion } from 'framer-motion';
import IslandGame from './IslandGame';

const Hero = () => {
  return (
    <div className="relative w-full" style={{ height: 'clamp(420px, 60vh, 600px)' }}>
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <IslandGame />
      </motion.div>
    </div>
  );
};

export default Hero;
