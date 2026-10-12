// A picture drawn as one centered column, top to bottom: a logo, lines of words, a code. Each
// piece is measured first, so the whole column can be centered on the picture. The contact card
// maker and the review link maker draw their pictures with it.
//
//   const col = column(ctx, { width, height, side })
//   col.text(value, font, color, lineHeight)  -> words, wrapped to the column's width
//   col.gap(height)                           -> space
//   col.piece(height, draw)                   -> anything else; draw(y) gets the piece's top edge
//   col.draw()                                -> paints the picture white and draws the column

export const INK = '#111418';
export const SOFT = '#3d4550';
export const FONT = 'Figtree, system-ui, sans-serif';

function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// side: the empty margin on the left and right, and the least at the top.
export function column(ctx, { width, height, side }) {
  const pieces = [];
  const inner = width - side * 2;
  const middle = width / 2;
  return {
    middle,
    piece(pieceHeight, draw) {
      pieces.push({ height: pieceHeight, draw });
    },
    gap(gapHeight) {
      pieces.push({ height: gapHeight, draw() {} });
    },
    text(value, font, color, lineHeight) {
      ctx.font = font;
      for (const line of wrap(ctx, value, inner)) {
        pieces.push({ height: lineHeight, draw(y) {
          ctx.font = font;
          ctx.fillStyle = color;
          ctx.fillText(line, middle, y + lineHeight * 0.78);
        } });
      }
    },
    draw() {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = 'center';
      const total = pieces.reduce((sum, p) => sum + p.height, 0);
      let y = Math.max(side, (height - total) / 2);
      for (const piece of pieces) {
        piece.draw(y);
        y += piece.height;
      }
    },
  };
}
