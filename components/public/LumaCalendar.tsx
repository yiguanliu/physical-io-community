import { LUMA_CALENDAR_EMBED_URL } from '@/lib/site';

export default function LumaCalendar() {
  return (
    <div className="public-luma-preview">
      <iframe
        src={LUMA_CALENDAR_EMBED_URL}
        title="Upcoming Physical I/O events on Luma"
        aria-describedby="luma-privacy-note"
        width="100%"
        height="400"
        loading="lazy"
        referrerPolicy="no-referrer"
        allow="camera 'none'; microphone 'none'; geolocation 'none'"
      />
    </div>
  );
}
