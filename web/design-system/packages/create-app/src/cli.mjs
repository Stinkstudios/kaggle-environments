#!/usr/bin/env node
// gc-new-app — scaffold a new Gamecraft visualizer: generic Vite/React/Tailwind
// boilerplate wired to one layout variant, plus a blank BRIEF.md to fill in.
// Contains no game-specific content — see skills/component-selection.md and
// skills/game-behavior.md for what to build next.
//
//   gc-new-app --game-dir kaggle_environments/envs/open_spiel_env/games/nine_mens_morris --layout versus-vertical
//
// Run from the repo root. Writes into <game-dir>/visualizer/<version>/ — the
// same "visualizer" root every real visualizer already uses, alongside
// whatever's already there (typically a "default" variant — this script
// never touches it). --version defaults to the next unused "vN" so repeat
// test scaffolds don't clobber each other; pass --version explicitly to
// target a specific one (e.g. to overwrite it with --force).
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

const BUILTIN_LAYOUTS = ["versus-vertical", "table", "side-panel", "arena"];

function usageError(message) {
  console.error(`error: ${message}`);
  console.error(
    `\nusage: gc-new-app --game-dir <path> --layout <${BUILTIN_LAYOUTS.join("|")}|custom-*> [--version vN] [--force]`
  );
  console.error(
    "--game-dir is the existing game's directory, e.g. kaggle_environments/envs/connectx or " +
      "kaggle_environments/envs/open_spiel_env/games/nine_mens_morris. Writes into <game-dir>/visualizer/<version>/."
  );
  console.error("Run from the repo root. See skills/layout.md to pick a variant.");
  process.exit(2);
}

const { values } = parseArgs({
  options: {
    "game-dir": { type: "string" },
    layout: { type: "string" },
    version: { type: "string" },
    force: { type: "boolean", default: false }
  }
});

if (!values["game-dir"]) usageError("--game-dir is required");
const gameDir = path.resolve(process.cwd(), values["game-dir"]);
if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
  usageError(`--game-dir does not exist or isn't a directory: "${values["game-dir"]}"`);
}

if (!values.layout) {
  usageError("--layout is required — layout is never defaulted, see skills/layout.md");
}
if (!BUILTIN_LAYOUTS.includes(values.layout) && !values.layout.startsWith("custom-")) {
  usageError(
    `unknown layout "${values.layout}". Built-ins: ${BUILTIN_LAYOUTS.join(", ")}. ` +
      `Client-drawn layouts compile to "custom-<game>" via @kaggle-environments/design-system-layout-compiler (skills/game-brief.md step 3).`
  );
}

// The dir name is the source of truth for the game's identity — no separate
// --name to keep in sync with it. kaggle_environments dirs use snake_case;
// normalize to kebab-case for the package/component naming this scaffolds.
const dirBasename = path.basename(gameDir);
const kebab = dirBasename.replace(/_/g, "-");
if (!/^[a-z][a-z0-9-]*$/.test(kebab)) {
  usageError(
    `--game-dir's basename "${dirBasename}" doesn't produce a valid kebab-case name ("${kebab}") — ` +
      "expected lowercase letters, digits, underscores/hyphens only."
  );
}

const isOpenSpiel = gameDir.split(path.sep).includes("open_spiel_env");

const visualizerDir = path.join(gameDir, "visualizer");

function nextVersion() {
  if (!existsSync(visualizerDir)) return "v1";
  const existingVersions = readdirSync(visualizerDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^v[0-9]+$/.test(name))
    .map((name) => Number.parseInt(name.slice(1), 10));
  const max = existingVersions.length ? Math.max(...existingVersions) : 0;
  return `v${max + 1}`;
}

const version = values.version ?? nextVersion();
if (!/^[a-z][a-z0-9-]*$/.test(version)) {
  usageError(`--version must be kebab-case (lowercase letters, digits, hyphens): "${version}"`);
}

// "default" is the one real, promoted visualizer and keeps the bare name
// every existing default/ visualizer already has. Every other version gets
// a -<version> suffix — without it, e.g. v1 and v2 scaffolds (and "default"
// itself, if one already exists) would collide on the exact same package
// name, which pnpm resolves ambiguously (--filter matches both, both try to
// bind the same dev-server port). Verified this collision firsthand before
// adding the suffix.
const packageName = `@kaggle-environments/${isOpenSpiel ? "open-spiel-" : ""}${kebab}-visualizer${
  version === "default" ? "" : `-${version}`
}`;

const targetDir = path.join(visualizerDir, version);
if (existsSync(targetDir) && !values.force) {
  console.error(
    `error: ${path.relative(process.cwd(), targetDir)} already exists (use --force to overwrite files, ` +
      `or omit --version to scaffold the next one instead)`
  );
  process.exit(1);
}

// Split on hyphens rather than pattern-matching "-<letter>" so segments that
// start with a digit (e.g. "blackjack-2") still capitalize into a valid JS
// identifier ("Blackjack2") instead of leaving the hyphen/digit untouched.
const words = kebab.split("-").filter(Boolean);
const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
const title = words.map(capitalize).join(" ");
const component = words.map(capitalize).join("");

// The path from the scaffolded app back to the design system's components
// source varies with how deep --game-dir nests (regular envs/<game>/ vs.
// envs/open_spiel_env/games/<game>/) — compute it instead of hardcoding a
// fixed "../../.." in the templates, which would be wrong for one shape or
// the other. game.css and tsconfig.json sit at different depths (src/ vs.
// the app root), so each needs its own relative path.
const componentsSrcDir = path.join(__dirname, "..", "..", "components", "src");
const toPosix = (p) => p.split(path.sep).join("/");
const componentsSrcFromAppRoot = toPosix(path.relative(targetDir, componentsSrcDir));
const componentsSrcFromSrcDir = toPosix(path.relative(path.join(targetDir, "src"), componentsSrcDir));

const substitutions = {
  __GAME_NAME__: kebab,
  __PACKAGE_NAME__: packageName,
  __GAME_TITLE__: title,
  __COMPONENT_NAME__: component,
  __LAYOUT__: values.layout,
  __COMPONENTS_SRC_FROM_APP_ROOT__: componentsSrcFromAppRoot,
  __COMPONENTS_SRC_FROM_SRC_DIR__: componentsSrcFromSrcDir
};

function substitute(text) {
  return Object.entries(substitutions).reduce((acc, [token, value]) => acc.replaceAll(token, value), text);
}

function copyTemplateDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyTemplateDir(srcPath, destPath);
    } else {
      writeFileSync(destPath, substitute(readFileSync(srcPath, "utf8")));
    }
  }
}

copyTemplateDir(templatesDir, targetDir);

const relTarget = path.relative(process.cwd(), targetDir);
console.log(`created ${relTarget}/`);
console.log(`\nnext steps:`);
console.log(`  1. Fill in ${relTarget}/BRIEF.md (skills/game-brief.md)`);
console.log(`  2. pnpm install`);
console.log(`  3. pnpm --filter ${packageName} dev`);
