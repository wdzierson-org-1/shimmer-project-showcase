import { useEffect, type RefObject } from 'react';

/** A light adaptation of React Bits ScrollExpand's viewport progress treatment.
 * Normal document flow, no pinned screen or nested scroller. See REACT_BITS_LICENSE.md.
 */
export function useScrollExpansion(shell: RefObject<HTMLElement>, stage: RefObject<HTMLElement>, enabled: boolean) {
  useEffect(() => {
    const frame = stage.current, track = shell.current;
    if (!frame || !track) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    const paint = () => {
      raf = 0;
      if (!enabled || preference.matches || innerWidth < 801 || document.fullscreenElement) { frame.style.transform = ''; return; }
      const p = Math.max(0, Math.min(1, (innerHeight * .9 - track.getBoundingClientRect().top) / (innerHeight * .62)));
      const ease = p * p * (3 - 2 * p);
      frame.style.transform = `scale(${.88 + .12 * ease})`;
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
    paint(); window.addEventListener('scroll', queue, { passive: true }); window.addEventListener('resize', queue);
    preference.addEventListener('change', queue);
    return () => { cancelAnimationFrame(raf); frame.style.transform = ''; window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); preference.removeEventListener('change', queue); };
  }, [enabled, shell, stage]);
}
