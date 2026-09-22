import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';

export type TitleHandle = { render: (seconds: number, immediate?: boolean) => void };
type Props = { text: string; time: number; animate: boolean };
const CIPHER = '01/:+<>_?';

/** The player clock owns the reveal, so pausing and seeking never leave stray timers. */
const DecodedTitle = forwardRef<TitleHandle, Props>(function DecodedTitle({ text, time, animate }, ref) {
  const heading = useRef<HTMLHeadingElement>(null);
  const letters = useRef<HTMLElement[]>([]);
  const lastFrame = useRef(-1);
  const render = useCallback((seconds: number, immediate = false) => {
    const frame = immediate ? 10000 : Math.floor(seconds * 18);
    if (frame === lastFrame.current) return;
    lastFrame.current = frame;
    const cells = letters.current;
    // One short cursor blink, then a wave of decoded letters with a narrow cipher frontier.
    const duration = Math.min(1.45, .65 + cells.length * .025);
    const progress = immediate ? 1 : Math.max(0, Math.min(1, (seconds - .28) / duration));
    const settled = progress >= 1;
    const frontier = progress * cells.length;
    cells.forEach((cell, i) => {
      const resolved = settled || i < Math.floor(frontier);
      const state = resolved ? 'resolved' : i < frontier + 4 && seconds >= .28 ? 'cipher' : 'pending';
      if (cell.dataset.state !== state) cell.dataset.state = state;
      const next = state === 'cipher' ? CIPHER[(i * 7 + frame * 3) % CIPHER.length] : '';
      if (cell.dataset.glyph !== next) cell.dataset.glyph = next;
      const caret = !settled && i === Math.min(cells.length - 1, Math.floor(frontier))
        && (seconds >= .28 || seconds < .12 || seconds > .22);
      cell.classList.toggle('is-caret', caret);
    });
    if (heading.current) heading.current.dataset.decoded = String(settled);
  }, []);

  useImperativeHandle(ref, () => ({ render }), [render]);
  useLayoutEffect(() => {
    letters.current = Array.from(heading.current?.querySelectorAll<HTMLElement>('.arc-letter') || []);
    lastFrame.current = -1;
    render(time, !animate);
  }, [text, animate, time, render]);

  return <h2 ref={heading} className="arc-title" aria-label={text.replace(/\n/g, ' ')}>
    {text.split('\n').map((line, lineIndex) => <span className="arc-title-line" aria-hidden="true" key={lineIndex}>
      {line.split(/(\s+)/).map((word, wordIndex) => /^\s+$/.test(word) ? word :
        <span className="arc-title-word" key={wordIndex}>{Array.from(word).map((letter, i) =>
          <span className="arc-letter" key={i}>{letter}</span>
        )}</span>)}
    </span>)}
  </h2>;
});
export default DecodedTitle;
