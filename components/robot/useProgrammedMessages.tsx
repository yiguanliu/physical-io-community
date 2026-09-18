'use client';
import { layoutMessageText } from '@/lib/robot/dot-matrix';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MoreHorizontal, Megaphone, Pause, Play, Pencil, ArrowRight } from 'lucide-react';
import { ContextMenu, Dialog, IconButton, Skeleton } from '@/workspace-ui/src';
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
  const playImmediately = useRef(false);

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
    const checkAccess = () => {
      void fetch('/api/admin/robot-messages?access=1', { cache: 'no-store', signal: controller.signal })
        .then(response => response.ok ? response.json() : null)
        .then(data => { if (!controller.signal.aborted) { const allowed = data?.canEdit === true; setCanEdit(allowed); if (!allowed) setEditing(false); } })
        .catch(() => { if (!controller.signal.aborted) { setCanEdit(false); setEditing(false); } });
    };
    const visibility = () => { setVisible(!document.hidden); if (!document.hidden) { void refresh(controller.signal); checkAccess(); } };
    motion(); visibility();
    query.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    const timer = setInterval(() => { if (!document.hidden) void refresh(controller.signal); }, 60000);
    return () => { controller.abort(); clearInterval(timer); query.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, [refresh]);

  const playing = available && visible && !paused && !reduced && !editing && !reading;
  useEffect(() => {
    setActive(null);
    const enabled = messages.filter(message => message.enabled);
    if (!playing || !enabled.length) return;
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    function showAnnouncement() {
      const message = enabled[index];
      hasAnnounced.current = true;
      setActive({ id: Date.now(), reply: '', expression: 'friendly', gesture: 'none', display: 'text', displayText: layoutMessageText(message.text, message.lines), textStyle: 'matrix', scrollSpeed: message.speed });
      timer = setTimeout(() => { index = (index + 1) % enabled.length; faceInterval(); }, message.duration * 1000);
    }
    function faceInterval(delay = 5000) {
      setActive(null);
      timer = setTimeout(showAnnouncement, delay);
    }
    if (playImmediately.current) {
      playImmediately.current = false;
      showAnnouncement();
    } else {
      // Loading the playlist/scene counts toward the initial three-second delay.
      faceInterval(hasAnnounced.current ? 5000 : Math.max(0, (firstAnnouncementAt.current ?? performance.now()) - performance.now()));
    }
    return () => clearTimeout(timer);
  }, [playing, messages]);

  const announcementActions = [
    ...(messages.length > 0 && !reduced ? [{ label: paused ? 'Resume announcements' : 'Pause announcements', icon: paused ? <Play size={18} /> : <Pause size={18} />, onSelect: () => { playImmediately.current = paused; setPaused(!paused); } }] : []),
    ...(messages.length > 0 ? [{ label: 'Read announcements', icon: <Megaphone size={18} />, onSelect: () => setReading(true) }] : []),
    ...(canEdit ? [{ label: 'Edit OHI messages', icon: <Pencil size={18} />, onSelect: () => setEditing(true) }] : []),
  ];
  const controls = announcementActions.length > 0 ? <ContextMenu label="Announcements" side="left" align="center" trigger={<IconButton label="Announcement options" title="Announcement options" variant="ghost"><MoreHorizontal size={18} /></IconButton>} items={announcementActions} /> : null;
  const dialogs = <>
    <Dialog open={reading} onOpenChange={setReading} title="OHI announcements" description="All current messages, without scrolling or animation."><div className="ohi-editor-stack">{messages.map(message => <p className="ohi-announcement-copy" key={message.id}>{message.text}</p>)}<div className="ohi-editor-actions"><Link href="/events#upcoming" className="ui-button ui-button-primary" onClick={() => setReading(false)}>View upcoming events <ArrowRight size={16} aria-hidden="true" /></Link></div></div></Dialog>
    {canEdit && <Dialog open={editing} onOpenChange={open => { if (open || !editorDirty || window.confirm('Close the editor? Any unpublished changes will be discarded.')) setEditing(open); }} title="OHI messages" description="Admin only · Edit and publish the homepage LED playlist.">{editing && <MessageEditor onPublished={() => void refresh()} onDirtyChange={setEditorDirty} />}</Dialog>}
  </>;
  return { performance: playing ? active : null, controls, dialogs, pause: () => setPaused(true) };
}
