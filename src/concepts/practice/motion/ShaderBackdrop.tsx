import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { auroraFragment, raysFragment } from './shaders';
import { createShaderSurface, type ShaderSurface } from './shaderSurface';

export type BackdropHandle = { render: (seconds: number) => void };
type Props = { mode: 'aurora' | 'rays'; active?: boolean; clocked?: boolean };

const ShaderBackdrop = forwardRef<BackdropHandle, Props>(function ShaderBackdrop({ mode, active = true, clocked = false }, ref) {
  const host = useRef<HTMLDivElement>(null), surface = useRef<ShaderSurface | null>(null);
  const elapsed = useRef(12);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [awake, setAwake] = useState(() => !document.hidden);
  useImperativeHandle(ref, () => ({ render: seconds => { elapsed.current = seconds; if (visible) surface.current?.render(seconds); } }), [visible]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    if (host.current) observer.observe(host.current);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches), visibility = () => setAwake(!document.hidden);
    media.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    const element = host.current;
    if (!element || !visible || surface.current) return;
    surface.current = createShaderSurface(element, mode === 'aurora' ? auroraFragment : raysFragment, mode === 'aurora' ? {
      uAmplitude: .85, uBlend: .8, uLightMode: 1,
      'uColorStops[0]': [.43,.63,.49, .72,.75,.48, .82,.56,.43],
    } : {
      iSpeed: .22, iRayColor1: [.87,.75,.51], iRayColor2: [.56,.76,.69], iIntensity: 4.5,
      iSpread: 2.1, iFlipX: 0, iFlipY: 0, iTilt: -12, iSaturation: .85, iBlend: .6, iFalloff: 1.4, iOpacity: .85,
    });
    if (!surface.current) element.dataset.shader = 'fallback';
  }, [mode, visible]);
  useEffect(() => () => { surface.current?.dispose(); surface.current = null; }, []);
  useEffect(() => {
    surface.current?.render(elapsed.current);
    if (!visible || !active || reduced || !awake || clocked) return;
    let frame = 0, previous = performance.now(), lastPaint = 0;
    const tick = (now: number) => {
      elapsed.current += Math.min((now - previous) / 1000, .1) * (mode === 'aurora' ? .2 : 1); previous = now;
      if (now - lastPaint > 1000 / 30 - 1) { surface.current?.render(elapsed.current); lastPaint = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, awake, clocked, mode, reduced, visible]);
  return <div ref={host} className={`shader-backdrop shader-${mode}`} aria-hidden="true"/>;
});
export default ShaderBackdrop;
