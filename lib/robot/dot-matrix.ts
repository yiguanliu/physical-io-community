// Original 5 × 7 LED glyphs. Each bit maps directly to one physical display cell.
const glyphs: Record<string, number[]> = {
  ' ':[0,0,0,0,0,0,0],
  A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,18,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,25,21,19,17,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],
  a:[0,0,14,1,15,17,15],b:[16,16,22,25,17,17,30],c:[0,0,14,16,16,17,14],d:[1,1,13,19,17,17,15],e:[0,0,14,17,31,16,14],f:[6,9,8,28,8,8,8],g:[0,0,15,17,15,1,14],h:[16,16,22,25,17,17,17],i:[4,0,12,4,4,4,14],j:[2,0,6,2,2,18,12],k:[16,16,18,20,24,20,18],l:[12,4,4,4,4,4,14],m:[0,0,26,21,21,17,17],n:[0,0,22,25,17,17,17],o:[0,0,14,17,17,17,14],p:[0,0,30,17,30,16,16],q:[0,0,15,17,15,1,1],r:[0,0,22,25,16,16,16],s:[0,0,15,16,14,1,30],t:[8,8,28,8,8,9,6],u:[0,0,17,17,17,19,13],v:[0,0,17,17,17,10,4],w:[0,0,17,17,21,21,10],x:[0,0,17,10,4,10,17],y:[0,0,17,17,15,1,14],z:[0,0,31,2,4,8,31],
  '0':[14,17,19,21,25,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,2,4,8,31],'3':[30,1,1,14,1,1,30],'4':[2,6,10,18,31,2,2],'5':[31,16,16,30,1,1,30],'6':[14,16,16,30,17,17,14],'7':[31,1,2,4,8,8,8],'8':[14,17,17,14,17,17,14],'9':[14,17,17,15,1,1,14],
  '.':[0,0,0,0,0,12,12],',':[0,0,0,0,0,4,8],':':[0,12,12,0,12,12,0],';':[0,12,12,0,4,4,8],'-':[0,0,0,31,0,0,0],'+':[0,4,4,31,4,4,0],'#':[10,10,31,10,31,10,10],'/':[1,2,2,4,8,8,16],'!':[4,4,4,4,4,0,4],'?':[14,17,1,2,4,0,4],"'":[4,4,8,0,0,0,0],'"':[10,10,0,0,0,0,0],'(':[2,4,8,8,8,4,2],')':[8,4,2,2,2,4,8],'&':[12,18,20,8,21,18,13],'@':[14,17,23,21,23,16,14],'=':[0,0,31,0,31,0,0],'_':[0,0,0,0,0,0,31],'%':[17,2,4,8,17,0,0],'*':[0,21,14,31,14,21,0],'[':[14,8,8,8,8,8,14],']':[14,2,2,2,2,2,14],'<':[2,4,8,16,8,4,2],'>':[8,4,2,1,2,4,8],'|':[4,4,4,4,4,4,4],'\\':[16,8,8,4,2,2,1],'$':[4,15,20,14,5,30,4],'^':[4,10,17,0,0,0,0],'`':[8,4,0,0,0,0,0],'{':[2,4,4,8,4,4,2],'}':[8,4,4,2,4,4,8],'~':[0,0,9,22,0,0,0],
};

export const MATRIX_TEXT_WIDTH = 35;
// Keep intentional breaks when they match the layout; otherwise balance whole words.
export function layoutMessageText(text: string, lines: number): string {
  const count = Math.max(1, Math.min(3, Math.floor(lines) || 1));
  const explicit = text.trim().split('\n').map(line => line.trim()).filter(Boolean);
  if (explicit.length === count) return explicit.join('\n');
  const words = text.trim().split(/\s+/);
  const rows: string[] = [];
  while (words.length && rows.length < count - 1) {
    const target = words.join(' ').length / (count - rows.length);
    let row = words.shift()!;
    while (words.length > count - rows.length - 1 &&
      Math.abs(row.length + 1 + words[0].length - target) <= Math.abs(row.length - target)) {
      row += ` ${words.shift()}`;
    }
    rows.push(row);
  }
  if (words.length) rows.push(words.join(' '));
  return rows.join('\n');
}
export function textWidth(text: string) { return Math.max(0, text.length * 6 - 1); }
export function minimumDuration(text: string, speed: number, lines?: number) {
  const laidOut = lines === undefined ? text : layoutMessageText(text, lines);
  const width = Math.max(...laidOut.split('\n').map(textWidth));
  return Math.max(5, Math.ceil(Math.max(0, width - MATRIX_TEXT_WIDTH) / Math.max(1, speed) + 2));
}
export function matrixPoints(text: string, seconds: number, speed: number, width = MATRIX_TEXT_WIDTH): [number, number][] {
  const points: [number, number][] = [];
  text.split('\n').slice(0, 3).forEach((line, row) => {
    const inkWidth = textWidth(line);
    const travel = Math.max(0, inkWidth - width);
    const cycle = travel / Math.max(1, speed) + 2;
    const progress = Math.min(travel, Math.max(0, (seconds % cycle - 1) * speed));
    const origin = travel ? -Math.floor(progress) : Math.floor((width - inkWidth) / 2);
    [...line].forEach((letter, index) => {
      (glyphs[letter] ?? glyphs['?']).forEach((bits, y) => {
        for (let x = 0; x < 5; x++) {
          const column = origin + index * 6 + x;
          if ((bits & (1 << (4 - x))) && column >= 0 && column < width) points.push([column, row * 10 + y]);
        }
      });
    });
  });
  return points;
}
