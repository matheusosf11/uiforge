// Records the README demo (e2e/demo.spec.ts, mock model) and converts it to
// docs/demo.gif with a two-pass ffmpeg palette. ffmpeg is a system tool on PATH,
// not a project dependency.
//
// Usage:
//   npm run demo:gif                    record + convert
//   npm run demo:gif -- --convert-only  reuse test-results/demo/demo.webm
// Env: DEMO_GIF_START (seconds of the recording trimmed from the start, default 1.5),
//      DEMO_GIF_SPEED (playback speed-up, default 1.35; the recording has
//      real network/debounce waits), DEMO_GIF_MAX (max GIF length in seconds,
//      default 25), DEMO_GIF_FLOOR (RGB channel values below this are flattened
//      to the page background, default 26; 0 disables it).
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const MAX_BYTES = 3 * 1024 * 1024;
const VIDEO = join("test-results", "demo", "demo.webm");
const PALETTE = join("test-results", "demo", "palette.png");
const OUTPUT = join("docs", "demo.gif");
// Each ladder step renders here; OUTPUT is replaced only by a GIF within the
// size cap, so a failed or oversized run never clobbers the committed asset.
const TMP_GIF = join("test-results", "demo", "demo.tmp.gif");
// Tuning env vars: reject NaN and out-of-range values up front instead of
// handing ffmpeg a broken filter (setpts=PTS/0, -ss NaN, lutrgb with NaN).
function num(name, def, { min = 0, max = Infinity, gt = false } = {}) {
  const raw = process.env[name];
  const v = raw === undefined || raw.trim() === "" ? def : Number(raw);
  if (!Number.isFinite(v) || (gt ? v <= min : v < min) || v > max) {
    const range = `${gt ? ">" : ">="} ${min}${max < Infinity ? ` and <= ${max}` : ""}`;
    fail(`${name} must be a number ${range} (got "${raw}")`);
  }
  return v;
}
const START = String(num("DEMO_GIF_START", 1.5));
const SPEED = num("DEMO_GIF_SPEED", 1.35, { gt: true });
const MAX_LEN = num("DEMO_GIF_MAX", 25, { gt: true });
const FLOOR = Math.round(num("DEMO_GIF_FLOOR", 26, { max: 255 }));
// The animated three.js background redraws faint lines (and VP8 noise) on every
// frame, which defeats GIF frame diffing. Flattening near-black values to the
// page background (#060606) removes them; the UI panels (~#202020) and the bright
// nodes are above the floor and stay as they are.
const floorChannel = `if(lt(val,${FLOOR}),6,val)`;
const FLOOR_FILTER =
  FLOOR > 0
    ? `,format=rgb24,lutrgb=r='${floorChannel}':g='${floorChannel}':b='${floorChannel}'`
    : "";
// -t is an input option here, so scale it by the speed-up.
const INPUT_LEN = String(Math.round(MAX_LEN * SPEED * 100) / 100);
const convertOnly = process.argv.includes("--convert-only");

// Size ladder: fewer colours and no dithering first, then lower fps/width.
const LADDER = [
  { width: 960, fps: 12, colors: 256, dither: "bayer:bayer_scale=5" },
  { width: 960, fps: 12, colors: 128, dither: "bayer:bayer_scale=3" },
  { width: 960, fps: 12, colors: 128, dither: "none" },
  { width: 960, fps: 12, colors: 64, dither: "none" },
  { width: 960, fps: 10, colors: 64, dither: "none" },
  { width: 800, fps: 10, colors: 64, dither: "none" },
  { width: 720, fps: 8, colors: 64, dither: "none" },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ffmpeg(args) {
  const res = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], {
    stdio: "inherit",
  });
  if (res.error || res.status !== 0) fail(`ffmpeg failed: ${args.join(" ")}`);
}

const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
if (probe.error || probe.status !== 0) {
  fail(
    "demo:gif requires ffmpeg on PATH (https://ffmpeg.org/download.html; Windows: winget install Gyan.FFmpeg)",
  );
}

if (!convertOnly) {
  const run = spawnSync("npx", ["playwright", "test", "e2e/demo.spec.ts"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, DEMO: "1" },
  });
  if (run.error || run.status !== 0) {
    fail(`demo recording failed (exit ${run.status ?? run.error?.message})`);
  }
}

if (!existsSync(VIDEO)) fail(`missing ${VIDEO}; run without --convert-only first`);
mkdirSync("docs", { recursive: true });

let size = Infinity;
let used = LADDER[0];
for (const step of LADDER) {
  used = step;
  const base = `setpts=PTS/${SPEED},fps=${step.fps},scale=${step.width}:-1:flags=lanczos${FLOOR_FILTER}`;
  const trim = ["-ss", START, "-t", INPUT_LEN];
  // Pass 1: palette from the frames that change (stats_mode=diff).
  ffmpeg([
    "-y", ...trim, "-i", VIDEO,
    "-vf", `${base},palettegen=max_colors=${step.colors}:stats_mode=diff`,
    PALETTE,
  ]);
  // Pass 2: map onto the palette, redrawing only changed rectangles.
  ffmpeg([
    "-y", ...trim, "-i", VIDEO, "-i", PALETTE,
    "-lavfi", `${base}[x];[x][1:v]paletteuse=dither=${step.dither}:diff_mode=rectangle`,
    TMP_GIF,
  ]);
  size = statSync(TMP_GIF).size;
  console.log(
    `demo.gif: ${(size / 1024 / 1024).toFixed(2)} MB (width ${step.width}, ${step.fps} fps, ${step.colors} colors, dither ${step.dither}, -ss ${START} -t ${INPUT_LEN}, speed ${SPEED}x, floor ${FLOOR})`,
  );
  if (size <= MAX_BYTES) {
    copyFileSync(TMP_GIF, OUTPUT);
    break;
  }
}
rmSync(TMP_GIF, { force: true });

if (size > MAX_BYTES) {
  fail(`demo.gif is still over 3 MB at width ${used.width}, ${used.fps} fps; shorten the demo (${OUTPUT} left unchanged)`);
}
console.log(`wrote ${OUTPUT}`);
