#!/usr/bin/env node

/**
 * @ai-kit/core postinstall
 *
 * Creates symlinks from ~/.config/opencode/ → this package's kit/ directory.
 * Handles personalisation safety: detects user-modified files and preserves them.
 *
 * Symlinked items: opencode.json, AGENTS.md, agents/, skills/, protocols/, plugins/
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const KIT_LINK_ITEMS = [
  "opencode.json",
  "AGENTS.md",
  "agents",
  "skills",
  "protocols",
  "plugins",
] as const;

export const MARKER_FILE = ".ai-kit-npm";
export const CHECKSUMS_FILE = ".ai-kit-checksums";
export const BACKUP_SUFFIX = ".user-backup";

export function getOpenCodeHome(): string {
  return (
    process.env.OPENCODE_HOME ?? join(homedir(), ".config", "opencode")
  );
}

export function getKitDir(): string {
  return resolve(join(__dirname, "..", "kit"));
}

export function sha256(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export function isSymlinkToKit(linkPath: string, kitDir: string): boolean {
  try {
    if (!lstatSync(linkPath).isSymbolicLink()) return false;
    const target = readlinkSync(linkPath);
    return resolve(dirname(linkPath), target).startsWith(kitDir);
  } catch {
    return false;
  }
}

export function isOurSymlink(linkPath: string): boolean {
  try {
    if (!lstatSync(linkPath).isSymbolicLink()) return false;
    const target = readlinkSync(linkPath);
    return target.includes("@ai-kit") || target.includes("ai-kit");
  } catch {
    return false;
  }
}

export function walkFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const stat = statSync(dir);
  if (stat.isFile()) return [dir];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

export function computeChecksums(kitDir: string): Record<string, string> {
  const checksums: Record<string, string> = {};
  for (const item of KIT_LINK_ITEMS) {
    const itemPath = join(kitDir, item);
    if (!existsSync(itemPath)) continue;

    const files = walkFiles(itemPath);
    for (const file of files) {
      const relPath = file.slice(kitDir.length + 1);
      checksums[relPath] = sha256(file);
    }
  }
  return checksums;
}

export function readStoredChecksums(
  ocHome: string
): Record<string, string> | null {
  const checksumPath = join(ocHome, CHECKSUMS_FILE);
  if (!existsSync(checksumPath)) return null;

  try {
    return JSON.parse(readFileSync(checksumPath, "utf-8"));
  } catch {
    return null;
  }
}

export function writeChecksums(
  ocHome: string,
  checksums: Record<string, string>
): void {
  writeFileSync(
    join(ocHome, CHECKSUMS_FILE),
    JSON.stringify(checksums, null, 2) + "\n",
    "utf-8"
  );
}

export function backupUserFile(filePath: string): void {
  const backupPath = filePath + BACKUP_SUFFIX;
  console.log(`  [!] Backing up user-modified file: ${filePath} → ${backupPath}`);
  renameSync(filePath, backupPath);
}

export function detectUserModifications(
  ocHome: string,
  storedChecksums: Record<string, string>
): string[] {
  const modified: string[] = [];

  for (const [relPath, storedHash] of Object.entries(storedChecksums)) {
    const filePath = join(ocHome, relPath);
    if (!existsSync(filePath)) continue;
    if (lstatSync(filePath).isSymbolicLink()) continue;

    try {
      const currentHash = sha256(filePath);
      if (currentHash !== storedHash) {
        modified.push(relPath);
      }
    } catch {
      // skip unreadable files
    }
  }

  return modified;
}

export function safeCreateLink(
  kitDir: string,
  ocHome: string,
  item: string
): void {
  const source = join(kitDir, item);
  const target = join(ocHome, item);

  if (!existsSync(source)) {
    console.log(`  [!] Kit item not found, skipping: ${item}`);
    return;
  }

  try {
    const targetStat = lstatSync(target);
    const targetExists = true;

    if (targetStat.isSymbolicLink()) {
      if (isOurSymlink(target)) {
        unlinkSync(target);
      } else {
        console.log(`  [!] ${item}: foreign symlink exists, replacing`);
        unlinkSync(target);
      }
    } else {
      backupUserFile(target);
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
    // target doesn't exist, proceed
  }

  symlinkSync(source, target);
  console.log(`  [OK] ${item} → ${source}`);
}

export function writeMarker(ocHome: string, kitDir: string): void {
  const marker = {
    version: getPackageVersion(),
    kitDir,
    installedAt: new Date().toISOString(),
    items: [...KIT_LINK_ITEMS],
  };

  writeFileSync(
    join(ocHome, MARKER_FILE),
    JSON.stringify(marker, null, 2) + "\n",
    "utf-8"
  );
}

export function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf-8")
    );
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function main(): void {
  const ocHome = getOpenCodeHome();
  const kitDir = getKitDir();

  console.log(`\n@ai-kit/core postinstall`);
  console.log(`  target: ${ocHome}`);
  console.log(`  source: ${kitDir}`);

  if (!existsSync(kitDir)) {
    console.log(`  [X] Kit directory not found: ${kitDir}`);
    console.log(`  Skipping postinstall (development mode?)`);
    return;
  }

  mkdirSync(ocHome, { recursive: true });

  // Detect user modifications before overwriting
  const storedChecksums = readStoredChecksums(ocHome);
  if (storedChecksums) {
    const modified = detectUserModifications(ocHome, storedChecksums);
    if (modified.length > 0) {
      console.log(`\n  User-modified files detected:`);
      for (const m of modified) {
        console.log(`    - ${m}`);
      }
      console.log(`  These will be backed up with ${BACKUP_SUFFIX} suffix.\n`);
    }
  }

  // Create symlinks
  for (const item of KIT_LINK_ITEMS) {
    safeCreateLink(kitDir, ocHome, item);
  }

  // Write checksums for next update
  const newChecksums = computeChecksums(kitDir);
  writeChecksums(ocHome, newChecksums);

  // Write marker so the updater plugin knows we're npm-distributed
  writeMarker(ocHome, kitDir);

  console.log(`\n  [OK] @ai-kit/core v${getPackageVersion()} installed successfully\n`);
}

// Only auto-execute when run directly (not when imported for testing)
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("postinstall.js") ||
    process.argv[1].endsWith("postinstall.ts"));

if (isDirectExecution) {
  try {
    main();
  } catch (error) {
    console.error(
      `\n  [X] @ai-kit/core postinstall failed:`,
      error instanceof Error ? error.message : String(error)
    );
    // Don't exit(1) — postinstall failures shouldn't block npm install
  }
}
