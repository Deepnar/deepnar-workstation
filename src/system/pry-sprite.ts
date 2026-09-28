// Pry's canonical idle sprite — shared by the 404 page and the GitHub banner
// pipeline WITHOUT importing the full workstation runtime (Pet.tsx owns the
// animated version; this file renders one idle frame: front view, open eyes,
// tail resting). Pixel rows copied from Pet.tsx BODY; keep in sync there.
export const PRY_W = 16, PRY_H = 12;

export const PRY_BODY = [
  "...BB......BB...",
  "...BBB....BBB...",
  "...BBBBBBBBBB...",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  ".BBBBBBBBBBBBBB.",
  ".BBBBBBBBBBBBBB.",
  ".BBBBBBBBBBBBBB.",
  "..BBBBBBBBBBBB..",
  "..BBBBBBBBBBBB..",
  "...BBBBBBBBBB...",
  "...BB..BB..BB...",
];

export interface PryColors { body: string; dark: string }

/** paint one idle frame; blink=true renders the closed-eye frame. */
export function drawPryIdle(
  ctx: CanvasRenderingContext2D, px: number,
  colors: PryColors, blink = false,
) {
  ctx.clearRect(0, 0, PRY_W * px, PRY_H * px);
  const put = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * px, y * px, px, px);
  };
  PRY_BODY.forEach((row, y) => {
    for (let x = 0; x < PRY_W; x++) if (row[x] === "B") put(x, y, colors.body);
  });
  put(0, 7, colors.body); put(0, 8, colors.body); // resting tail
  const eye = (x: number) => {
    if (blink) { put(x, 6, colors.dark); put(x + 1, 6, colors.dark); }
    else {
      put(x, 5, colors.dark); put(x + 1, 5, colors.dark);
      put(x, 6, colors.dark); put(x + 1, 6, colors.dark);
    }
  };
  eye(5); eye(9);
  if (!blink) { put(7, 7, colors.dark); put(8, 7, colors.dark); } // mouth
}

/** same sprite as crisp SVG rects (for static assets like the repo banner). */
export function pryIdleRects(blink = false): string {
  let s = "";
  const put = (x: number, y: number, c: string) => { s += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; };
  PRY_BODY.forEach((row, y) => {
    for (let x = 0; x < PRY_W; x++) if (row[x] === "B") put(x, y, "BODY");
  });
  put(0, 7, "BODY"); put(0, 8, "BODY");
  const eye = (x: number) => {
    if (blink) { put(x, 6, "DARK"); put(x + 1, 6, "DARK"); }
    else { put(x, 5, "DARK"); put(x + 1, 5, "DARK"); put(x, 6, "DARK"); put(x + 1, 6, "DARK"); }
  };
  eye(5); eye(9);
  if (!blink) { put(7, 7, "DARK"); put(8, 7, "DARK"); }
  return s;
}
