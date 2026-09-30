import PixelBlast from './PixelBlast';

/** The dithered pixel backdrop shared by the public content pages. Place it as the first child of PublicShell. */
export default function PixelBackdrop() {
  return <div className="public-pixel-backdrop" aria-hidden><PixelBlast variant="square" pixelSize={3.5} color="#E53000" patternScale={3} patternDensity={1.2} pixelSizeJitter={0.85} enableRipples={true} speed={0.6} edgeFade={0.27} transparent /></div>;
}
