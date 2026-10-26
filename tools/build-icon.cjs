const sharp = require('sharp');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = require('../fishing-mod-assets-v1/manifest.json');
const fish = manifest.sprites[manifest.animations.fish.yellowfin_tuna.portrait];

async function main() {
  const image = await sharp(path.join(root, 'fishing-mod-assets-v1', fish.file))
    .resize(768, 384, { kernel: 'nearest' }).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#081325' } })
    .composite([{ input: image, left: 128, top: 320 }])
    .png().toFile(path.join(root, '.claude-plugin/icon.png'));
}

main().catch(error => { console.error(error); process.exit(1); });
