import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Maximize2 } from 'lucide-react';
import './noodle-homepage.css';

const assets = '/portfolio/noodle/';
const original = 'https://www.noodleai.app';
const features = [
  {
    id: 'voice', title: 'Capture or log important personal & health information at home or on your phone',
    description: 'We’ve made it easy for you to capture things quickly and easily using our conversational voice app.',
    video: 'noodle_meds_vid_1', label: 'Noodle conversational voice capture demo',
  },
  {
    id: 'messages', title: 'Interact with your health information via SMS or WhatsApp',
    description: 'Using Noodle is as simple as sending a text message. Create new notes or ask questions about existing ones.',
    video: 'noodle_web_mobile_1', label: 'Noodle mobile messaging demo',
  },
  {
    id: 'recall', title: 'Just in time information at your fingertips',
    description: 'Can’t remember when you last logged that thing? Let Noodle remember for you.',
    video: 'noodle_mobile_2', label: 'Noodle information recall demo',
  },
];
const captures = [
  ['Jot that random thought', 'Capture and remember important health-related ideas or concerns as they arise.'],
  ['Capture that fleeting feeling', 'Remember and later discuss thoughts with your physician during your next visit.'],
  ['Note that recommendation', 'Drop insightful information for future reference or inspiration.'],
  ['Track your symptoms', 'Record your health status to better understand your well-being.'],
  ['Track important information', 'Quick access to essential knowledge for managing your health effectively.'],
  ['…or whatever.', 'Empower yourself to oversee your personal and health conditions.'],
];

function Brand() {
  return <span className="noodle-brand"><img src={`${assets}logo.svg`} width="32" height="36" alt=""/>Noodle</span>;
}

function Doodle({ number, className }: { number: number; className: string }) {
  return <img className={`noodle-doodle ${className}`} src={`${assets}doodle${number}.svg`} alt="" aria-hidden="true" loading="lazy"/>;
}

/** Original recordings are fetched only on Play and pause when they leave the viewport. */
function DemoVideo({ video, poster, label, expandable = false }: { video: string; poster: string; label: string; expandable?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const src = `${original}/videos/${video}.mp4`;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) element.pause(); });
    observer.observe(element);
    const pauseHidden = () => { if (document.hidden) element.pause(); };
    document.addEventListener('visibilitychange', pauseHidden);
    return () => { element.pause(); observer.disconnect(); document.removeEventListener('visibilitychange', pauseHidden); };
  }, []);
  return <div className={`noodle-video${expandable ? ' noodle-walkthrough' : ''}`}>
    {failed ? <div className="noodle-video-error"><p>This demo couldn’t load.</p><a href={src} target="_blank" rel="noreferrer">Open the original video <ArrowRight size={16}/></a></div>
      : <video ref={ref} src={src} poster={`${assets}${poster}`} controls playsInline preload="none" aria-label={label} onError={() => setFailed(true)}/>}
    {expandable && !failed && <a className="noodle-expand" href={src} target="_blank" rel="noreferrer" onClick={event => {
      const element = ref.current;
      if (element?.requestFullscreen && document.fullscreenEnabled) {
        event.preventDefault();
        void element.requestFullscreen().catch(() => { window.open(src, '_blank', 'noopener,noreferrer'); });
      }
    }}><Maximize2 size={18}/><span>Expand video</span></a>}
  </div>;
}

/** An archival presentation of Noodle's homepage, rebuilt with live type and the original artwork. */
export default function NoodleHomepage() {
  const [selected, setSelected] = useState(0);
  const id = useId(), feature = features[selected];
  return <section className="noodle-homepage" aria-label="Noodle original homepage">
    <div className="noodle-topbar"><Brand/></div>
    <section className="noodle-hero">
      <Doodle number={4} className="noodle-hero-dots"/>
      <Doodle number={15} className="noodle-hero-lime"/>
      <div className="noodle-hero-copy">
        <h2>All your health stuff.<br/>All in one place.</h2>
        <p>Finally, <strong>one place</strong> for the million little pieces of paper, doctor’s instructions, appointment cards, check lists, health tracking notes, resources, links, etc.</p>
      </div>
      <div className="noodle-hero-demo">
        <Doodle number={1} className="noodle-hero-circle"/>
        <DemoVideo video="noodle_walkthrough_2" poster="walkthrough-poster.webp" label="Noodle product walkthrough" expandable/>
      </div>
    </section>

    <section className="noodle-features">
      <Doodle number={8} className="noodle-fold"/><Doodle number={6} className="noodle-bolts"/>
      <div className="noodle-section-line" aria-hidden="true"/>
      <h3>Managing your own health knowledge — or that of a loved one — can be pretty overwhelming.</h3>
      <div className="noodle-feature-layout">
        <div className="noodle-feature-copy">
          <h4>Centralize the information that’s important to you as a patient or a caregiver.</h4>
          <div className="noodle-feature-choices" aria-label="Explore Noodle features">
            {features.map((item, i) => <button key={item.id} type="button" aria-pressed={selected === i} aria-controls={`${id}-demo`} onClick={() => setSelected(i)}>
              <span><strong>{item.title}</strong><span>{item.description}</span></span><span className="noodle-feature-arrow" aria-hidden="true"><ArrowRight size={16}/></span>
            </button>)}
          </div>
        </div>
        <div id={`${id}-demo`} className="noodle-phone" role="region" aria-label={feature.label}>
          <div className="noodle-phone-status" aria-hidden="true"><span>9:41</span><i/><span>▮▮▮ ▰</span></div>
          <DemoVideo key={feature.id} video={feature.video} poster={`${feature.id}-poster.webp`} label={feature.label}/>
          <span className="noodle-phone-home" aria-hidden="true"/>
        </div>
      </div>
    </section>

    <section className="noodle-capture">
      <Doodle number={3} className="noodle-squiggle"/><Doodle number={4} className="noodle-capture-dots"/><Doodle number={2} className="noodle-dot-square"/>
      <h3>Forget about forgetting.</h3>
      <p>Remembering healthcare information is hard. What can you capture with noodle? Almost anything, it turns out.</p>
      <div className="noodle-capture-grid">
        {captures.map(([title, description], i) => <div key={title}><img src={`${assets}icon${i + 1}.png`} width="40" height="40" alt="" loading="lazy"/><h4>{title}</h4><p>{description}</p></div>)}
      </div>
    </section>

    <section className="noodle-closed"><h3>We’re closed for new users.</h3><p>Thanks for your interest, but we’re in the process of winding down the service.</p></section>
    <div className="noodle-footer">
      <div><Brand/><div className="noodle-legal"><a href={`${original}/terms`} target="_blank" rel="noreferrer">Terms</a><span>·</span><a href={`${original}/privacy`} target="_blank" rel="noreferrer">Privacy Policy</a></div></div>
      <p>Copyright © 2025 Noodle AI, Inc. All rights reserved.</p>
    </div>
  </section>;
}
