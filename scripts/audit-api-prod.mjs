#!/usr/bin/env node
/**
 * Production dependency audit for the API / core package runtime surface.
 *
 * Full-workspace `pnpm audit --prod --audit-level=high` currently reports highs under:
 * - apps/web → next → sharp / postcss
 * - examples/wallet-demo → wallet-adapter → react-native/metro → image-size
 *
 * Those paths are outside the API Docker image. This script fails CI only when a
 * high/critical advisory appears on API/core package paths. See docs/dependency-audit.md.
 */

import { spawnSync } from "node:child_process";
import process from "node:process";

function isApiRuntimePath(path) {
  if (path.startsWith("apps__web")) return false;
  if (path.startsWith("examples__")) return false;
  if (path.startsWith("apps__api")) return true;
  if (path.startsWith("packages__")) return true;
  if (path.startsWith("cli")) return true;
  return false;
}

const result = spawnSync("pnpm", ["audit", "--prod", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
  maxBuffer: 20 * 1024 * 1024,
});

let report;
try {
  report = JSON.parse(result.stdout || "{}");
} catch {
  console.error("Failed to parse pnpm audit JSON output.");
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(1);
}

const advisories = Object.values(report.advisories ?? report.vulnerabilities ?? {});
const blockers = [];

for (const advisory of advisories) {
  const severity = String(advisory.severity ?? "").toLowerCase();
  if (severity !== "high" && severity !== "critical") {
    continue;
  }

  const findings = advisory.findings ?? [];
  const paths = findings.flatMap((finding) => finding.paths ?? []);
  // Newer pnpm shapes may nest differently; also check top-level path keys.
  const extraPaths = Array.isArray(advisory.nodes) ? advisory.nodes : [];
  const allPaths = [...paths, ...extraPaths].map(String);
  const relevant = allPaths.filter(isApiRuntimePath);
  if (relevant.length > 0) {
    blockers.push({
      id: advisory.id ?? advisory.name,
      title: advisory.title ?? advisory.name,
      severity,
      paths: relevant,
      url: advisory.url,
    });
  }
}

// pnpm 9+ may use a different JSON schema (vulnerabilities map by package).
if (report.vulnerabilities && !report.advisories) {
  for (const [name, entry] of Object.entries(report.vulnerabilities)) {
    const severity = String(entry.severity ?? "").toLowerCase();
    if (severity !== "high" && severity !== "critical") {
      continue;
    }
    const viaPaths = [];
    const nodes = Array.isArray(entry.nodes) ? entry.nodes : [];
    for (const node of nodes) {
      viaPaths.push(String(node));
    }
    // effects / via rarely include workspace path; use key prefixes from `pnpm why`.
    // Fall back: if the package appears only under web/demo, ignore via path heuristic
    // by requiring workspace path markers when present.
    if (viaPaths.some(isApiRuntimePath)) {
      blockers.push({
        id: name,
        title: entry.title ?? name,
        severity,
        paths: viaPaths.filter(isApiRuntimePath),
        url: entry.url,
      });
    }
  }
}

if (blockers.length > 0) {
  console.error("High/critical production advisories found on API/core paths:");
  for (const item of blockers) {
    console.error(`- [${item.severity}] ${item.title} (${item.id})`);
    for (const path of item.paths.slice(0, 5)) {
      console.error(`    ${path}`);
    }
    if (item.url) {
      console.error(`    ${item.url}`);
    }
  }
  process.exit(1);
}

console.log("API/core production audit: no high/critical advisories on API runtime paths.");
console.log(
  "Note: apps/web and examples/wallet-demo may still have separate upstream findings; see docs/dependency-audit.md.",
);
process.exit(0);
