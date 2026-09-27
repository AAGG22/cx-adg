/**
 * Simula el path completo de export SVG con strokeColor.
 */
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const bat = fs.readFileSync(path.join(__dirname, "..", "svg", "bateria1.svg"), "utf8");

function extractRange(startMarker, endMarker) {
  const a = html.indexOf(startMarker);
  const b = html.indexOf(endMarker);
  if (a < 0 || b < 0 || b <= a) throw new Error("range " + startMarker);
  return html.slice(a, b);
}

const block1 = extractRange("function fixSvgXmlns", "function ensureImgLoaded");
const block2 = extractRange("function escapeXML", "function rasterImageToSVG");

const api = new Function(
  block1 + "\n" + block2 + "\nreturn { fixSvgXmlns, applySvgStrokeColor, uniquifySvgIds, inlineSvgAt, decodeSvgDataUrl, isSvgDataUrl };"
)();

const dataUrl =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(api.fixSvgXmlns(bat));
const xml = api.decodeSvgDataUrl(dataUrl);
const out = api.inlineSvgAt(xml, 60, 60, 80, 80, {
  flipH: false,
  idPrefix: "n7-",
  strokeColor: "#ffffff",
});

fs.writeFileSync(
  path.join(__dirname, "_export_sample.svg"),
  '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
    out +
    "</svg>"
);

const outline = (out.match(/id="[^"]*outline"[\s\S]*?<\/g>/i) || [])[0] || "";
console.log("outline sample:", outline.slice(0, 280));
console.log("has fill white", /fill="#ffffff"/i.test(outline));
console.log("has class st5 in outline", /st5/.test(outline));
console.log("has #222222 in out", out.includes("#222222"));
console.log("has n7-outline", out.includes("n7-outline"));
console.log("cx-outline-tint", /cx-outline-tint/.test(out));
console.log("out length", out.length);

// Also: canvas path tintedSvgUrl
const tinted = api.applySvgStrokeColor(xml, "#ffffff");
const tintUrl =
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(tinted);
console.log("canvas tint url length", tintUrl.length);
console.log(
  "canvas outline fill white",
  /id="outline"[\s\S]*?fill="#ffffff"/i.test(tinted)
);
