'use client';
import { useEffect, useState } from 'react';
import { layoutMessageText, matrixPoints } from '@/lib/robot/dot-matrix';
import type { DisplayMessage } from '@/lib/robot/playlist';
import { Button } from '@/workspace-ui/src';
import './messages.css';

export default function MatrixPreview({ message }: { message: DisplayMessage }) {
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReduced(query.matches); if (query.matches) setPlaying(false); };
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    setSeconds(0);
    if (!playing || reduced) return;
    const start = performance.now();
    const timer = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      setSeconds(Math.min(elapsed, message.duration));
      if (elapsed >= message.duration) { clearInterval(timer); setPlaying(false); }
    }, 100);
    return () => clearInterval(timer);
  }, [playing, reduced, message.text, message.speed, message.duration, message.lines]);
  const text = layoutMessageText(message.text, message.lines);
  const points = matrixPoints(text, seconds, message.speed);
  const top = Math.floor((49 - (text.split('\n').length * 10 - 3)) / 2);
  return <div className="ohi-message-preview">
    <svg viewBox="-4 -1 51 51" role="img" aria-label={`LED preview: ${message.text}`}>
      <circle cx="21" cy="24" r="24.5" className="ohi-matrix-surface" />
      {points.map(([x, y]) => <rect key={`${x}-${y}`} x={x + 4} y={y + top} width=".78" height=".78" fill="currentColor" />)}
    </svg>
    <Button variant="ghost" disabled={reduced} onClick={() => setPlaying(value => !value)}>{reduced ? 'Static preview · reduced motion' : playing ? 'Stop preview' : 'Play preview'}</Button>
    <p>5 × 7 dot-matrix lettering · {message.lines} {message.lines === 1 ? 'line' : 'lines'} · {message.duration}s</p>
  </div>;
}
