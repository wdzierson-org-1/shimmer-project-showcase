import IslandGame from './IslandGame';

const Hero = () => {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(420px, 60vh, 600px)', background: '#7ab8f5' }}
    >
      <div className="absolute inset-0">
        <IslandGame />
      </div>
    </div>
  );
};

export default Hero;
