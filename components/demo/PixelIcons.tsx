"use client";

// Susan Kare-style monochrome pixel icons, authored as bitmaps and rendered as
// crisp 1×1 rects. '#' = filled pixel, anything else = empty.

function Bitmap({ rows, className }: { rows: string[]; className?: string }) {
  const w = rows[0].length;
  const h = rows.length;
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "#") rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
    }
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} shapeRendering="crispEdges" fill="currentColor" aria-hidden="true">
      {rects}
    </svg>
  );
}

const HAPPY_MAC = [
  "................",
  ".##############.",
  ".#............#.",
  ".#.##########.#.",
  ".#.#........#.#.",
  ".#.#.#....#.#.#.",
  ".#.#........#.#.",
  ".#.#.#....#.#.#.",
  ".#.#..####..#.#.",
  ".#.##########.#.",
  ".#............#.",
  ".#...######...#.",
  ".#............#.",
  ".##############.",
  "..##......##....",
  "................",
];

const SAD_MAC = [
  "................",
  ".##############.",
  ".#............#.",
  ".#.##########.#.",
  ".#.#........#.#.",
  ".#.#.#....#.#.#.",
  ".#.#........#.#.",
  ".#.#..####..#.#.",
  ".#.#.#....#.#.#.",
  ".#.##########.#.",
  ".#............#.",
  ".#...######...#.",
  ".#............#.",
  ".##############.",
  "..##......##....",
  "................",
];

const FLOPPY = [
  "................",
  ".##############.",
  ".#....####..#.#.",
  ".#....#..#..#.#.",
  ".#....#..#....#.",
  ".#....####....#.",
  ".#............#.",
  ".#............#.",
  ".#.##########.#.",
  ".#.#........#.#.",
  ".#.#........#.#.",
  ".#.#........#.#.",
  ".#.##########.#.",
  ".#............#.",
  ".##############.",
  "................",
];

const DOC = [
  "................",
  ".##########.....",
  ".#........#.....",
  ".#..####..#.....",
  ".#........#.....",
  ".#..####..#.....",
  ".#........#.....",
  ".#..####..#.....",
  ".#........#.....",
  ".#..####..#.....",
  ".#........#.....",
  ".#..####..#.....",
  ".#........#.....",
  ".##########.....",
  "................",
  "................",
];

const LOCK = [
  "................",
  "................",
  "....######......",
  "...#......#.....",
  "...#......#.....",
  "..##########....",
  "..#........#....",
  "..#...##...#....",
  "..#...##...#....",
  "..#....#...#....",
  "..#........#....",
  "..##########....",
  "................",
  "................",
  "................",
  "................",
];

const FOLDER = [
  "................",
  "...####.........",
  "..#....#........",
  ".############...",
  ".#..........#...",
  ".#..........#...",
  ".#..........#...",
  ".#..........#...",
  ".#..........#...",
  ".#..........#...",
  ".############...",
  "................",
  "................",
  "................",
  "................",
  "................",
];

// ---- Control icons (pixel style) ----
const I_NOD = [
  ".....#.....",
  "....###....",
  "...#####...",
  ".....#.....",
  ".....#.....",
  ".....#.....",
  ".....#.....",
  "...#####...",
  "....###....",
  ".....#.....",
];
const I_SHAKE = [
  "...........",
  "...#...#...",
  "..#.....#..",
  ".#########.",
  "..#.....#..",
  "...#...#...",
  "...........",
];
const I_TILT = [
  "........##.",
  ".........#.",
  "........#..",
  ".......#...",
  "......#....",
  ".....#.....",
  "....#......",
  "...#......#",
  ".#..#....#.",
  ".##......#.",
];
const I_SCAN = [
  "...........",
  "...#####...",
  "..#.....#..",
  ".#..###..#.",
  "#...###...#",
  ".#..###..#.",
  "..#.....#..",
  "...#####...",
  "...........",
];
const I_SPIN = [
  "...#####...",
  "..#.....#..",
  ".#.......#.",
  ".#.......#.",
  ".#.......#.",
  "..#.....#.#",
  "...#####.##",
  ".........#.",
  "...........",
];
const I_CAMERA = [
  "...........",
  ".....##....",
  "..#######..",
  "..#.....#..",
  "..#.###.#..",
  "..#.#.#.#..",
  "..#.###.#..",
  "..#.....#..",
  "..#######..",
  "...........",
];
const I_SCALE = [
  "...........",
  ".###...###.",
  ".#.......#.",
  ".#.......#.",
  "...........",
  "...........",
  ".#.......#.",
  ".#.......#.",
  ".###...###.",
  "...........",
];
const I_FULL = [
  "#####......",
  "###........",
  "#.#........",
  "#..#.......",
  "....#......",
  "......#....",
  ".......#..#",
  "........#.#",
  "........###",
  "......#####",
];
const I_POWER = [
  "...........",
  ".....#.....",
  ".....#.....",
  "..#..#..#..",
  ".#...#...#.",
  ".#.......#.",
  ".#.......#.",
  "..#.....#..",
  "...#####...",
  "...........",
];

export function IconNod({ className }: { className?: string }) {
  return <Bitmap rows={I_NOD} className={className} />;
}
export function IconShake({ className }: { className?: string }) {
  return <Bitmap rows={I_SHAKE} className={className} />;
}
export function IconTilt({ className }: { className?: string }) {
  return <Bitmap rows={I_TILT} className={className} />;
}
export function IconScan({ className }: { className?: string }) {
  return <Bitmap rows={I_SCAN} className={className} />;
}
export function IconSpin({ className }: { className?: string }) {
  return <Bitmap rows={I_SPIN} className={className} />;
}
export function IconCamera({ className }: { className?: string }) {
  return <Bitmap rows={I_CAMERA} className={className} />;
}
export function IconScale({ className }: { className?: string }) {
  return <Bitmap rows={I_SCALE} className={className} />;
}
export function IconPower({ className }: { className?: string }) {
  return <Bitmap rows={I_POWER} className={className} />;
}
export function IconFull({ className }: { className?: string }) {
  return <Bitmap rows={I_FULL} className={className} />;
}

export function HappyMac({ className }: { className?: string }) {
  return <Bitmap rows={HAPPY_MAC} className={className} />;
}
export function SadMac({ className }: { className?: string }) {
  return <Bitmap rows={SAD_MAC} className={className} />;
}
export function Floppy({ className }: { className?: string }) {
  return <Bitmap rows={FLOPPY} className={className} />;
}
export function DocIcon({ className }: { className?: string }) {
  return <Bitmap rows={DOC} className={className} />;
}
export function LockIcon({ className }: { className?: string }) {
  return <Bitmap rows={LOCK} className={className} />;
}
export function FolderIcon({ className }: { className?: string }) {
  return <Bitmap rows={FOLDER} className={className} />;
}

/** Classic pixel pointing-hand cursor as a data URI, for `cursor:`. */
export const HAND_CURSOR =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 12 12" shape-rendering="crispEdges">` +
      `<path fill="#fff" stroke="#000" stroke-width="0.6" d="M4 1h1v4h1V3h1v2h1V4h1v5h-1v1H4V9H3V8H2V6h2z"/>` +
      `</svg>`
  );
