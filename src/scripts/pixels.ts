/* Pixel sprites, 16×16, drawn here as text: small icons of the things this site is about. They are
   stamped across the page by sprites.ts and exported as images by scripts/pixel-sprites.mjs.

   `#` black, `w` white, `g` light grey, `H` mid grey, `h` dark grey, `.` nothing. Through the dither,
   white stays white, the greys take the section's colour and black stays black. */

export const PIXEL_PALETTE: Record<string, string> = { '#': '#000000', w: '#f0f0f0', g: '#9a9a9a', H: '#7a7a7a', h: '#4a4a4a' };

export const PIXELS = {
  /* somebody watching */
  eye: [
    '................', '................', '....########....', '..##wwwwwwww##..',
    '.#wwww####wwww#.', '#wwww#gggg#wwww#', '#www#gg##gg#www#', '#www#g####g#www#',
    '#www#gg##wg#www#', '#wwww#gggg#wwww#', '.#wwww####wwww#.', '..##wwwwwwww##..',
    '....########....', '................', '................', '................',
  ],
  /* falling, nose down */
  bomb: [
    '...##......##...', '...#H#....#H#...', '...#HH####HH#...', '....#HhhhhH#....',
    '.....######.....', '....#HHhhhh#....', '...#HHwhhhhh#...', '...#HHwhhhhh#...',
    '...#HHhhhhhh#...', '...#HHhhhhhh#...', '...#HHhhhhhh#...', '....#Hhhhhh#....',
    '....#Hhhhhh#....', '.....#hhhh#.....', '......#hh#......', '.......##.......',
  ],
  bolt: [
    '................', '........#####...', '.......#www#....', '......#www#.....',
    '.....#www#......', '....#wwww####...', '...#wwwwwwww#...', '....####www#....',
    '.......#ww#.....', '......#ww#......', '.....#ww#.......', '....#ww#........',
    '....#w#.........', '....##..........', '................', '................',
  ],
  /* the pointer of an old desktop */
  hand: [
    '.....##.........', '....#ww#........', '....#ww#........', '....#ww#........',
    '....#ww###......', '....#ww#ww###...', '....#ww#ww#ww##.', '.##.#ww#ww#ww#w#',
    '#ww##wwwwwwwwww#', '#www#wwwwwwwwww#', '.#wwwwwwwwwwwww#', '..#wwwwwwwwwwww#',
    '..#wwwwwwwwwww#.', '...#wwwwwwwwww#.', '....#wwwwwwww#..', '....##########..',
  ],
  /* a phone showing the dead mark */
  phone: [
    '...##########...', '..#hhhhhhhhhh#..', '..#h########h#..', '..#h#wwwwww#h#..',
    '..#h#w#ww#w#h#..', '..#h#wwwwww#h#..', '..#h#w####w#h#..', '..#h#wwwwww#h#..',
    '..#h########h#..', '..#h#gggggg#h#..', '..#h#wwwwww#h#..', '..#h#gggggg#h#..',
    '..#h########h#..', '..#hhhh##hhhh#..', '..#hhhhhhhhhh#..', '...##########...',
  ],
  cloud: [
    '....########....', '..##wwwwwwww##..', '.#wwwwwwwwwwww#.', '#wwwwggwwwwggww#',
    '#wwgggggwwggggw#', '.#gggggggggggg#.', '..###gggggg###..', '.....#gwwg#.....',
    '.....#gwwg#.....', '....#ggwwgg#....', '.....#gwwg#.....', '.....#gwwg#.....',
    '....#ggwwgg#....', '..##gggwwggg##..', '.#gggggggggggg#.', '################',
  ],
  /* broken down the middle */
  heart: [
    '................', '..####....####..', '.#gwgg#..#gggg#.', '#gwgggg##gggggg#',
    '#gggggg#.#ggggg#', '#ggggg#..#ggggg#', '#ggggg#.#gggggg#', '.#ggggg#.#gggg#.',
    '.#gggg#..#gggg#.', '..#ggg#.#gggg#..', '...#ggg#.#gg#...', '....#gg#.#g#....',
    '.....#g#.##.....', '......##........', '................', '................',
  ],
  /* a television with the face on it */
  tv: [
    '..#........#....', '...#......#.....', '....#....#......', '.##############.',
    '#hhhhhhhhhhhhhh#', '#h########hh##h#', '#h#wwwwww#hhhhh#', '#h#wgwwgw#hh##h#',
    '#h#wwwwww#hhhhh#', '#h#wg##gw#h#h#h#', '#h#wwwwww#hhhhh#', '#h########h#h#h#',
    '#hhhhhhhhhhhhhh#', '.##############.', '..##........##..', '................',
  ],
} as const;

export type PixelName = keyof typeof PIXELS;

const cache = new Map<PixelName, HTMLCanvasElement>();
function sprite(name: PixelName) {
  let c = cache.get(name);
  if (c) return c;
  const rows = PIXELS[name];
  c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const cx = c.getContext('2d')!;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (PIXEL_PALETTE[ch]) { cx.fillStyle = PIXEL_PALETTE[ch]; cx.fillRect(x, y, 1, 1); }
  }));
  cache.set(name, c);
  return c;
}

/** Draws a pixel sprite centred on (cx, cy), `w` wide, with hard edges. */
export function drawPixel(sx: CanvasRenderingContext2D, name: PixelName, cx: number, cy: number, w: number) {
  sx.save();
  sx.imageSmoothingEnabled = false;
  sx.drawImage(sprite(name), cx - w / 2, cy - w / 2, w, w);
  sx.restore();
}
