/**
 * Extracts named rectangles from a Figma SVG export.
 *
 * Real Figma exports look like:
 *   <g id="Frame 3" clip-path="url(#…)">          ← frame wrapper: NOT a name
 *     <rect width="375" height="600" fill="white"/> ← unnamed background: ignored
 *     <rect id="player_one" x="64" …/>              ← named rect
 *     <g id="board"><rect …/></g>                   ← single-rect group: name wrapper
 *     <rect id="board2" transform="matrix(1 0 0 -1 0 600)" …/>  ← flip transforms
 *   </g>
 *
 * Rules:
 * - A rect is named by its own id, or by its group's id ONLY when the group
 *   wraps exactly that one rect (<g id><rect/></g>). Frame/clip groups that
 *   contain multiple children never name anything.
 * - Unnamed rects (backgrounds, decorations) are ignored.
 * - transform: translate(tx ty) and axis-aligned matrix(a 0 0 d tx ty) are
 *   applied, including negative scales (Figma flips). Rotations are rejected.
 * - Names are sanitized to valid grid-area idents: lowercased, Figma's "_2"
 *   dedup suffix stripped, anything non [a-z0-9_-] becomes "-".
 *
 * Returns { width, height, rects: [{ name, x, y, w, h }], problems: [] }.
 */
export function parseLayoutSvg(svg) {
  const problems = [];
  const viewBox = svg.match(/viewBox\s*=\s*"([\d.\s-]+)"/);
  let width = 0;
  let height = 0;
  if (viewBox) {
    const [, , w, h] = viewBox[1].trim().split(/\s+/).map(Number);
    width = w;
    height = h;
  }

  const attr = (attrs, name) => {
    const m = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`));
    return m ? m[1] : null;
  };

  const rects = [];
  const claimed = new Set();

  const pushRect = (rawName, rectAttrs, extraTransform) => {
    const box = applyTransforms(
      {
        x: Number(attr(rectAttrs, "x") ?? 0),
        y: Number(attr(rectAttrs, "y") ?? 0),
        w: Number(attr(rectAttrs, "width") ?? 0),
        h: Number(attr(rectAttrs, "height") ?? 0)
      },
      [attr(rectAttrs, "transform"), extraTransform],
      rawName,
      problems
    );
    if (!box || box.w <= 0 || box.h <= 0) return;
    rects.push({ name: sanitizeName(rawName), ...box });
  };

  // Pass 1: single-rect name-wrapper groups: <g id="name" …><rect …/></g>
  const singleRectGroupRe = /<g\b([^>]*)>\s*<rect\b([^>]*?)\/?>\s*<\/g>/g;
  let m;
  while ((m = singleRectGroupRe.exec(svg))) {
    const [full, groupAttrs, rectAttrs] = m;
    const name = attr(rectAttrs, "id") ?? attr(groupAttrs, "id");
    claimed.add(m.index + full.indexOf("<rect"));
    if (name) pushRect(name, rectAttrs, attr(groupAttrs, "transform"));
  }

  // Pass 2: every other rect, named by its own id only.
  const rectRe = /<rect\b([^>]*?)\/?>/g;
  while ((m = rectRe.exec(svg))) {
    if (claimed.has(m.index)) continue;
    const name = attr(m[1], "id");
    if (name) pushRect(name, m[1], null);
  }

  if (!width || !height) {
    width = Math.max(...rects.map((r) => r.x + r.w), 0);
    height = Math.max(...rects.map((r) => r.y + r.h), 0);
  }
  return { width, height, rects, problems };
}

/** Applies transforms innermost-first: the rect's own, then each ancestor's. */
function applyTransforms(box, transforms, name, problems) {
  for (const t of transforms) {
    if (!t) continue;
    const translate = t.match(/translate\(\s*([\d.e-]+)[ ,]+([\d.e-]+)\s*\)/i);
    const matrix = t.match(
      /matrix\(\s*([\d.e-]+)[ ,]+([\d.e-]+)[ ,]+([\d.e-]+)[ ,]+([\d.e-]+)[ ,]+([\d.e-]+)[ ,]+([\d.e-]+)\s*\)/i
    );
    if (translate) {
      box = { ...box, x: box.x + Number(translate[1]), y: box.y + Number(translate[2]) };
    } else if (matrix) {
      const [a, b, c, d, tx, ty] = matrix.slice(1).map(Number);
      if (b !== 0 || c !== 0) {
        problems.push(`"${name}": rotated/skewed transform is not supported — draw it axis-aligned`);
        return null;
      }
      const x0 = a * box.x + tx;
      const x1 = a * (box.x + box.w) + tx;
      const y0 = d * box.y + ty;
      const y1 = d * (box.y + box.h) + ty;
      box = {
        x: Math.min(x0, x1),
        y: Math.min(y0, y1),
        w: Math.abs(x1 - x0),
        h: Math.abs(y1 - y0)
      };
    } else {
      problems.push(`"${name}": unsupported transform "${t}"`);
      return null;
    }
  }
  return box;
}

/** Figma decorates duplicate layer names ("board_2") and ids must be valid grid-area idents. */
function sanitizeName(raw) {
  return raw
    .trim()
    .replace(/_\d+$/, "")
    .replace(/%20/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-");
}
