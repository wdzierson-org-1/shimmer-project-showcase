import CRTHero from './CRTHero';
import { WillCoDesktop } from '@/components/willco/WillCoDesktop';

const NAV_H = 48;

const Hero = () => (
  <div
    style={{
      display: 'flex',
      height: 'clamp(540px, 72vh, 780px)',
      background: '#111118',
    }}
  >
    {/* CRT Terminal — 60% */}
    <div style={{ flex: 3, minWidth: 0, position: 'relative' }}>
      <CRTHero />
    </div>

    {/* Divider */}
    <div
      aria-hidden="true"
      style={{
        width: 1,
        background: 'rgba(136,192,208,0.18)',
        flexShrink: 0,
        marginTop: NAV_H,
      }}
    />

    {/* WillCo Desktop — 40%, hidden on small screens */}
    <div
      className="hidden md:block"
      style={{ flex: 2, minWidth: 0, position: 'relative', paddingTop: NAV_H }}
    >
      <WillCoDesktop />
    </div>
  </div>
);

export default Hero;
