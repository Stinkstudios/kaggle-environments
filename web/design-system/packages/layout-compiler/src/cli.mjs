#!/usr/bin/env node
// gc-layout — compile Figma SVG layout drawings into a layout variant + handoff spec.
//
//   gc-layout --name custom-blackjack \
//     --desktop layout-desktop.svg --mobile layout-mobile.svg [--dense layout-dense.svg] \
//     [--desc descriptions.json] [--out custom-blackjack.css] [--spec custom-blackjack.md]
//
// Slot ids come from the drawing. Each id needs a one-line description of what
// lives in that region; supply them as JSON ({"player_one": "Agent name + score", …})
// via --desc, or run interactively (a TTY) and the CLI asks about each missing id
// and saves the answers back to the --desc file.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { compileVariant } from "./compile.mjs";

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    desktop: { type: "string" },
    mobile: { type: "string" },
    dense: { type: "string" },
    desc: { type: "string" },
    out: { type: "string" },
    spec: { type: "string" },
    "no-input": { type: "boolean" }
  }
});

if (!values.name || !values.desktop || !values.mobile) {
  console.error(
    "usage: gc-layout --name custom-<game> --desktop <svg> --mobile <svg> [--dense <svg>] [--desc <json>] [--out <css>] [--spec <md>]"
  );
  process.exit(2);
}

const descPath = values.desc ?? `${values.name}.descriptions.json`;
let descriptions = {};
if (existsSync(descPath)) descriptions = JSON.parse(readFileSync(descPath, "utf8"));

const breakpoints = {
  wide: readFileSync(values.desktop, "utf8"),
  narrow: readFileSync(values.mobile, "utf8"),
  ...(values.dense ? { dense: readFileSync(values.dense, "utf8") } : {})
};

try {
  let result = compileVariant(values.name, breakpoints, { descriptions });

  // Interactive pass: ask about each undescribed id, one at a time.
  if (result.missingDescriptions.length && process.stdin.isTTY && !values["no-input"]) {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    console.error("Each drawn region needs a one-line description of what lives in it.\n");
    for (const slot of result.missingDescriptions) {
      const answer = (await rl.question(`  ${slot}: `)).trim();
      if (answer) descriptions[slot] = answer;
    }
    rl.close();
    writeFileSync(descPath, JSON.stringify(descriptions, null, 2) + "\n");
    console.error(`\nsaved ${descPath}`);
    result = compileVariant(values.name, breakpoints, { descriptions });
  }

  for (const w of result.warnings) console.error(`warning: ${w}`);

  if (values.out) {
    writeFileSync(values.out, result.css);
    console.error(`wrote ${values.out}`);
  }
  const specPath = values.spec ?? (values.out ? values.out.replace(/\.css$/, ".md") : null);
  if (specPath) {
    writeFileSync(specPath, result.markdown);
    console.error(`wrote ${specPath}`);
  }
  if (!values.out && !specPath) console.log(result.markdown);
  process.exit(result.missingDescriptions.length ? 3 : 0);
} catch (err) {
  console.error(`error:\n${err.message}`);
  process.exit(1);
}
