const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#ffffff" />
  
  <!-- Outer yellow arcs -->
  <path d="M 230 85 A 190 190 0 0 1 450 250" fill="none" stroke="#f1a117" stroke-width="6" stroke-linecap="round"/>
  <circle cx="450" cy="275" r="8" fill="#f1a117"/>
  <path d="M 60 240 A 190 190 0 0 0 210 470" fill="none" stroke="#f1a117" stroke-width="6" stroke-linecap="round"/>
  
  <!-- Top Teal Figure -->
  <circle cx="178" cy="100" r="42" fill="#008c8b"/>
  <path d="M150,150 C230,120 330,150 400,240 C340,160 220,170 120,260 C90,290 60,330 90,250 C110,180 130,160 150,150 Z" fill="#008c8b"/>
  
  <!-- Bottom Blue Figure -->
  <circle cx="385" cy="310" r="34" fill="#002d64"/>
  <path d="M410,350 C380,450 250,490 140,430 C200,480 340,430 350,330 C360,250 420,300 410,350 Z" fill="#002d64"/>
           
  <!-- Central Shield with Heart cutout -->
  <path d="M 190 250 L 256 230 L 322 250 L 322 300 C 322 340, 256 375, 256 375 C 256 375, 190 340, 190 300 Z
           M 256 335 C 276 315, 296 295, 276 275 C 266 265, 256 275, 256 275 C 256 275, 246 265, 236 275 C 216 295, 236 315, 256 335 Z"
        fill="#008c8b" fill-rule="evenodd"/>
</svg>`;

const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const resolutions = [
  { size: 48, dir: 'mipmap-mdpi' },
  { size: 72, dir: 'mipmap-hdpi' },
  { size: 96, dir: 'mipmap-xhdpi' },
  { size: 144, dir: 'mipmap-xxhdpi' },
  { size: 192, dir: 'mipmap-xxxhdpi' },
];

// Also generate foreground (108dp * density, 432px for xxxhdpi)
const fgResolutions = [
  { size: 108, dir: 'mipmap-mdpi' },
  { size: 162, dir: 'mipmap-hdpi' },
  { size: 216, dir: 'mipmap-xhdpi' },
  { size: 324, dir: 'mipmap-xxhdpi' },
  { size: 432, dir: 'mipmap-xxxhdpi' },
];

const svgBuf = Buffer.from(iconSvg);

async function main() {
  for (const { size, dir } of resolutions) {
    const destDir = path.join(resDir, dir);
    await sharp(svgBuf).resize(size, size).png().toFile(path.join(destDir, 'ic_launcher.png'));
    await sharp(svgBuf).resize(size, size).png().toFile(path.join(destDir, 'ic_launcher_round.png'));
    console.log(`✓ ${dir}: ic_launcher.png (${size}px)`);
  }
  for (const { size, dir } of fgResolutions) {
    const destDir = path.join(resDir, dir);
    await sharp(svgBuf).resize(size, size).png().toFile(path.join(destDir, 'ic_launcher_foreground.png'));
    console.log(`✓ ${dir}: ic_launcher_foreground.png (${size}px)`);
  }
  console.log('\nAll SAHAY-AI icons generated!');
}
main().catch(console.error);
