import { useState } from 'react';
import IslandGame from './IslandGame';
import VillaBook from './VillaBook';
import type { VillaBook as VillaBookData } from '@/lib/villaBooks';

const Hero = () => {
  const [openVilla, setOpenVilla] = useState<VillaBookData | null>(null);

  return (
    <>
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 'clamp(480px, 65vh, 680px)', background: '#87ceeb' }}
      >
        <div className="absolute inset-0">
          <IslandGame onEnterVilla={setOpenVilla} />
        </div>
      </div>

      {openVilla && (
        <VillaBook villa={openVilla} onClose={() => setOpenVilla(null)} />
      )}
    </>
  );
};

export default Hero;
