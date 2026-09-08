import { useId } from 'react';

const random = (n: number) => { const v = Math.sin(n * 127.1 + 19.7) * 43758.5453; return v - Math.floor(v); };
const lights = Array.from({ length: 100 }, (_, i) => ({ x: random(i) * 181, y: random(i + 100) * 193, r: .7 + random(i + 200) * .8, opacity: .35 + random(i + 300) * .65 }));

/** A small vector still, so the evening scene doesn't need WebGL before Play. */
export default function FireflyCover() {
  const id = useId();
  return <div className="arc-canvas arc-firefly-cover" aria-hidden="true">
    <svg viewBox="0 0 640 600" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={`${id}-lights`} width="181" height="193" patternUnits="userSpaceOnUse">
          {lights.map((light, i) => <circle key={i} cx={light.x} cy={light.y} r={light.r} fill="#ffe7bc" opacity={light.opacity}/>)}
        </pattern>
        <mask id={`${id}-question`}><text x="330" y="455" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="bold" fontSize="445" fill="white">?</text></mask>
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>
        <g id={`${id}-field`} mask={`url(#${id}-question)`}><path d="M0 0H640V600H0Z" fill={`url(#${id}-lights)`}/></g>
      </defs>
      <use href={`#${id}-field`} filter={`url(#${id}-glow)`} opacity=".75"/>
      <use href={`#${id}-field`}/>
    </svg>
  </div>;
}
