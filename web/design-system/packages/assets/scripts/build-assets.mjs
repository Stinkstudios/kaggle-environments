#!/usr/bin/env node
/**
 * Asset build for @kaggle-environments/design-system-assets.
 *
 *   src/<family>/<id>.png          committed source of truth (design deliverable)
 *        │
 *        ├─ roster check ─────────► missing[] / unlisted[]      (zero-dependency)
 *        ├─ stage + pack ─────────► .packer-work/   (intermediates, gitignored)
 *        └─ normalise ────────────► packed/<family>/            (committed)
 *                                     <family>.webp       the sheet
 *                                     <family>.webp.json  frame table
 *                                     manifest.json       ids, labels, frames
 *                                   src/generated/registry.ts
 *
 * ATLAS BY DEFAULT. Both render targets read the one sheet: Pixi via
 * Spritesheet, DOM via CSS background-position (which is why frames are packed
 * untrimmed). A family only also emits individual files when it sets
 * `"individual": true` in families.json — for families like cards, where you
 * show one face at a time and loading a 52-card sheet to do it would be absurd.
 *
 * Usage:
 *   node scripts/build-assets.mjs           full build
 *   node scripts/build-assets.mjs --check   roster diff only, no packing, no deps
 *   node scripts/build-assets.mjs --no-pack rebuild manifests from existing output
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, cpSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname, basename, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SRC = join(PKG, 'src');
/** Packer scratch: staging tree in, raw packer output out. Never committed. */
const WORK = join(PKG, '.packer-work');
const STAGING = join(WORK, 'staging');
const RAW = join(WORK, 'out');
/** The committed build output. */
const PACKED = join(PKG, 'packed');
/** Generated TS, inside src/ so tsc's rootDir stays ./src. */
const GENERATED = join(SRC, 'generated');

const checkOnly = process.argv.includes('--check');
const noPack = process.argv.includes('--no-pack');
const config = JSON.parse(readFileSync(join(PKG, 'families.json'), 'utf8'));

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** True when this family also wants one file per piece alongside the sheet. */
const wantsIndividual = (spec) => Boolean(spec.individual);
/**
 * True unless the family opts out. Cards opt out: 55 faces at print resolution
 * exceed AssetPack's 4096px sheet cap (7x5 = 35 per sheet), so an atlas would
 * span multiple pages — and every card game here is DOM anyway, showing a hand
 * at a time rather than the whole deck.
 */
const wantsAtlas = (spec) => spec.atlas !== false;
/** Renderers this family promises to serve. Defaults to both. */
const targetsOf = (spec) => spec.targets ?? ['pixi', 'dom'];

/**
 * Read a PNG's dimensions straight from the IHDR chunk — no image library, so
 * this runs in --check with zero dependencies.
 * Layout: 8-byte signature, 4-byte length, "IHDR", then width/height as BE u32.
 */
