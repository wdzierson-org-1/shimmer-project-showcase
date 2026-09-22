import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { ArrowDownRight, ArrowRight, BarChart3, Bell, ChevronDown, Download, Home, LogOut, MoreHorizontal, RotateCcw, Settings, Share2, UserRound } from 'lucide-react';
import { curve, dates, points, regions, xAt, yAt, type Region } from './data';
import './risk-dashboard.css';

type Props = { projectId: string };
function Forecast({ region, chartRef }: { region: Region; chartRef: React.RefObject<SVGSVGElement> }) {
  const [inspected, setInspected] = useState<number | null>(null);
  const hint = useId(), clip = useId().replace(/:/g, '');
  const history = points(region.cases.slice(0, 11)), forecast = points(region.cases.slice(10), 10);
  const upper = points(region.upper, 10), lower = points(region.lower, 10);
  const band = `${curve(upper)} L ${lower.at(-1)!.x},${lower.at(-1)!.y} ${curve([...lower].reverse()).replace(/^M [^ ]+ /, '')} Z`;
  const selected = inspected === null ? null : { x:xAt(dates[inspected]), y:yAt(region.cases[inspected]), value:region.cases[inspected], date:dates[inspected] };
  return <div className="risk-forecast">
    <p className="risk-micro-heading">Case forecast (per 100k)</p>
    <div className="risk-chart" tabIndex={0} role="group" aria-label={`Case forecast for ${region.name}`} aria-describedby={hint}
      onFocus={e => { if (e.currentTarget.matches(':focus-visible')) setInspected(10); }} onBlur={() => setInspected(null)} onPointerLeave={e => { if (e.pointerType !== 'touch') setInspected(null); }}
      onPointerDown={e => {
        const rect = e.currentTarget.getBoundingClientRect(), x = (e.clientX - rect.left) / rect.width * 600;
        setInspected(dates.reduce((best, date, i) => Math.abs(xAt(date) - x) < Math.abs(xAt(dates[best]) - x) ? i : best, 0));
      }}
      onPointerMove={e => {
        if (e.pointerType === 'touch') return;
        const rect = e.currentTarget.getBoundingClientRect(), x = (e.clientX - rect.left) / rect.width * 600;
        const nearest = dates.reduce((best, date, i) => Math.abs(xAt(date) - x) < Math.abs(xAt(dates[best]) - x) ? i : best, 0); setInspected(nearest);
      }}
      onKeyDown={e => { if (['ArrowLeft','ArrowRight','Home','End','Escape'].includes(e.key)) {
        e.preventDefault(); setInspected(i => e.key === 'Escape' ? null : e.key === 'Home' ? 0 : e.key === 'End' ? 14 : Math.max(0, Math.min(14, (i ?? 10) + (e.key === 'ArrowRight' ? 1 : -1))));
      } }}>
      <svg ref={chartRef} viewBox="0 0 600 364" role="img" aria-label={`Illustrative case forecast for ${region.name}, September to December 2021`}>
        <title>Case forecast — {region.name}. Illustrative 2021 prototype data.</title>
        <defs><clipPath id={clip}><rect x={xAt(dates[10])} y="10" width={588 - xAt(dates[10])} height="320" className="risk-forecast-clip"/></clipPath></defs>
        <g className="risk-chart-axes" fill="none" stroke="#e8edf2" strokeWidth="1">
          {[0,10,20,30,40,50,60].map(v => <g key={v}><path d={`M40 ${yAt(v)} H588`} pathLength="1"/><text x="30" y={yAt(v) + 4} textAnchor="end" fill="#929ca6" stroke="none" className="risk-chart-label">{v}</text></g>)}
          {['2021-09-04','2021-09-25','2021-10-16','2021-11-06','2021-11-27'].map((date, i) => <g key={date}><path d={`M${xAt(date)} 28 V318`} pathLength="1"/><text x={xAt(date)} y="338" textAnchor={i === 0 ? 'start' : 'middle'} fill="#929ca6" stroke="none" className="risk-chart-label"><tspan className="risk-date-year">{date.slice(0,5)}</tspan>{date.slice(5)}</text></g>)}
        </g>
        <path className="risk-history-curve" d={curve(history)} fill="none" stroke="#86bfe7" strokeWidth="1.8" pathLength="1"/>
        <g clipPath={`url(#${clip})`}>
          <path className="risk-confidence-band" d={band} fill="#d8eaf6" fillOpacity=".78"/>
          <path className="risk-confidence-edge" d={curve(upper)} fill="none" stroke="#b6d8f0" strokeWidth=".8" pathLength="1"/>
          <path className="risk-confidence-edge" d={curve(lower)} fill="none" stroke="#b6d8f0" strokeWidth=".8" pathLength="1"/>
          <path className="risk-projection-curve" d={curve(forecast)} fill="none" stroke="#67acd9" strokeWidth="1.8" strokeDasharray="2 3"/>
        </g>
        {selected && <g className="risk-inspect" aria-hidden="true"><path d={`M${selected.x} 28 V318`} stroke="#94b1c6" strokeDasharray="3 4"/><circle cx={selected.x} cy={selected.y} r="4" fill="#5ca8d8" stroke="#fff" strokeWidth="2"/></g>}
      </svg>
      {selected && <div className="risk-tooltip" style={{ left:`${Math.max(18, Math.min(81, selected.x / 600 * 100))}%`, top:`${Math.max(12, selected.y / 364 * 100 - 22)}%` }}><span>{selected.date}{inspected! > 10 ? ' · Forecast' : ''}</span><strong>{selected.value.toFixed(1)} <small>per 100k</small></strong></div>}
    </div>
    <p className="risk-sr" id={hint}>Use the left and right arrow keys to inspect dates. {selected ? `${selected.date}: ${selected.value} cases per 100,000.` : 'Illustrative data from a 2021 prototype.'}</p>
  </div>;
}

