'use client';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, EmptyState, Field, IconButton, Select, Skeleton, Switch, TextArea } from '@/workspace-ui/src';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { playlistSchema, exampleMessage, type DisplayPlaylist, type DisplayMessage } from '@/lib/robot/playlist';
import { minimumDuration } from '@/lib/robot/dot-matrix';
import MatrixPreview from './MatrixPreview';
import './messages.css';

export default function MessageEditor({ onPublished, onDirtyChange }: { onPublished?: () => void; onDirtyChange?: (dirty: boolean) => void }) {
  const [saved, setSaved] = useState<DisplayPlaylist | null>(null);
  const [draft, setDraft] = useState<DisplayPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState('');
  const lock = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  async function load(signal?: AbortSignal) {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/robot-messages', { cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load the playlist.');
      const playlist = playlistSchema.parse(data);
      setSaved(playlist); setDraft(playlist); setPreviewId(playlist.messages[0]?.id ?? ''); setRemoving(null);
    } catch (error) {
      if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Could not load messages.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function update(id: string, patch: Partial<DisplayMessage>) {
    setNotice(''); setDraft(current => current && ({ ...current, messages: current.messages.map(item => item.id === id ? { ...item, ...patch } : item) }));
  }
  function move(index: number, offset: number) {
    setDraft(current => {
      if (!current) return current;
      const messages = [...current.messages];
      [messages[index], messages[index + offset]] = [messages[index + offset], messages[index]];
      return { ...current, messages };
    });
  }
  function add(example = false) {
    const message = { ...exampleMessage, id: crypto.randomUUID(), text: example ? exampleMessage.text : 'Hello, curious minds!' };
    setDraft(current => current && ({ ...current, messages: [...current.messages, message] })); setPreviewId(message.id); setNotice('');
  }
  async function publish() {
    if (lock.current || !draft) return;
    const parsed = playlistSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join(' ')); return; }
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/robot-messages', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not publish the playlist.');
      const playlist = playlistSchema.parse(result);
      setSaved(playlist); setDraft(playlist); setNotice('Published. New visits see this playlist; open homepages refresh within a minute.'); onPublished?.();
    } catch (error) { setError(error instanceof Error ? error.message : 'Publishing failed. Your draft is still here.'); }
    finally { lock.current = false; setBusy(false); }
  }
  if (loading) return <Skeleton label="Loading OHI messages" />;
  if (!draft) return <div className="ohi-editor-stack"><Alert title="Messages unavailable" tone="danger">{error}</Alert><Button onClick={() => void load()}>Retry loading</Button></div>;
  const preview = draft.messages.find(item => item.id === previewId) ?? draft.messages[0];
  return <div className="ohi-message-editor">
    <form className="ohi-editor-stack" onSubmit={event => { event.preventDefault(); void publish(); }}>
      <p>Messages play in order while OHI is idle, with a 5-second face interval. Chat and calls take priority. Changes stay private until you publish.</p>
      {error && <Alert title="Could not publish" tone="danger">{error}</Alert>}
      {notice && <Alert title="Playlist saved" tone="success">{notice}</Alert>}
      <div className="ohi-editor-actions">
        <Button disabled={busy || draft.messages.length >= 20} onClick={() => add()}><Plus size={16} />Add message</Button>
        <Button variant="ghost" disabled={busy || draft.messages.length >= 20} onClick={() => add(true)}>Add event example</Button>
        <span>{draft.messages.length}/20 messages · {dirty ? 'Unpublished changes' : 'Saved'}</span>
      </div>
      {!draft.messages.length && <EmptyState title="No programmed messages" description="Publish this empty playlist to return OHI to its normal expressions." />}
      {draft.messages.map((message, index) => <Card key={message.id} className="ohi-editor-stack">
        <div className="ohi-editor-actions">
          <h3>Message {index + 1}</h3>
          <IconButton label={`Move message ${index + 1} up`} disabled={busy || index === 0} variant="ghost" onClick={() => move(index, -1)}><ArrowUp size={16} /></IconButton>
          <IconButton label={`Move message ${index + 1} down`} disabled={busy || index === draft.messages.length - 1} variant="ghost" onClick={() => move(index, 1)}><ArrowDown size={16} /></IconButton>
          <IconButton label={`Delete message ${index + 1}`} disabled={busy} variant="ghost" onClick={() => setRemoving(message.id)}><Trash2 size={16} /></IconButton>
        </div>
        {removing === message.id && <div className="ohi-editor-actions"><p>Remove this message from the draft?</p><Button variant="danger" onClick={() => { setDraft({ ...draft, messages: draft.messages.filter(item => item.id !== message.id) }); setRemoving(null); }}>Remove message</Button><Button variant="ghost" onClick={() => setRemoving(null)}>Keep message</Button></div>}
        <TextArea label={`Message ${index + 1} text`} value={message.text} rows={3} maxLength={240} required disabled={busy} hint="Up to 240 characters. Text fits the selected line count; matching line breaks are preserved. No Markdown needed." onChange={event => update(message.id, { text: event.target.value })} />
        <Select label={`Message ${index + 1} display lines`} value={String(message.lines)} disabled={busy} options={[{ value: '1', label: '1 line' }, { value: '2', label: '2 lines' }, { value: '3', label: '3 lines' }]} onValueChange={value => {
          const lines = Number(value);
          update(message.id, { lines, duration: Math.min(120, Math.max(message.duration, minimumDuration(message.text, message.speed, lines))) });
        }} />
        <div className="ohi-editor-fields">
          <Field label={`Message ${index + 1} duration (seconds)`} type="number" min={5} max={120} step={1} value={message.duration} disabled={busy} hint={`At least ${minimumDuration(message.text, message.speed, message.lines)}s at this speed.`} onChange={event => update(message.id, { duration: Number(event.target.value) })} />
          <Field label={`Message ${index + 1} speed (LED columns/second)`} type="number" min={1} max={30} step={1} value={message.speed} disabled={busy} hint="Higher is faster. 10 is a comfortable starting point." onChange={event => update(message.id, { speed: Number(event.target.value) })} />
        </div>
        <Switch label={`Include message ${index + 1} in playback`} checked={message.enabled} disabled={busy} onCheckedChange={enabled => update(message.id, { enabled })} />
        <Button variant="ghost" aria-pressed={preview?.id === message.id} onClick={() => setPreviewId(message.id)}>Preview message {index + 1}</Button>
      </Card>)}
      <div className="ohi-editor-actions">
        <Button type="submit" variant="primary" busy={busy} disabled={!dirty}>Publish playlist</Button>
        <Button disabled={busy || !dirty} variant="ghost" onClick={() => { if (window.confirm('Discard unpublished changes and load the saved playlist?')) void load(); }}>Reload saved playlist</Button>
      </div>
    </form>
    <aside className="ohi-editor-preview" aria-label="Message preview">{preview && <MatrixPreview message={preview} />}<p>The preview uses the same dot-matrix glyphs and timing as OHI. Reduced-motion visitors can read all announcements without animation.</p></aside>
  </div>;
}
