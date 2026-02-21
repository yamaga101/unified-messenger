const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Create SVG icon for Unified Messenger
// A speech bubble with multiple colored dots representing services
const createSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <!-- Background circle -->
  <circle cx="64" cy="64" r="60" fill="#1E293B"/>

  <!-- Chat bubble shape -->
  <path d="M32 38 C32 32 38 26 44 26 L84 26 C90 26 96 32 96 38 L96 72 C96 78 90 84 84 84 L56 84 L42 98 L42 84 L44 84 C38 84 32 78 32 72 Z" fill="white" opacity="0.95"/>

  <!-- Service dots - 2 rows of 4 -->
  <!-- Row 1: Gmail(red), Chat(green), Chatwork(red), Garoon(blue) -->
  <circle cx="48" cy="48" r="6" fill="#EA4335"/>
  <circle cx="64" cy="48" r="6" fill="#00AC47"/>
  <circle cx="80" cy="48" r="6" fill="#E5302E"/>

  <!-- Row 2: Teams(purple), Slack(purple), Discord(blue), LINE(green) -->
  <circle cx="48" cy="66" r="6" fill="#6264A7"/>
  <circle cx="64" cy="66" r="6" fill="#4A154B"/>
  <circle cx="80" cy="66" r="6" fill="#5865F2"/>
</svg>`;

const iconsDir = path.join(__dirname, "..", "public", "icons");

// Write SVGs first, then convert if possible
for (const size of [16, 48, 128]) {
  const svgPath = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(svgPath, createSvg(size));
}

// Try to convert SVG to PNG using sips (macOS built-in) or rsvg-convert
let converted = false;

// Try rsvg-convert first (best quality)
try {
  for (const size of [16, 48, 128]) {
    const svgPath = path.join(iconsDir, `icon${size}.svg`);
    const pngPath = path.join(iconsDir, `icon${size}.png`);
    execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${pngPath}"`, { stdio: "pipe" });
  }
  converted = true;
  console.log("Icons converted with rsvg-convert");
} catch {
  console.log("rsvg-convert not available, trying alternative...");
}

// Try qlmanage (macOS built-in)
if (!converted) {
  try {
    for (const size of [16, 48, 128]) {
      const svgPath = path.join(iconsDir, `icon${size}.svg`);
      const pngPath = path.join(iconsDir, `icon${size}.png`);
      execSync(`qlmanage -t -s ${size} -o "${iconsDir}" "${svgPath}" 2>/dev/null`, { stdio: "pipe" });
      // qlmanage creates file.svg.png, rename it
      const qlOutput = svgPath + ".png";
      if (fs.existsSync(qlOutput)) {
        fs.renameSync(qlOutput, pngPath);
      }
    }
    converted = true;
    console.log("Icons converted with qlmanage");
  } catch {
    console.log("qlmanage conversion failed");
  }
}

if (!converted) {
  console.log("Could not convert to PNG. SVG files created in public/icons/");
  console.log("Install librsvg to convert: brew install librsvg");
}

// Clean up SVGs
for (const size of [16, 48, 128]) {
  const svgPath = path.join(iconsDir, `icon${size}.svg`);
  if (fs.existsSync(svgPath)) {
    fs.unlinkSync(svgPath);
  }
}
