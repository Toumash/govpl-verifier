const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 48, 128];
const newLogoPath = path.join(iconsDir, 'new-logo.png');

async function generateIconFromLogo(size) {
  const outputPath = path.join(iconsDir, `icon-${size}.png`);
  await sharp(newLogoPath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(outputPath);
  
  console.log(`Generated icon-${size}.png from new-logo.png`);
}

async function main() {
  // Check if new-logo.png exists
  if (!fs.existsSync(newLogoPath)) {
    console.error('new-logo.png not found in public/icons/');
    process.exit(1);
  }

  // Generate icon sizes from new-logo.png
  for (const size of sizes) {
    await generateIconFromLogo(size);
  }
  
  console.log('All icons generated from new-logo.png!');
}

main().catch(console.error);
