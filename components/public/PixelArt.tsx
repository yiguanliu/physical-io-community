type ArtKind = 'community' | 'people' | 'idea' | 'build' | 'ticket' | 'speaker' | 'hackathon' | 'robot' | 'source';

const sprites: Record<Exclude<ArtKind, 'community'>, string[]> = {
  people: ['..XXX.....XXX..', '..XXX.....XXX..', '...X.......X...', '.XXXXX...XXXXX.', 'XXXXXXX.XXXXXXX', 'X.XXX.X.X.XXX.X', '..XXX.....XXX..', '..X.X.....X.X..', '..X.X.....X.X..'],
  idea: ['.....XXX.....', '...XX...XX...', '..X.......X..', '..X..A.A..X..', '..X...A...X..', '...X.A.A.X...', '....X...X....', '....XXXXX....', '.....XXX.....', '.....XXX.....'],
  build: ['.....XX......', '....XXXX.....', '...XX..XX....', '....XX..XX...', '.....XX..XX..', '......XX..XX.', '..XXX..XXXX..', '..XXX...XX...', '...X....XX...', '.XXXXXXXXXX..', 'XXXXXXXXXXXX.'],
  ticket: ['XXXXXXXXXXXXX', 'X...........X', 'X.AAA.XXXXX.X', 'X.A.A.......X', '.AAA..XXXXX..', 'X...........X', 'X.A.A.A.A.A.X', 'XXXXXXXXXXXXX'],
  speaker: ['.....AAA.....', '....AAAAA....', '....AAAAA....', '....AAAAA....', '...X.AAA.X...', '...X.....X...', '....XXXXX....', '......X......', '......X......', '....XXXXX....'],
  hackathon: ['..XX.....XX..', '.XX.......XX.', 'XX...A.....XX', '.XX.AAA...XX.', '..XX.A...XX..', '.....A.......', '....AAA......'],
  robot: ['......AA......', '......AA......', '.....XXXX.....', '..XXXXXXXXXX..', '.XX........XX.', '.X..AA..AA..X.', '.X..AA..AA..X.', '.X..........X.', '.X...XXXX...X.', '.XX........XX.', '..XXXXXXXXXX..', '.....XXXX.....', '....XXXXXX....', '..XXXXXXXXXX..'],
  source: ['..XXXXXXXXX..', '..X.......X..', '..X.A...A.X..', '..XA.....AX..', '..X.A...A.X..', '..X.......X..', '..X.XXXXX.X..', '..X.XXX...X..', '..XXXXXXXXX..'],
};

function Sprite({ kind, x = 0, y = 0, scale = 1 }: { kind: Exclude<ArtKind, 'community'>; x?: number; y?: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {sprites[kind].flatMap((row, py) => [...row].map((pixel, px) => pixel === '.' ? null : <rect key={`${px}-${py}`} x={px} y={py} width="1" height="1" fill={pixel === 'A' ? 'var(--ui-accent)' : 'currentColor'} />))}
  </g>;
}

/** Small, static pixel illustrations. Adjacent headings carry their meaning. */
export default function PixelArt({ kind = 'community' }: { kind?: ArtKind }) {
  if (kind !== 'community') return <svg viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges"><Sprite kind={kind} x={5} y={5} /></svg>;
  return <svg viewBox="0 0 112 48" aria-hidden="true" shapeRendering="crispEdges">
    <path d="M20 27H37V16H53M64 16H82V27H99" fill="none" stroke="var(--ui-border)" strokeWidth="1" strokeDasharray="2 2" />
    <Sprite kind="people" x={4} y={23} scale={2} />
    <Sprite kind="idea" x={31} y={3} />
    <Sprite kind="robot" x={49} y={10} scale={2} />
    <Sprite kind="build" x={85} y={20} scale={2} />
    <rect x="89" y="12" width="4" height="4" fill="var(--ui-accent)" />
    <path d="M8 45H104" stroke="var(--ui-border)" />
    {[13, 24, 35, 46, 57, 68, 79, 90, 101].map(x => <rect key={x} x={x} y="43" width="2" height="2" fill="var(--ui-border)" />)}
  </svg>;
}
