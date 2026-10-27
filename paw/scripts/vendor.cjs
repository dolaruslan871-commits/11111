const fs = require("node:fs");
const path = require("node:path");
const target = path.join(__dirname, "..", "src", "vendor");
fs.mkdirSync(target, { recursive: true });
for (const file of ["three.module.js", "three.core.js"]) {
  fs.copyFileSync(
    path.join(__dirname, "..", "node_modules", "three", "build", file),
    path.join(target, file),
  );
}
fs.copyFileSync(
  path.join(__dirname, "..", "node_modules", "three", "LICENSE"),
  path.join(target, "THREE-LICENSE.txt"),
);
console.log("Pinned Three.js copied for offline file:// rendering.");

fs.writeFileSync(
  path.join(__dirname, "..", "src", "life-browser.js"),
  "// Generated from life.cjs.\n" +
    fs
      .readFileSync(path.join(__dirname, "..", "src", "life.cjs"), "utf8")
      .replace(/module\.exports\s*=\s*\{/, "export {"),
);

fs.writeFileSync(
  path.join(__dirname, "..", "src", "v5-model-browser.js"),
  "// Generated from v5-model.cjs.\n" +
    fs
      .readFileSync(path.join(__dirname, "..", "src", "v5-model.cjs"), "utf8")
      .replace(/module\.exports\s*=\s*\{/, "export {"),
);

fs.writeFileSync(
  path.join(__dirname, "..", "src", "game-engine-browser.js"),
  "// Generated from game-engine.cjs.\n" +
    fs
      .readFileSync(
        path.join(__dirname, "..", "src", "game-engine.cjs"),
        "utf8",
      )
      .replace(
        /const\s*\{\s*stock\s*\}\s*=\s*require\(["']\.\/v5-model\.cjs["']\);?/,
        "import{stock}from './v5-model-browser.js';",
      )
      .replace(/module\.exports\s*=\s*\{/, "export {"),
);

fs.copyFileSync(
  path.join(
    __dirname,
    "..",
    "node_modules",
    "mp4-muxer",
    "build",
    "mp4-muxer.mjs",
  ),
  path.join(target, "mp4-muxer.mjs"),
);
fs.copyFileSync(
  path.join(__dirname, "..", "node_modules", "mp4-muxer", "LICENSE"),
  path.join(target, "MP4-MUXER-LICENSE.txt"),
);