export default function RiskDashboard({ projectId }: Props) {
  const [locale, setLocale] = useState(0), [entered, setEntered] = useState(false), [chartVisible, setChartVisible] = useState(false);
  const [paused, setPaused] = useState(false), [delay, setDelay] = useState(.95), [revision, setRevision] = useState(0), [shareState, setShareState] = useState('');
  const root = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null), chartRef = useRef<SVGSVGElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]), startedAt = useRef(0), chartStarted = useRef(false), shareTimer = useRef<ReturnType<typeof setTimeout>>();
  const region = regions[locale];
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const show = () => { if (preference.matches) { chartStarted.current = true; setEntered(true); setChartVisible(true); setDelay(0); } };
    show(); preference.addEventListener('change', show);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const enough = entry.intersectionRect.height >= (entry.target === root.current ? Math.min(entry.boundingClientRect.height * .35, innerHeight * .34) : Math.min(entry.boundingClientRect.height * .6, innerHeight * .48));
        if (entry.target === root.current) {
          setPaused(!entry.isIntersecting);
          if (enough && !startedAt.current) { startedAt.current = performance.now(); setEntered(true); }
        } else if (enough && !chartStarted.current) { chartStarted.current = true; setDelay(Math.max(0, .95 - (performance.now() - (startedAt.current || performance.now())) / 1000)); setChartVisible(true); }
      }
    }, { threshold:[0,.1,.2,.3,.4,.5,.6,.7,1] });
    if (root.current) observer.observe(root.current); if (panel.current) observer.observe(panel.current);
    const hide = () => setPaused(document.hidden || !root.current || root.current.getBoundingClientRect().bottom < 0 || root.current.getBoundingClientRect().top > innerHeight);
    document.addEventListener('visibilitychange', hide);
    return () => { observer.disconnect(); preference.removeEventListener('change', show); document.removeEventListener('visibilitychange', hide); clearTimeout(shareTimer.current); };
  }, []);
  function select(index: number) { setLocale(index); setDelay(0); }
  async function share() {
    try { await navigator.clipboard.writeText(`${location.origin}/practice.html#case=${projectId}`); setShareState('Link copied'); }
    catch { setShareState('Copy unavailable'); }
    clearTimeout(shareTimer.current); shareTimer.current = setTimeout(() => setShareState(''), 2500);
  }
  function download() {
    if (!chartRef.current) return;
    const svg = chartRef.current.cloneNode(true) as SVGSVGElement;
    svg.querySelector('.risk-inspect')?.remove(); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', '1200'); svg.setAttribute('height', '728');
    svg.setAttribute('font-family', 'Arial, sans-serif'); svg.setAttribute('font-size', '11');
    svg.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type:'image/svg+xml' }));
    const a = document.createElement('a'); a.href = url; a.download = `${region.name.split(',')[0].toLowerCase()}-illustrative-forecast.svg`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="risk-study">
    <div ref={root} className={`risk-screen ${entered ? 'is-entered' : ''}`} data-paused={paused} aria-label="Interactive reconstruction of the Public Health Company risk dashboard">
      <aside className="risk-sidebar" aria-label="Original dashboard navigation">
        <div className="risk-brand"><img className="risk-brand-logo" src="/portfolio/logos/general-motors.svg" alt="" width="40" height="40"/><strong>General Motors</strong></div>
        <div className="risk-nav-group"><span className="is-selected"><Home/>Risk Dashboard</span><span><BarChart3/>Analytics</span></div>
        <div className="risk-nav-group"><span><Settings/>Settings</span><span><Bell/>Notifications</span></div>
        <div className="risk-nav-account"><span><UserRound/>Account</span><span><LogOut/>Logout</span></div>
      </aside>
      <div className="risk-main">
        <header className="risk-topbar"><h3>Pathogenic Threat Risk Dashboard</h3><div><button onClick={share} aria-label="Copy project link"><Share2/><span>{shareState || 'Share'}</span></button><button onClick={download} aria-label="Download current forecast as SVG"><Download/><span>Download</span></button></div></header>
        <div className="risk-panels">
          <section className="risk-table-panel" aria-labelledby="risk-locations-heading">
            <header className="risk-panel-heading"><h4 id="risk-locations-heading">Risk by location</h4><MoreHorizontal aria-hidden="true"/></header>
            <table className="risk-table"><caption className="risk-sr">Illustrative weekly risk scores. Select a location to explore its forecast.</caption><thead><tr><td/><th scope="col">11/13</th><th scope="col">11/20</th><th scope="col">11/27</th><th scope="col">12/04</th><th scope="col">Trend</th></tr></thead>
              <tbody key={revision}>{regions.map((r, i) => <tr key={r.name} className={locale === i ? 'is-selected' : ''} style={{ '--row-delay':`${i * .12}s` } as CSSProperties} onClick={() => select(i)}>
                <th scope="row"><button ref={el => { buttons.current[i] = el; }} aria-pressed={locale === i} onClick={() => select(i)} onKeyDown={e => {
                  if (['ArrowDown','ArrowUp'].includes(e.key)) { e.preventDefault(); const next = (i + (e.key === 'ArrowDown' ? 1 : regions.length - 1)) % regions.length; select(next); buttons.current[next]?.focus(); }
                }}>{r.name}</button></th>
                {r.scores.map((score, j) => <td key={j} title={`Week ${['11/13','11/20','11/27','12/04'][j]}: risk score ${score}`}><span>{score}</span></td>)}
                <td className={r.trend === 'down' ? 'is-down' : ''}>{r.trend === 'down' ? <ArrowDownRight aria-label="Decreasing"/> : <ArrowRight aria-label="Steady"/>}</td>
              </tr>)}</tbody>
            </table>
            <details className="risk-method" open><summary>How is this calculated?<ChevronDown size={12}/></summary><p>The risk score is a compound measure composed of three primary factors: the disease case forecast, the governmental austerity index for a given week, and a measure of human behavior. Before being compounded, these factors are assigned individual weights based on accuracy, confidence, and the impact the factor has on a scenario’s outcome.</p></details>
          </section>
          <section ref={panel} className={`risk-chart-panel ${chartVisible ? 'is-visible' : ''}`} aria-labelledby="risk-selected-location" style={{ '--chart-delay':`${delay}s` } as CSSProperties}>
            <header className="risk-panel-heading"><h4 id="risk-selected-location" aria-live="polite">{region.name}</h4><MoreHorizontal aria-hidden="true"/></header>
            <div className="risk-chart-sequence" key={`${locale}:${revision}`}><Forecast region={region} chartRef={chartRef}/>
              <div className="risk-indices"><div><p className="risk-micro-heading">Austerity index</p><strong>{region.austerity}<ArrowRight/></strong><p>This measure quantifies the willingness and strictness of governmental intervention in response to pandemic disease events.</p></div><div><p className="risk-micro-heading">Behavior index</p><strong>{region.behavior}<ArrowRight/></strong><p>This measure quantifies the disease transmission risk associated with human activity and behavior in a given location.</p></div></div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <div className="risk-study-caption"><span>Interactive reconstruction · Illustrative 2021 data</span><span>Select a location or explore the chart <button aria-label="Replay dashboard animation" onClick={() => { setDelay(.95); setRevision(r => r + 1); }}><RotateCcw size={12}/>Replay</button></span></div>
    <span className="risk-sr" role="status">{shareState}</span>
  </div>;
}
