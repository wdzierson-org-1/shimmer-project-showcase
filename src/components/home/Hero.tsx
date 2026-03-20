import { useState, useRef } from 'react';
import IslandGame, { type IslandGameHandle } from './IslandGame';
import VillaBook, { CaveBookOverlay } from './VillaBook';
import type { VillaBook as VillaBookData, CaveBook } from '@/lib/villaBooks';

const Hero = () => {
  const [openVilla, setOpenVilla] = useState<VillaBookData | null>(null);
  const [openCave, setOpenCave] = useState<CaveBook | null>(null);
  const islandRef = useRef<IslandGameHandle>(null);

  return (
    <>
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 'clamp(480px, 65vh, 680px)', background: '#8ecde6' }}
      >
        <div className="absolute inset-0">
          <IslandGame
            ref={islandRef}
            onEnterVilla={setOpenVilla}
            onEnterCave={setOpenCave}
          />
        </div>
      </div>

      {openVilla && (
        <VillaBook villa={openVilla} onClose={() => { setOpenVilla(null); islandRef.current?.restoreFocus(); }} />
      )}

      {openCave && (
        <CaveBookOverlay cave={openCave} onClose={() => { setOpenCave(null); islandRef.current?.restoreFocus(); }} />
      )}
    </>
  );
};

export default Hero;
