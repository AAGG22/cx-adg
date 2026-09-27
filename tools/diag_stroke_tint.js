/**
 * Diagnóstico: tint de contorno SVG en cx-adg
 * Ejecutar: node tools/diag_stroke_tint.js
 */
const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "index.html");
const batPath = path.join(__dirname, "..", "svg", "bateria1.svg");
const html = fs.readFileSync(indexPath, "utf8");
const bat = fs.readFileSync(batPath, "utf8");

function extractFn(name) {
  const re = new RegExp(`function ${name}\\([^{]*\\{`);
  const m = html.match(re);
  if (!m) return null;
  let i = m.index + m[0].length - 1;
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) return html.slice(m.index, i + 1);
    }
  }
  return null;
}

const checks = [];
function check(label, ok, detail) {
  checks.push({ label, ok: !!ok, detail: detail || "" });
}

for (const fn of [
  "applySvgStrokeColor",
  "applySvgStrokeColorRegex",
  "tintedSvgUrlForNode",
  "nodeImageSrc",
  "nodeIsSvgImage",
  "getImg",
  "buildImgStrokeSwatches",
  "invalidateNodeTint",
]) {
  check(`fn ${fn}`, html.includes(`function ${fn}`));
}

check("swatch sets strokeColor", /n\.strokeColor\s*=\s*color/.test(html));
check("swatch invalidates node tint", /invalidateNodeTint/.test(html));
check("drawNode uses nodeImageSrc", /getImg\(\s*nodeImageSrc\(\s*n\s*\)\s*\)/.test(html));
check("SVG export passes strokeColor", /strokeColor\s*:\s*n\.strokeColor/.test(html));
check("blob URL createObjectURL", /createObjectURL\(new Blob/.test(html));
check("SW cache v31+", /cx-adg-static-v3[1-9]/.test(fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8")));

const helpers = [
  extractFn("expandHexColor"),
  extractFn("isOutlineFillHex"),
  extractFn("fixSvgXmlns"),
  extractFn("tintCssText"),
  extractFn("bakeShapeFill"),
  extractFn("applySvgStrokeColorRegex"),
  extractFn("applySvgStrokeColor"),
]
  .filter(Boolean)
  .join("\n");

// En Node no hay DOMParser: stubear para forzar el fallback regex (mismo resultado visual).
const prelude = `
var DOMParser = function(){ return { parseFromString: function(){ return { querySelector: function(){ return {}; }, documentElement: null }; } }; };
`;

let tinted = null;
let err = null;
try {
  const run = new Function(`${prelude}\n${helpers}\nreturn applySvgStrokeColor;`);
  const apply = run();
  tinted = apply(bat, "#ffffff");
} catch (e) {
  err = e;
}
check("applySvgStrokeColor runs", !err, err && err.message);

if (tinted) {
  const outline = (tinted.match(/id=["']outline["'][\s\S]*?<\/g>/i) || [])[0] || "";
  check("outline group exists after tint", /id=["']outline["']/.test(tinted));
  check("outline path has fill #ffffff attr", /fill=["']#ffffff["']/i.test(outline), outline.slice(0, 200));
  check("outline path lost class=st5", !/class=["'][^"']*st5/.test(outline));
  check("css .st5 is white or gone", !/\.st5\{fill:#222222\}/.test(tinted));
}

const defs = html.match(/function applySvgStrokeColor\(/g) || [];
check("single applySvgStrokeColor", defs.length === 1, `count=${defs.length}`);

console.log("\n=== DIAGNÓSTICO contorno SVG ===\n");
for (const c of checks) {
  console.log(`${c.ok ? "OK " : "FAIL"}  ${c.label}${c.detail ? " — " + c.detail : ""}`);
}
const failed = checks.filter((c) => !c.ok);
console.log(`\n${failed.length} fallos / ${checks.length} checks`);
if (tinted) {
  const sample = (tinted.match(/<g[^>]*id=["']outline["'][^>]*>[\s\S]{0,300}/) || [])[0];
  console.log("\n--- sample outline group ---\n", sample);
}
process.exit(failed.length ? 1 : 0);