function pngSize(file) {
  const b = readFileSync(file);
  if (b.length < 24 || b.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/** ---- Roster audit ----------------------------------------------------- */

function audit() {
  const results = {};
  let unlisted = 0;
  for (const [family, spec] of Object.entries(config.families)) {
    const dir = join(SRC, family);
    const onDisk = existsSync(dir)
      ? readdirSync(dir).filter((f) => extname(f) === '.png').map((f) => basename(f, '.png'))
      : [];
    const declared = Object.keys(spec.pieces);
    const a = {
      onDisk,
      declared,
      missing: declared.filter((id) => !onDisk.includes(id)),
      unlisted: onDisk.filter((id) => !declared.includes(id)),
    };
    results[family] = a;
    unlisted += a.unlisted.length;
    const gap = a.missing.length ? `, ${a.missing.length} missing: ${a.missing.join(', ')}` : '';
    const bad = a.unlisted.length ? `, ${a.unlisted.length} UNDECLARED: ${a.unlisted.join(', ')}` : '';
    const mode = [wantsAtlas(spec) && 'atlas', wantsIndividual(spec) && 'individual']
      .filter(Boolean)
      .join(' + ') || 'NOTHING';
    const tgt = targetsOf(spec).join('/');
    console.log(`  ${family}: ${a.onDisk.length}/${a.declared.length} present [${mode} → ${tgt}]${gap}${bad}`);
  }
  // A family with a declared sourceSize is promising a fixed ratio — components
  // fit artwork to it rather than stretching. One odd-sized file renders at a
  // subtly different shape from its siblings, which is exactly the kind of
  // defect that survives review.
  const wrongSize = [];
  for (const [family, spec] of Object.entries(config.families)) {
    if (!spec.sourceSize) continue;
    for (const id of results[family].onDisk) {
      const got = pngSize(join(SRC, family, `${id}.png`));
      if (got && (got.w !== spec.sourceSize.w || got.h !== spec.sourceSize.h)) {
        wrongSize.push(`${family}:${id} is ${got.w}x${got.h}, family declares ${spec.sourceSize.w}x${spec.sourceSize.h}`);
      }
    }
  }
  if (wrongSize.length) {
    console.error(`\nERROR: ${wrongSize.length} file(s) do not match their family's declared sourceSize:`);
    for (const w of wrongSize) console.error(`  - ${w}`);
    console.error(
      `\nRe-export at the declared size (do not trim or auto-crop), or change sourceSize in families.json.`
    );
    process.exit(1);
  }

  // A family declares which renderers it serves. Pixi can only consume a sheet,
  // so promising 'pixi' without an atlas is a contract the build can't honour —
  // and it would otherwise surface as a Pixi game rendering nothing at all.
  const badTargets = [];
  for (const [family, spec] of Object.entries(config.families)) {
    const t = targetsOf(spec);
    if (t.includes('pixi') && !wantsAtlas(spec)) {
      badTargets.push(`${family}: targets include "pixi" but atlas is false — Pixi needs a sheet`);
    }
    if (!t.length) badTargets.push(`${family}: targets is empty — name at least one of "pixi", "dom"`);
  }
  if (badTargets.length) {
    console.error(`\nERROR: ${badTargets.length} family target contract(s) unsatisfiable:`);
    for (const t of badTargets) console.error(`  - ${t}`);
    process.exit(1);
  }

  const noOutput = Object.entries(config.families)
    .filter(([, spec]) => !wantsAtlas(spec) && !wantsIndividual(spec))
    .map(([f]) => f);
  if (noOutput.length) {
    console.error(
      `\nERROR: ${noOutput.join(', ')} would emit nothing — a family needs at least one of ` +
        `"atlas" (default true) or "individual": true.`
    );
    process.exit(1);
  }

  if (unlisted) {
    console.error(
      `\nERROR: ${unlisted} file(s) on disk are not declared in families.json.\n` +
        `Every piece needs a declared id + label before it can ship — add them and re-run.`
    );
    process.exit(1);
  }
  return results;
}

/** ---- Packer adapter --------------------------------------------------- */

function packerBin() {
  const local = join(PKG, 'node_modules', '.bin', 'assetpack');
  if (existsSync(local)) return local;
  const root = join(PKG, '..', '..', '..', '..', 'node_modules', '.bin', 'assetpack');
  return existsSync(root) ? root : null;
}

/**
 * Stage `src/<family>/` into the packer's folder-tag syntax, so that syntax
 * never touches the committed source tree. Families wanting individual files
 * are staged a second time, untagged — a `{tps}` folder is consumed into the
 * sheet and does not also emit its inputs.
 */
function stageForPacker() {
  rmSync(WORK, { recursive: true, force: true });
  for (const [family, spec] of Object.entries(config.families)) {
    const from = join(SRC, family);
    if (!existsSync(from)) continue;
    if (wantsAtlas(spec)) {
      const atlasDir = join(STAGING, 'atlas', `${family}{tps}`);
      mkdirSync(atlasDir, { recursive: true });
      cpSync(from, atlasDir, { recursive: true });
    }
    if (wantsIndividual(spec)) {
      const singleDir = join(STAGING, 'single', family);
      mkdirSync(singleDir, { recursive: true });
      cpSync(from, singleDir, { recursive: true });
    }
  }
}

function runPacker() {
  const bin = packerBin();
  if (!bin) {
    console.error(
      '\nERROR: AssetPack is not installed.\n' +
        '  pnpm add -D @assetpack/core --filter @kaggle-environments/design-system-assets\n' +
        'Then re-run. (Use --check to audit the roster without packing.)'
    );
    process.exit(1);
  }
  stageForPacker();
  const res = spawnSync(bin, ['--config', join(PKG, 'assetpack.config.mjs')], { cwd: PKG, stdio: 'inherit' });
  if (res.status !== 0) {
    console.error('\nERROR: packer exited with status ' + res.status);
    process.exit(res.status ?? 1);
  }
}

function readPackerOutput(family) {
  const all = walk(RAW);

  const atlasPath = all
    .filter((f) => f.endsWith('.json'))
    .filter((f) => basename(f).replace(/\.(webp|png)\.json$/, '').replace(/\.json$/, '') === family)
    .filter((f) => {
      try { return Boolean(JSON.parse(readFileSync(f, 'utf8')).frames); } catch { return false; }
    })
    .sort((a, b) => a.length - b.length)[0];

  const singles = all.filter((f) => f.endsWith('.webp') && f.includes(`${sep}single${sep}${family}${sep}`));
  if (!atlasPath) return { atlas: null, singles };

  const raw = JSON.parse(readFileSync(atlasPath, 'utf8'));
  const frames = {};
  for (const [name, f] of Object.entries(raw.frames ?? {})) {
    frames[basename(name, extname(name))] = { x: f.frame.x, y: f.frame.y, w: f.frame.w, h: f.frame.h };
  }
  return {
    atlas: {
      image: raw.meta?.image ?? basename(atlasPath).replace(/\.json$/, ''),
      data: basename(atlasPath),
      dir: dirname(atlasPath),
      path: atlasPath,
      // DOM needs the sheet's dimensions to compute background-size/position.
      size: raw.meta?.size ?? null,
      frames,
    },
    singles,
  };
}

/** ---- Manifest + registry ---------------------------------------------- */

function buildManifest(family, spec, a, packed) {
  const individual = wantsIndividual(spec);
  const pieces = {};
  for (const id of a.onDisk) {
    const meta = spec.pieces[id] ?? {};
    pieces[`${family}:${id}`] = {
      id: `${family}:${id}`,
      // null when the family is atlas-only — DOM reads the sheet instead.
      file: individual ? `${id}.webp` : null,
      frame: packed.atlas?.frames[id] ?? null,
      // Natural size: the atlas frame if packed, else the family's declared
      // sourceSize (which the audit guarantees every file matches).
      sourceSize: packed.atlas?.frames[id]
        ? { w: packed.atlas.frames[id].w, h: packed.atlas.frames[id].h }
        : (spec.sourceSize ?? null),
      label: meta.decorative ? '' : (meta.label ?? id.replace(/-/g, ' ')),
      decorative: Boolean(meta.decorative),
      tintable: Boolean(meta.tintable ?? spec.tintable),
    };
  }
  return {
    family,
    version: config.version,
    description: spec.description ?? '',
    individual,
    targets: targetsOf(spec),
    sourceSize: spec.sourceSize ?? null,
    atlas: packed.atlas
      ? { image: packed.atlas.image, data: packed.atlas.data, size: packed.atlas.size }
      : null,
    pieces,
    missing: a.missing.map((id) => `${family}:${id}`),
  };
}

const safe = (s) => s.replace(/[^a-zA-Z0-9_]/g, '_');

function generateRegistry(manifests) {
  const imports = [];
  const entries = [];
  const fams = [];

  for (const m of manifests) {
    const f = safe(m.family);
    if (m.atlas) {
      imports.push(`import ${f}AtlasUrl from '../../packed/${m.family}/${m.atlas.image}';`);
      imports.push(`import ${f}AtlasData from '../../packed/${m.family}/${m.atlas.data}';`);
    }
    for (const [pid, p] of Object.entries(m.pieces)) {
      const short = pid.slice(pid.indexOf(':') + 1);
      let url = 'null';
      if (p.file) {
        const v = `${f}_${safe(short)}`;
        imports.push(`import ${v} from '../../packed/${m.family}/${p.file}';`);
        url = v;
      }
      entries.push(
        `  '${pid}': { id: '${pid}', family: '${m.family}', url: ${url}, ` +
          `atlasUrl: ${m.atlas ? `${f}AtlasUrl` : 'null'}, ` +
          `atlasSize: ${m.atlas?.size ? JSON.stringify(m.atlas.size) : 'null'}, ` +
          `frame: ${p.frame ? JSON.stringify(p.frame) : 'null'}, ` +
          `sourceSize: ${p.sourceSize ? JSON.stringify(p.sourceSize) : 'null'}, ` +
          `label: ${JSON.stringify(p.label)}, decorative: ${p.decorative}, tintable: ${p.tintable} },`
      );
    }
    fams.push(
      `  '${m.family}': { atlasUrl: ${m.atlas ? `${f}AtlasUrl` : 'null'}, ` +
        `atlasData: ${m.atlas ? `${f}AtlasData` : 'null'}, ` +
        `atlasSize: ${m.atlas?.size ? JSON.stringify(m.atlas.size) : 'null'}, ` +
        `individual: ${m.individual}, targets: ${JSON.stringify(m.targets)}, ` +
        `missing: ${JSON.stringify(m.missing)} },`
    );
  }

  return [
    '// GENERATED by scripts/build-assets.mjs — do not edit.',
    "// Literal imports so each consumer's bundler fingerprints and copies the assets.",
    '',
    "import type { PieceAsset } from '../types';",
    '',
    ...imports,
    '',
    'export const REGISTRY: Record<string, PieceAsset> = {',
    ...entries,
    '};',
    '',
    'export interface FamilyRecord {',
    '  atlasUrl: string | null;',
    '  atlasData: unknown | null;',
    '  atlasSize: { w: number; h: number } | null;',
    '  individual: boolean;',
    "  targets: ('pixi' | 'dom')[];",
    '  missing: string[];',
    '}',
    '',
    'export const FAMILIES: Record<string, FamilyRecord> = {',
    ...fams,
    '};',
    '',
  ].join('\n');
}

/** Every path the generated registry imports must exist on disk. */
function verifyOutputs(manifests) {
  const problems = [];
  for (const m of manifests) {
    const dir = join(PACKED, m.family);
    const spec = config.families[m.family];
    if (wantsAtlas(spec)) {
      if (!m.atlas) { problems.push(`${m.family}: atlas expected but none produced`); continue; }
      for (const f of [m.atlas.image, m.atlas.data]) {
        if (!existsSync(join(dir, f))) problems.push(`${m.family}: missing packed/${m.family}/${f}`);
      }
      if (!m.atlas.size) problems.push(`${m.family}: atlas has no size in meta — DOM can't compute background-size`);
      for (const p of Object.values(m.pieces)) {
        if (!p.frame) problems.push(`${p.id}: no atlas frame`);
      }
    }
    for (const p of Object.values(m.pieces)) {
      if (p.file && !existsSync(join(dir, p.file))) problems.push(`${p.id}: missing packed/${m.family}/${p.file}`);
      if (!p.file && !wantsAtlas(spec)) problems.push(`${p.id}: family is atlas-less but emits no individual file`);
    }
  }
  if (problems.length) {
    console.error(`\nERROR: build produced ${problems.length} dangling reference(s):`);
    for (const p of problems.slice(0, 20)) console.error(`  - ${p}`);
    process.exit(1);
  }
}

/** ---- Main -------------------------------------------------------------- */

console.log(`\nAuditing roster (families.json v${config.version}):`);
const auditResults = audit();
if (checkOnly) { console.log('\n--check: roster OK, skipping packing.\n'); process.exit(0); }

if (noPack) {
  if (!existsSync(RAW)) { console.error('ERROR: --no-pack but .packer-work/out is absent. Run a full build first.'); process.exit(1); }
  console.log('\n--no-pack: reusing existing packer output.');
} else {
  console.log('\nPacking…');
  runPacker();
}

mkdirSync(PACKED, { recursive: true });
mkdirSync(GENERATED, { recursive: true });

const manifests = [];
for (const [family, spec] of Object.entries(config.families)) {
  const packed = readPackerOutput(family);
  const outDir = join(PACKED, family);
  mkdirSync(outDir, { recursive: true });

  // Copy whatever the packer produced. The atlas and the individual files are
  // independent outputs: an atlas-less family (cards) still emits singles, so
  // these must not be nested under one guard.
  if (packed.atlas) {
    copyFileSync(join(packed.atlas.dir, packed.atlas.image), join(outDir, packed.atlas.image));
    copyFileSync(packed.atlas.path, join(outDir, packed.atlas.data));
  }
  for (const s of packed.singles) {
    const dest = join(outDir, basename(s));
    if (!existsSync(dest) || statSync(s).mtimeMs > statSync(dest).mtimeMs) copyFileSync(s, dest);
  }

  const manifest = buildManifest(family, spec, auditResults[family], packed);
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  manifests.push(manifest);
  console.log(
    `  ${family}: ${Object.keys(manifest.pieces).length} pieces, atlas ${packed.atlas ? `${packed.atlas.size?.w}x${packed.atlas.size?.h}` : 'NO'}` +
      `${manifest.individual ? `, ${packed.singles.length} individual` : ''} → packed/${family}/`
  );
}

verifyOutputs(manifests);
writeFileSync(join(GENERATED, 'registry.ts'), generateRegistry(manifests));
console.log(`\nWrote src/generated/registry.ts (${manifests.reduce((n, m) => n + Object.keys(m.pieces).length, 0)} pieces)\n`);
