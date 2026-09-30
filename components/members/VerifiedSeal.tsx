import './verified.css';
// Certified community admin seal: a 12-lobe wavy badge with a rounded check (supplied reference).
// Raised-cosine profile to the power .75: broad rounded lobes with smooth, narrower valleys.
const LOBES = 12, STEPS = 288;
const SEAL_PATH = Array.from({ length: STEPS }, (_, i) => {
  const angle = (i / STEPS) * Math.PI * 2;
  const radius = 9.4 + 2.2 * ((1 + Math.cos(angle * LOBES)) / 2) ** .75;
  return `${i ? 'L' : 'M'}${(12 + radius * Math.sin(angle)).toFixed(2)} ${(12 - radius * Math.cos(angle)).toFixed(2)}`;
}).join('') + 'Z';

export default function VerifiedSeal({ size = 22, label = 'Verified community admin' }: { size?: number; label?: string }) {
  return <svg className="verified-seal" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
    <title>{label}</title>
    <path d={SEAL_PATH} fill="var(--verified-blue, #48acf2)" />
    <path d="M8.3 12.4l2.5 2.4 4.9-3.7" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function CommunityAdminMark({ size }: { size?: number }) {
  return <span className="community-admin-mark"><VerifiedSeal size={size} /><span className="community-admin-badge">Community admin</span></span>;
}
