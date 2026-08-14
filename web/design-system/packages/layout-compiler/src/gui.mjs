import desktopFixture from "../fixtures/example-desktop.svg?raw";
import mobileFixture from "../fixtures/example-mobile.svg?raw";
import { compileVariant } from "./compile.mjs";
import { parseLayoutSvg } from "./parse-svg.mjs";

const $ = (id) => document.getElementById(id);
const areas = { desktop: $("svg-desktop"), mobile: $("svg-mobile"), dense: $("svg-dense") };

areas.desktop.value = desktopFixture;
areas.mobile.value = mobileFixture;

const previewStyle = document.createElement("style");
document.head.append(previewStyle);

/** Prompter-supplied slot descriptions, keyed by slot id. Survives recompiles. */
const descriptions = {};

function compile() {
  const name = $("name").value.trim() || "custom-example";
  renderDrawings();

  const bps = {
    wide: areas.desktop.value,
    narrow: areas.mobile.value,
    ...(areas.dense.value.trim() ? { dense: areas.dense.value } : {})
  };
  let result;
  try {
    result = compileVariant(name, bps, { descriptions });
  } catch (err) {
    $("css").textContent = "";
    $("spec").textContent = "";
    previewStyle.textContent = "";
    $("preview-grid").replaceChildren();
    $("descriptions").replaceChildren();
    showMessages([[err.message, "error"]]);
    return;
  }

  $("css").textContent = result.css;
  $("spec").textContent = result.markdown;
  showMessages(result.warnings.map((w) => [w, "warning"]));
  renderDescriptionInputs(result.slots);

  // Preview: recompile under a fixed name so the injected CSS matches the DOM hook.
  const preview = compileVariant("custom-preview", bps, { descriptions });
  previewStyle.textContent = preview.css;

  const slotNames = new Set(
    [areas.desktop.value, areas.mobile.value, areas.dense.value]
      .filter((svg) => svg.trim())
      .flatMap((svg) => parseLayoutSvg(svg).rects.map((r) => r.name))
  );
  $("preview-grid").replaceChildren(
    ...[...slotNames].map((slot) => {
      const div = document.createElement("div");
      div.className = `slot slot-${slot}`;
      div.style.gridArea = slot;
      div.textContent = slot;
      return div;
    })
  );
}

function renderDescriptionInputs(slots) {
  const container = $("descriptions");
  // Rebuild only when the slot set changes, so typing keeps focus.
  const existing = [...container.querySelectorAll("input")].map((i) => i.dataset.slot);
  const wanted = slots.map((s) => s.name);
  if (existing.join() === wanted.join()) return;
  container.replaceChildren(
    ...slots.map((slot) => {
      const row = document.createElement("label");
      row.className = "desc-row";
      const id = document.createElement("code");
      id.textContent = slot.name;
      const input = document.createElement("input");
      input.dataset.slot = slot.name;
      input.placeholder = "e.g. SVG logo of the agent";
      input.value = descriptions[slot.name] ?? "";
      input.addEventListener("input", () => {
        descriptions[slot.name] = input.value;
        compile();
      });
      row.append(id, input);
      return row;
    })
  );
}

function renderDrawings() {
  $("drawings").replaceChildren(
    ...Object.entries(areas)
      .filter(([, area]) => area.value.trim())
      .map(([label, area]) => {
        const figure = document.createElement("figure");
        const caption = document.createElement("figcaption");
        caption.textContent = label;
        figure.append(caption);
        figure.insertAdjacentHTML("beforeend", area.value);
        // Annotate each named rect in the inline SVG with its slot name.
        const svg = figure.querySelector("svg");
        if (svg) {
          for (const { name, x, y, w, h } of parseLayoutSvg(area.value).rects) {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x + w / 2);
            text.setAttribute("y", y + h / 2);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "central");
            text.setAttribute("fill", "#0e1116");
            text.setAttribute("font-size", Math.min(w, h) * 0.25);
            text.setAttribute("font-family", "system-ui");
            text.textContent = name;
            svg.append(text);
          }
        }
        return figure;
      })
  );
}

function showMessages(entries) {
  $("messages").replaceChildren(
    ...entries.map(([text, kind]) => {
      const div = document.createElement("div");
      div.className = `msg-${kind}`;
      div.textContent = text;
      return div;
    })
  );
}

for (const [key, area] of Object.entries(areas)) {
  area.addEventListener("input", compile);
  const fileInput = $(`file-${key}`);
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (file) {
      area.value = await file.text();
      compile();
    }
  });
  // Drag a .svg straight onto the textarea.
  const field = area.closest(".field");
  field.addEventListener("dragover", (e) => {
    e.preventDefault();
    field.classList.add("dragover");
  });
  field.addEventListener("dragleave", () => field.classList.remove("dragover"));
  field.addEventListener("drop", async (e) => {
    e.preventDefault();
    field.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      area.value = await file.text();
      compile();
    }
  });
}
$("name").addEventListener("input", compile);
$("copy").addEventListener("click", () => navigator.clipboard.writeText($("css").textContent));
$("copy-spec").addEventListener("click", () =>
  navigator.clipboard.writeText($("spec").textContent)
);

compile();
