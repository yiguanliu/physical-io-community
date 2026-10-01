import PublicShell from '@/components/public/PublicShell';
import { Hero } from '@/components/public/Sections';
import '@/components/events/events.css';

/** Shown immediately while a fresh copy of /events renders, so navigation never appears stuck. */
export default function EventsLoading() {
  return <PublicShell>
    <Hero title={<>Community Events<br />for Curious People</>}>Come for a talk, meet a collaborator, or make your first robot.</Hero>
    <div className="events-loading" role="status" aria-label="Loading episodes" />
  </PublicShell>;
}
