import { parseLayoutSvg } from "./parse-svg.mjs";

/**
 * Compiles named rectangles into a CSS grid definition:
 * snap rect edges into grid lines, assign each named rect its cell span,
 * emit grid-template-areas + track sizes.
 *
 * There are no predetermined slot names. The drawing introduces the ids;
 * the prompter supplies a one-line description per id (what lives in that
 * region); the compiler emits CSS + a markdown spec that hands both to the
 * next agent.
 *
 * Guarantees:
 * - areas are rectangles on a shared grid (inherent to the approach)
 * - overlapping rects, duplicate names, non-solid regions are errors
 * - every breakpoint frame must place the same set of ids (error otherwise)
 */

/** Snap tolerance: edges closer than 2% of the canvas dimension merge into one grid line. */
const SNAP = 0.02;

export function compileGrid(svg, { label }) {
  const { width, height, rects, problems: parseProblems } = parseLayoutSvg(svg);
  const problems = parseProblems.map((p) => `${label}: ${p}`);
  const warnings = [];

  if (!rects.length) {
    return { problems: [`${label}: no named rectangles found`], warnings, css: null };
  }
  const names = rects.map((r) => r.name);
  for (const name of new Set(names)) {
    if (names.filter((n) => n === name).length > 1)
      problems.push(`${label}: duplicate rectangle name "${name}"`);
  }

  const cols = snapEdges(
    rects.flatMap((r) => [r.x, r.x + r.w]),
    width * SNAP
  );
  const rows = snapEdges(
    rects.flatMap((r) => [r.y, r.y + r.h]),
    height * SNAP
  );

  // Cell matrix, "." = empty.
  const matrix = Array.from({ length: rows.length - 1 }, () =>
    Array.from({ length: cols.length - 1 }, () => ".")
  );
  for (const r of rects) {
    const c0 = nearestIndex(cols, r.x);
    const c1 = nearestIndex(cols, r.x + r.w);
    const r0 = nearestIndex(rows, r.y);
    const r1 = nearestIndex(rows, r.y + r.h);
    for (let row = r0; row < r1; row++) {
      for (let col = c0; col < c1; col++) {
        if (matrix[row][col] !== ".")
          problems.push(`${label}: "${r.name}" overlaps "${matrix[row][col]}"`);
        matrix[row][col] = r.name;
      }
    }
  }

  // Validate areas are solid rectangles (a snapped edge inside another rect would break this).
  for (const name of new Set(names)) {
    const cells = [];
    matrix.forEach((row, ri) =>
      row.forEach((cell, ci) => cell === name && cells.push([ri, ci]))
    );
    const ris = cells.map(([ri]) => ri);
    const cis = cells.map(([, ci]) => ci);
    const solid =
      cells.length ===
      (Math.max(...ris) - Math.min(...ris) + 1) * (Math.max(...cis) - Math.min(...cis) + 1);
    if (!solid) problems.push(`${label}: "${name}" does not snap to a solid rectangle`);
  }

  if (problems.length) return { problems, warnings, css: null };

  // Track sizing: the "hero" area — the largest drawn region (usually the
  // board/play area) — flexes; tracks it occupies exclusively get fr
  // (proportional to drawn size). If it shares every track it spans, fall back
  // to all hero-spanning tracks. Everything else hugs content (auto).
  const areaPx = new Map();
  for (const r of rects) areaPx.set(r.name, (areaPx.get(r.name) ?? 0) + r.w * r.h);
  const hero = [...areaPx.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const colCells = (ci) => matrix.map((row) => row[ci]);
  const rowCells = (ri) => matrix[ri];
  const flexPredicate = (cellsAt, count) => {
    const spans = (i) => cellsAt(i).includes(hero);
    const exclusive = (i) => spans(i) && cellsAt(i).every((c) => c === hero || c === ".");
    return Array.from({ length: count }, (_, i) => i).some(exclusive) ? exclusive : spans;
  };
  // Text must never resize the layout. Non-flex COLUMNS are capped at their
  // drawn width via fit-content(px) — long text wraps instead of stealing
  // space from the hero. Non-flex ROWS stay auto: post-wrap vertical growth
  // is fine (the fr hero absorbs it).
  const colSizes = trackSizes(cols, flexPredicate(colCells, cols.length - 1), "fit-content");
  const rowSizes = trackSizes(rows, flexPredicate(rowCells, rows.length - 1), "auto");

  const templateRows = matrix
    .map((row, ri) => `    "${row.join(" ")}" ${rowSizes[ri]}`)
    .join("\n");
  return {
    problems,
    warnings,
    names: [...new Set(names)],
    hero,
    css: `  grid-template:\n${templateRows}\n    / ${colSizes.join(" ")};`
  };
}

function snapEdges(values, tolerance) {
  const sorted = [...values].sort((a, b) => a - b);
  const edges = [];
  for (const v of sorted) {
    if (!edges.length || v - edges[edges.length - 1] > tolerance) edges.push(v);
  }
  return edges;
}

function nearestIndex(edges, value) {
  let best = 0;
  edges.forEach((e, i) => {
    if (Math.abs(e - value) < Math.abs(edges[best] - value)) best = i;
  });
  return best;
}

function trackSizes(edges, isFlexTrack, nonFlex) {
  const px = edges.slice(1).map((e, i) => e - edges[i]);
  const flexPx = px.filter((_, i) => isFlexTrack(i));
  const minFlex = Math.min(...flexPx);
  return px.map((size, i) => {
    if (isFlexTrack(i)) return `${niceFr(size / minFlex)}fr`;
    return nonFlex === "fit-content" ? `fit-content(${Math.round(size)}px)` : "auto";
  });
}

/**
 * Drawings are approximate intent, not measurements: snap fr ratios to the
 * nearest integer when within 15%, else keep one decimal. 3.09 → 3, 4.86 → 5,
 * 12.06 → 12; a deliberate 1.5 stays 1.5.
 */
function niceFr(x) {
  const r = Math.round(x);
  if (r >= 1 && Math.abs(x - r) <= 0.15 * x) return r;
  return Math.round(x * 10) / 10;
}

/**
 * Compiles a full layout variant from per-breakpoint SVGs.
 *
 * breakpoints: { wide: svgString, narrow: svgString, dense?: svgString }
 * options.descriptions: { [slotId]: "one-line description of what lives there" }
 *
 * Returns { css, markdown, warnings, slots, missingDescriptions }.
 * `slots` is [{ name, description, breakpoints }]. Slots without a description
 * land in `missingDescriptions` — ask the prompter about each, then recompile;
 * the markdown spec marks them TODO until answered.
 * Throws on structural problems (overlaps, mismatched frames, …).
 */
export function compileVariant(name, breakpoints, { descriptions = {} } = {}) {
  if (!/^custom-[a-z0-9-]+$/.test(name))
    throw new Error(`variant name must match custom-<game> (got "${name}")`);
  if (!breakpoints.wide || !breakpoints.narrow)
    throw new Error("both --desktop (wide) and --mobile (narrow) SVGs are required");

  const results = {
    wide: compileGrid(breakpoints.wide, { label: "desktop" }),
    narrow: compileGrid(breakpoints.narrow, { label: "mobile" }),
    ...(breakpoints.dense ? { dense: compileGrid(breakpoints.dense, { label: "dense" }) } : {})
  };

  const problems = Object.values(results).flatMap((r) => r.problems);
  if (problems.length) throw new Error(problems.join("\n"));
  const warnings = Object.values(results).flatMap((r) => r.warnings);

  // Every breakpoint must place the same slots: a slot absent from one grid
  // would fall into auto-placement there and break the layout.
  const labels = Object.keys(results);
  for (const a of labels) {
    for (const b of labels) {
      if (a === b) continue;
      const missing = results[a].names.filter((n) => !results[b].names.includes(n));
      if (missing.length)
        problems.push(
          `slots [${missing.join(", ")}] exist in ${a} but not in ${b} — every frame must place the same named regions`
        );
    }
  }
  if (problems.length) throw new Error([...new Set(problems)].join("\n"));
  if (!results.dense)
    warnings.push(
      "no dense SVG supplied — the variant has no <520px-tall grid; supply --dense or add one by hand before homepage embedding"
    );

  const slotNames = results.wide.names;
  const slots = slotNames.map((slot) => ({
    name: slot,
    description: descriptions[slot]?.trim() || null,
    breakpoints: labels
  }));
  const missingDescriptions = slots.filter((s) => !s.description).map((s) => s.name);
  if (missingDescriptions.length)
    warnings.push(
      `missing descriptions for [${missingDescriptions.join(", ")}] — ask the prompter what each region contains, then recompile with the answers`
    );
  const unknownDescriptions = Object.keys(descriptions).filter((k) => !slotNames.includes(k));
  if (unknownDescriptions.length)
    warnings.push(
      `descriptions for unknown ids [${unknownDescriptions.join(", ")}] — no rectangle with that name exists in the frames`
    );

  const slotClasses = slotNames
    .map(
      (n) =>
        `[data-layout="${name}"] .gc-slot-${n} { grid-area: ${n}; min-width: 0; min-height: 0; }`
    )
    .join("\n");

  const css = `/* Generated by @kaggle-environments/design-system-layout-compiler — do not hand-edit; recompile from the SVGs. */
${slotClasses}

[data-layout="${name}"] > .gc-grid {
${results.wide.css}
}

@container gc-root (width < 640px) {
  [data-layout="${name}"] > .gc-grid {
  ${results.narrow.css.replaceAll("\n", "\n  ")}
  }
}
${
  results.dense
    ? `
@container gc-root (height < 520px) {
  [data-layout="${name}"] > .gc-grid {
    gap: 0.5rem;
    padding: 0.5rem;
  ${results.dense.css.replaceAll("\n", "\n  ")}
  }
}
`
    : ""
}`;

  const markdown = buildSpec(name, slots, results, css, warnings);
  return { css, markdown, warnings, slots, missingDescriptions };
}

/** The handoff artifact: everything the next agent needs to build against the layout. */
function buildSpec(name, slots, results, css, warnings) {
  const slotRows = slots
    .map(
      (s) =>
        `| \`${s.name}\` | ${s.description ?? "**TODO — description missing**"} | \`.gc-slot-${s.name}\` |`
    )
    .join("\n");
  const usage = slots
    .map((s) => `    <div className="gc-slot-${s.name}">{/* ${s.description ?? "TODO"} */}</div>`)
    .join("\n");
  const notes = warnings.length
    ? `\n## Open flags\n\n${warnings.map((w) => `- ${w}`).join("\n")}\n`
    : "";
  return `# Layout spec: \`${name}\`

Generated by \`@kaggle-environments/design-system-layout-compiler\` from client-drawn Figma frames. Machine-generated — recompile from the SVGs instead of editing.

## Slots

Slot ids come from the drawing; descriptions come from the prompter. This table is the contract for what each region contains.

| Slot | Contents | Class |
| --- | --- | --- |
${slotRows}

Hero (flexing) region per the drawing: \`${results.wide.hero}\`. All other regions hug their content.

## Breakpoints

${Object.keys(results)
  .map((l) => `- **${l}**`)
  .join("\n")}

Switching is container-query driven (\`narrow\` < 640px wide, \`dense\` < 520px tall) — nothing to wire up.

## Usage

\`\`\`tsx
<div className="gc-layout" data-layout="${name}">
  <div className="gc-grid">
${usage}
  </div>
</div>
\`\`\`

Import the CSS below after \`@kaggle-environments/design-system-layouts\`. Build slot contents with \`@kaggle-environments/design-system-components\` per \`skills/component-selection.md\`.

## CSS

\`\`\`css
${css}
\`\`\`
${notes}`;
}
