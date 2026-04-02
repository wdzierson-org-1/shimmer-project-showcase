import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import VillaBook, { CaveBookOverlay } from './VillaBook';
import type { VillaBook as VillaBookData, CaveBook } from '@/lib/villaBooks';
import type { IslandGameHandle } from './IslandGame';

const IslandGame = lazy(() => import('./IslandGame'));

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function IslandGameModal({ open, onClose }: Props) {
  const [openVilla, setOpenVilla] = useState<VillaBookData | null>(null);
  const [openCave, setOpenCave] = useState<CaveBook | null>(null);
  const islandRef = useRef<IslandGameHandle>(null);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !openVilla && !openCave) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, openVilla, openCave]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card — full screen on mobile, centered card on desktop */}
      <div
        className="
          relative overflow-hidden bg-[#8ecde6]
          w-full h-full
          sm:w-[min(92vw,1100px)] sm:h-[min(88vh,720px)]
          sm:rounded-2xl
        "
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="
            absolute top-3 right-3 z-50
            flex items-center justify-center
            w-9 h-9 rounded-full
            bg-black/25 hover:bg-black/45
            text-white/80 hover:text-white
            transition-colors
          "
        >
          <X size={16} />
        </button>

        {/* Label */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <p
            className="text-white/50 text-[9px] uppercase tracking-[0.18em] font-sans px-3 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.18)' }}
          >
            Experience Oasis
          </p>
        </div>

        {/* Game — fills the container */}
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
      </div>

      {/* VillaBook and CaveBookOverlay render above the modal via fixed positioning */}
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
