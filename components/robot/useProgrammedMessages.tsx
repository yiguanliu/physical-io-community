'use client';
import { layoutMessageText } from '@/lib/robot/dot-matrix';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Megaphone, Pause, Play, Pencil } from 'lucide-react';
import { Dialog, IconButton, Skeleton } from '@/workspace-ui/src';
import { displayMessageSchema, type DisplayMessage } from '@/lib/robot/playlist';
import type { RobotPerformance } from '@/lib/robot/contracts';
import './messages.css';

const MessageEditor = dynamic(() => import('./MessageEditor'), { loading: () => <Skeleton label="Loading editor" /> });

export function useProgrammedMessages(available: boolean) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [reading, setReading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState<RobotPerformance | null>(null);
  const firstAnnouncementAt = useRef<number | null>(null);
  const hasAnnounced = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/robot/messages', { cache: 'no-store', signal });
      if (!response.ok) return; // Retain the last confirmed playlist on transient failure.
      const data = await response.json();
      const items = displayMessageSchema.array().max(20).parse(data.messages);
      setMessages(current => JSON.stringify(current) === JSON.stringify(items) ? current : items);
    } catch { /* A display outage must not interrupt chat or calls. */ }
  }, []);
  useEffect(() => {
    firstAnnouncementAt.current ??= performance.now() + 3000;
    const controller = new AbortController();
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(query.matches);
    const visibility = () => { setVisible(!document.hidden); if (!document.hidden) void refresh(controller.signal); };
    motion(); visibility();
    query.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    const timer = setInterval(() => { if (!document.hidden) void refresh(controller.signal); }, 60000);
    void fetch('/api/admin/robot-messages?access=1', { cache: 'no-store', signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => { if (!controller.signal.aborted) setCanEdit(data?.canEdit === true); }).catch(() => {});
    return () => { controller.abort(); clearInterval(timer); query.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, [refresh]);

  const playing = available && visible && !paused && !reduced && !editing && !reading;
  useEffect(() => {
    setActive(null);
    const enabled = messages.filter(message => message.enabled);
    if (!playing || !enabled.length) return;
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    function faceInterval(delay = 5000) {
      setActive(null);
      timer = setTimeout(() => {
        const message = enabled[index];
        hasAnnounced.current = true;
        setActive({ id: Date.now(), reply: '', expression: 'friendly', gesture: 'none', display: 'text', displayText: layoutMessageText(message.text, message.lines), textStyle: 'matrix', scrollSpeed: message.speed });
        timer = setTimeout(() => { index = (index + 1) % enabled.length; faceInterval(); }, message.duration * 1000);
      }, delay);
    }
    // Loading the playlist/scene counts toward the initial three-second delay.
    faceInterval(hasAnnounced.current ? 5000 : Math.max(0, (firstAnnouncementAt.current ?? performance.now()) - performance.now()));
    return () => clearTimeout(timer);
  }, [playing, messages]);

  const controls = <>
    {messages.length > 0 && <>
      {!reduced && <IconButton label={paused ? 'Resume announcements' : 'Pause announcements'} title={paused ? 'Resume announcements' : 'Pause announcements'} variant="ghost" onClick={() => setPaused(value => !value)}>{paused ? <Play size={18} /> : <Pause size={18} />}</IconButton>}
      <IconButton label="Read announcements" title="Read announcements" variant="ghost" onClick={() => setReading(true)}><Megaphone size={18} /></IconButton>
    </>}
    {canEdit && <IconButton label="Edit OHI messages" title="Edit OHI messages · Admin" variant="ghost" onClick={() => setEditing(true)}><Pencil size={18} /></IconButton>}
  </>;
  const dialogs = <>
    <Dialog open={reading} onOpenChange={setReading} title="OHI announcements" description="All current messages, without scrolling or animation."><div className="ohi-editor-stack">{messages.map(message => <p className="ohi-announcement-copy" key={message.id}>{message.text}</p>)}</div></Dialog>
    {canEdit && <Dialog open={editing} onOpenChange={open => { if (open || !editorDirty || window.confirm('Close the editor? Any unpublished changes will be discarded.')) setEditing(open); }} title="OHI messages" description="Admin only · Edit and publish the homepage LED playlist.">{editing && <MessageEditor onPublished={() => void refresh()} onDirtyChange={setEditorDirty} />}</Dialog>}
  </>;
  return { performance: playing ? active : null, controls, dialogs, pause: () => setPaused(true) };
}
