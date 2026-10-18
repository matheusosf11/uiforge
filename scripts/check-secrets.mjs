// Fails when an API key or token shows up where it must never be: the files
// served to the browser (.next/static, after `next build`) and the files
// tracked by git. Run in CI after the build: `node scripts/check-secrets.mjs`.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const PATTERNS = [
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "Private key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];
// Names of server-only variables: their values may never reach the client.
const SERVER_ONLY = ["GOOGLE_GENERATIVE_AI_API_KEY", "UPSTASH_REDIS_REST_TOKEN"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const problems = [];

function scan(file, text) {
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) problems.push(`${name} in ${file}`);
  }
}

// 1. Browser bundle: no key patterns and no server-only variable values.
const staticDir = path.join(".next", "static");
if (existsSync(staticDir)) {
  const values = SERVER_ONLY.map((k) => process.env[k]).filter(
    (v) => typeof v === "string" && v.length >= 8,
  );
  for (const file of walk(staticDir)) {
    if (!/\.(js|css|html|json|map)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    scan(file, text);
    for (const value of values) {
      if (text.includes(value)) problems.push(`server-only value in ${file}`);
    }
  }
} else {
  console.warn("check-secrets: .next/static not found; run after `next build`.");
}

// 2. Tracked files (what is on GitHub). .env.example only holds empty names.
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
for (const file of tracked) {
  if (/\.(png|jpe?g|gif|ico|webp|woff2?|ttf|gz|zip|lock)$/i.test(file)) continue;
  if (/(^|\/)\.env(\.|$)/.test(file) && !file.endsWith(".env.example")) {
    problems.push(`env file tracked by git: ${file}`);
    continue;
  }
  if (!existsSync(file)) continue;
  scan(file, readFileSync(file, "utf8"));
}

if (problems.length > 0) {
  console.error("check-secrets: possible secret exposure:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("check-secrets: no secrets in the browser bundle or tracked files.");
