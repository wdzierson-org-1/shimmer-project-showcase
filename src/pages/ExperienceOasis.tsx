import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import VillaBook, { CaveBookOverlay } from '@/components/home/VillaBook';
import type { VillaBook as VillaBookData, CaveBook } from '@/lib/villaBooks';
import type { IslandGameHandle } from '@/components/home/IslandGame';

const IslandGame = lazy(() => import('@/components/home/IslandGame'));

/** Standalone, full-viewport home for the island game at /experienceoasis. */
export default function ExperienceOasis() {
  const [openVilla, setOpenVilla] = useState<VillaBookData | null>(null);
  const [openCave, setOpenCave] = useState<CaveBook | null>(null);
  const islandRef = useRef<IslandGameHandle>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Experience Oasis — Will Dzierson';
    document.body.style.overflow = 'hidden';
    return () => {
      document.title = previousTitle;
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#8ecde6]">
      {/* Back to the portfolio — a full navigation, since / lives in the other bundle */}
      <a
        href="/"
        className="
          absolute top-3 left-3 z-50
          text-white/70 hover:text-white text-[10px] uppercase tracking-[0.18em] font-sans
          px-3 py-1.5 rounded-full
          bg-black/25 hover:bg-black/45
          transition-colors
        "
      >
        ← dzierson.com
      </a>

      {/* Label — hidden on phones where it would collide with the back link */}
      <div className="hidden sm:block absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <p
          className="text-white/50 text-[9px] uppercase tracking-[0.18em] font-sans px-3 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.18)' }}
        >
          Experience Oasis
        </p>
      </div>

      {/* Game — fills the viewport */}
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
          </div>
        }
      >
        <div className="absolute inset-0">
          <IslandGame
            ref={islandRef}
            onEnterVilla={setOpenVilla}
            onEnterCave={setOpenCave}
          />
        </div>
      </Suspense>

      {/* VillaBook and CaveBookOverlay render above the game via fixed positioning */}
      {openVilla && (
        <VillaBook
          villa={openVilla}
          onClose={() => { setOpenVilla(null); islandRef.current?.restoreFocus(); }}
        />
      )}
      {openCave && (
        <CaveBookOverlay
          cave={openCave}
          onClose={() => { setOpenCave(null); islandRef.current?.restoreFocus(); }}
        />
      )}
    </div>
  );
}
