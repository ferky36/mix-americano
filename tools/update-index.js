const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "index.html");
const version = "2025-08-29";
const extra = `  <script src="scripts/standings-export.js?v=${version}"></script>\n`;

let html = fs.readFileSync(indexPath, "utf8");
if (html.includes("scripts/standings-export.js")) {
  console.log("standings-export already present");
  process.exit(0);
}

// insert before app.js
html = html.replace(/\n\s*<script src="app\.js\?v=2025-08-29"><\/script>/, `\n${extra}  <script src="app.js?v=${version}"></script>`);

fs.writeFileSync(indexPath, html, "utf8");
console.log("index.html updated with standings-export.js");
