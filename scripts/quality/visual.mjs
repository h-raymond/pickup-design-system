#!/usr/bin/env node
/**
 * Visual parity helper for the Figma → code verification loop.
 *
 *   capture: screenshot a running page (app route or Storybook story) at an exact viewport.
 *     node scripts/quality/visual.mjs capture <url> <out.png> [--width 402] [--height 874] [--wait 10000]
 *
 *   diff: compare the Figma screenshot with the build screenshot.
 *     node scripts/quality/visual.mjs diff <figma.png> <build.png> <diff.png>
 *     Prints JSON { mismatch, width, height } and writes a diff image (red = differing pixels).
 *
 * Why the iframe: headless Chrome won't lay out a viewport narrower than 500px, so phone frames
 * are rendered inside an iframe of the exact size and cropped back out.
 * Chrome is found via $CHROME_PATH, then the default macOS / Linux locations.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[++i];
  else positional.push(rest[i]);
}

/** Locate a Chrome/Chromium binary or fail with an actionable message. */
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) throw new Error('Chrome not found. Set CHROME_PATH to a Chrome/Chromium binary.');
  return found;
}

const readPng = (p) => PNG.sync.read(fs.readFileSync(p));

/** Copy a rectangle out of a PNG. */
function crop(png, x, y, w, h) {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(png, out, x, y, w, h, 0, 0);
  return out;
}

/** Nearest-neighbour resize, enough to line up a 2x Figma export with a 1x build capture. */
function resize(png, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.floor((x * png.width) / w);
      const sy = Math.floor((y * png.height) / h);
      const si = (sy * png.width + sx) * 4;
      const di = (y * w + x) * 4;
      png.data.copy(out.data, di, si, si + 4);
    }
  }
  return out;
}

function capture(url, outPath) {
  const width = Number(flags.width ?? 402);
  const height = Number(flags.height ?? 874);
  const wait = Number(flags.wait ?? 10000);
  const windowWidth = Math.max(width, 500);
  const offset = Math.floor((windowWidth - width) / 2);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pk-visual-'));
  const harness = path.join(tmp, 'harness.html');
  fs.writeFileSync(
    harness,
    `<html><body style="margin:0;background:#000"><iframe src="${url}" width="${width}" height="${height}" style="border:0;display:block;margin-left:${offset}px"></iframe></body></html>`,
  );
  const raw = path.join(tmp, 'raw.png');
  execFileSync(
    findChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-prefers-reduced-motion',
      `--window-size=${windowWidth},${height}`,
      `--virtual-time-budget=${wait}`,
      `--screenshot=${raw}`,
      `file://${harness}`,
    ],
    { stdio: 'ignore' },
  );
  fs.writeFileSync(outPath, PNG.sync.write(crop(readPng(raw), offset, 0, width, height)));
  console.log(JSON.stringify({ captured: outPath, width, height }));
}

function diff(figmaPath, buildPath, diffPath) {
  let a = readPng(figmaPath);
  let b = readPng(buildPath);
  // Compare at the smaller of the two sizes so a 2x Figma export lines up with a 1x capture.
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  if (a.width !== width || a.height !== height) a = resize(a, width, Math.round((a.height * width) / a.width));
  if (b.width !== width || b.height !== height) b = resize(b, width, Math.round((b.height * width) / b.width));
  const h = Math.min(a.height, b.height);
  a = crop(a, 0, 0, width, h);
  b = crop(b, 0, 0, width, h);
  const out = new PNG({ width, height: h });
  const differing = pixelmatch(a.data, b.data, out.data, width, h, { threshold: 0.15, includeAA: false, alpha: 0.2 });
  fs.writeFileSync(diffPath, PNG.sync.write(out));
  console.log(JSON.stringify({ mismatch: Number((differing / (width * h)).toFixed(4)), width, height: h, diff: diffPath }));
}

if (cmd === 'capture' && positional.length === 2) capture(positional[0], positional[1]);
else if (cmd === 'diff' && positional.length === 3) diff(...positional);
else {
  console.error('Usage:\n  visual.mjs capture <url> <out.png> [--width 402] [--height 874] [--wait 10000]\n  visual.mjs diff <figma.png> <build.png> <diff.png>');
  process.exit(2);
}
