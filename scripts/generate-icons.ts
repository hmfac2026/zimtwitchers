import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "public/logo");
mkdirSync(outDir, { recursive: true });

const source = readFileSync(resolve(outDir, "pitta-icon.svg"));

// Maskable icons need a "safe zone" — Android masks aggressively, so we
// composite the icon onto a forest-green background that bleeds past the
// rounded corners of the source square.
const FOREST = "#2D5016";

async function render(size: number, file: string) {
  await sharp(source, { density: 384 }).resize(size, size).png().toFile(resolve(outDir, file));
}

async function renderMaskable(size: number, file: string) {
  const innerSize = Math.round(size * 0.78);
  const inner = await sharp(source, { density: 384 })
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: FOREST,
    },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toFile(resolve(outDir, file));
}

async function main() {
  await Promise.all([
    render(192, "icon-192.png"),
    render(512, "icon-512.png"),
    renderMaskable(512, "icon-maskable-512.png"),
  ]);
  console.log("Generated:");
  console.log("  public/logo/icon-192.png (192x192)");
  console.log("  public/logo/icon-512.png (512x512)");
  console.log("  public/logo/icon-maskable-512.png (512x512, maskable)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
