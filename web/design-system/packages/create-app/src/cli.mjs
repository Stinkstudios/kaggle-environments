#!/usr/bin/env node
// gc-new-app — scaffold a new Gamecraft app: generic Vite/React/Tailwind
// boilerplate wired to one layout variant, plus a blank BRIEF.md to fill in.
// Contains no game-specific content — see skills/component-selection.md and
// skills/game-behavior.md for what to build next.
//
//   gc-new-app --name blackjack --layout table
//
// Run from the repo root. Writes apps/<name>/ (or --dir <dir>).
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
    `\nusage: gc-new-app --name <game> --layout <${BUILTIN_LAYOUTS.join("|")}|custom-*> [--dir apps] [--force]`
  );
  console.error("Run from the repo root. See skills/layout.md to pick a variant.");
  process.exit(2);
}

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    layout: { type: "string" },
    dir: { type: "string", default: "apps" },
    force: { type: "boolean", default: false }
  }
});

if (!values.name) usageError("--name is required");
if (!/^[a-z][a-z0-9-]*$/.test(values.name)) {
  usageError(`--name must be kebab-case (lowercase letters, digits, hyphens): "${values.name}"`);
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

const targetDir = path.resolve(process.cwd(), values.dir, values.name);
if (existsSync(targetDir) && !values.force) {
  console.error(`error: ${path.relative(process.cwd(), targetDir)} already exists (use --force to overwrite files)`);
  process.exit(1);
}

const kebab = values.name;
// Split on hyphens rather than pattern-matching "-<letter>" so segments that
// start with a digit (e.g. "blackjack-2") still capitalize into a valid JS
// identifier ("Blackjack2") instead of leaving the hyphen/digit untouched.
const words = kebab.split("-").filter(Boolean);
const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
const title = words.map(capitalize).join(" ");
const component = words.map(capitalize).join("");

const substitutions = {
  __GAME_NAME__: kebab,
  __GAME_TITLE__: title,
  __COMPONENT_NAME__: component,
  __LAYOUT__: values.layout
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
console.log(`  3. pnpm --filter @kaggle-environments/${kebab} dev`);
