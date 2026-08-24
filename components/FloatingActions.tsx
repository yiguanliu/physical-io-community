import Link from "next/link";
import { CalendarIcon } from "./SocialIcons";
import { LUMA_URL } from "@/lib/site";

/**
 * Floating action buttons pinned to the bottom-right corner: an "Ask Us
 * Anything" (?) shortcut stacked above the Luma events calendar.
 * `showAsk={false}` hides the (?) on the Ask Us Anything page itself.
 */
export default function FloatingActions({ showAsk = true }: { showAsk?: boolean }) {
  return (
    <div className="fab-stack">
      {showAsk && (
        <Link className="fab" href="/askusanything" aria-label="Ask us anything">
          <span className="fab-glyph" aria-hidden="true">?</span>
        </Link>
      )}
      <a
        className="fab"
        href={LUMA_URL}
        target="_blank"
        rel="noopener"
        aria-label="See upcoming Physical I/O events on Luma"
      >
        <CalendarIcon />
      </a>
    </div>
  );
}
