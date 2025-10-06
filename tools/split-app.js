const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "app.js");
const modulesDir = path.join(__dirname, "..", "scripts");

const text = fs.readFileSync(appPath, "utf8");
const lines = text.split(/\r?\n/);

const sectionRegex = /^\/\/\s*=+.*$/;

const sections = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (sectionRegex.test(line) && !/^\s/.test(line)) {
    const cleaned = line.replace(/^\/\/\s*/, "").replace(/\s*\/\/$/, "");
    const title = cleaned.replace(/=+/g, "").trim() || `section-${sections.length + 1}`;
    sections.push({ index: i, title });
  }
}

if (!sections.length) {
  console.error("No section headers found in app.js");
  process.exit(1);
}

if (!fs.existsSync(modulesDir)) {
  fs.mkdirSync(modulesDir, { recursive: true });
}

const slugCounts = Object.create(null);
function slugify(title) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
  if (!slugCounts[base]) {
    slugCounts[base] = 0;
    return base;
  }
  slugCounts[base] += 1;
  return `${base}-${slugCounts[base]}`;
}

for (let i = 0; i < sections.length; i++) {
  const start = sections[i].index;
  const end = i + 1 < sections.length ? sections[i + 1].index : lines.length;
  const chunkLines = lines.slice(start, end);
  const chunk = chunkLines.join("\n").replace(/\s+$/, "");

  const slug = slugify(sections[i].title);
  const filePath = path.join(modulesDir, `${slug}.js`);

  const content = `"use strict";\n${chunk}\n`;
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Created module: ${path.relative(path.join(__dirname, ".."), filePath)}`);
}

const newAppContent = [
  '"use strict";',
  '// Functionality moved into individual modules within the scripts/ directory.',
  '// This file is kept for compatibility and future orchestration hooks.'
].join("\n") + "\n";

fs.writeFileSync(appPath, newAppContent, "utf8");

console.log(`Refactor complete. Modules generated: ${sections.length}`);
