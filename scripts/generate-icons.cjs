const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 48, 128];
const icons = [
  { name: 'icon', color: '#dc143c', text: '🛡' },
  { name: 'safe', color: '#28a745', text: '✓' },
  { name: 'warning', color: '#ffc107', text: '!' },
  { name: 'danger', color: '#dc3545', text: '✗' }
];

async function generateIcon(name, size, color, text) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.2}"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" 
            font-family="Arial" font-size="${size * 0.6}" font-weight="bold" fill="white">${text}</text>
    </svg>
  `;
  
  const outputPath = path.join(iconsDir, `${name}-${size}.png`);
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);
  
  console.log(`Generated ${name}-${size}.png`);
}

async function main() {
  for (const icon of icons) {
    for (const size of sizes) {
      await generateIcon(icon.name, size, icon.color, icon.text);
    }
  }
  console.log('All icons generated!');
}

main().catch(console.error);
