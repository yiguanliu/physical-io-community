/** Original square-pixel sprites: connection, intelligence and embodiment. */
const heart = [
  '................', '..XXXX....XXXX..', '.XXXXXX..XXXXXX.',
  'XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX', '.XXXXXXXXXXXXXX.', '..XXXXXXXXXXXX..',
  '...XXXXXXXXXX...', '....XXXXXXXX....', '.....XXXXXX.....',
  '......XXXX......', '.......XX.......', '................', '................',
];
const brainHalf = [
  '...XXX.', '..XXXXX', '.X.XXXX', 'XX.XXXX',
  'XX...XX', 'XXXXXXX', '.XXXXXX', '...XXXX',
  'XXX.XXX', 'XXX.XXX', 'XXXXXXX', '.XXXXXX',
  '.XX..XX', '..XX.XX', '..XX.XX', '...XXX.',
];
const brain = brainHalf.map(row => `${row}..${[...row].reverse().join('')}`);
const body = [
  '......XXXX......', '.....XXXXXX.....', '.....XXXXXX.....', '......XXXX......',
  '................', '.XXXXXXXXXXXXXX.', 'XXXXXXXXXXXXXXXX', '.XXXXXXXXXXXXXX.',
  '.....XXXXXX.....', '.....XXXXXX.....', '.....XXXXXX.....', '.....XX..XX.....',
  '.....XX..XX.....', '.....XX..XX.....', '.....XX..XX.....', '................',
];

export default function LoveMindBody() {
  return (
    <svg viewBox="0 0 300 100" role="img" aria-label="Love, mind and body" fill="currentColor" shapeRendering="crispEdges">
      <title>Love, mind and body</title>
      {[heart, brain, body].map((sprite, index) => (
        <g key={index} transform={`translate(${24 + index * 90} 14) scale(4.5)`}>
          {sprite.flatMap((row, y) => [...row].map((pixel, x) => pixel === 'X'
            ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
            : null))}
        </g>
      ))}
    </svg>
  );
}
