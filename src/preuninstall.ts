#!/usr/bin/env bun

/**
 * @brisingr-kr/core preuninstall
 *
 * Removes symlinks created by postinstall.
 * Only removes links that point to our kit directory — never touches user files.
 */

import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  rmdirSync,
  unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

import type { AiKitManifest } from "./types";

export const MARKER_FILE = ".ai-kit-npm";
export const MANIFEST_FILE = ".ai-kit-manifest.json";
export const INCOMING_DIR = ".ai-kit-incoming";

export function getOpenCodeHome(): string {
  return process.env.OPENCODE_HOME ?? join(homedir(), ".config", "opencode");
}

export function isOurSymlink(linkPath: string, kitDir: string): boolean {
  try {
    if (!lstatSync(linkPath).isSymbolicLink()) return false;
    const target = readlinkSync(linkPath);
    const resolved = resolve(dirname(linkPath), target);
    return resolved.startsWith(kitDir);
  } catch {
    return false;
  }
}

export interface MarkerData {
  version: string;
  kitDir: string;
  installedAt: string;
  items: string[];
}

export function readMarker(ocHome: string): MarkerData | null {
  const markerPath = join(ocHome, MARKER_FILE);
  if (!existsSync(markerPath)) return null;

  try {
    return JSON.parse(readFileSync(markerPath, "utf-8"));
  } catch {
    return null;
  }
}

export function readManifest(ocHome: string): AiKitManifest | null {
  const manifestPath = join(ocHome, MANIFEST_FILE);
  if (!existsSync(manifestPath)) return null;

  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8")) as AiKitManifest;
  } catch {
    return null;
  }
}

export function sha256(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function removeIfEmpty(dirPath: string): void {
  try {
    const entries = readdirSync(dirPath);
    if (entries.length === 0) {
      rmdirSync(dirPath);
    }
  } catch {
    // ignore
  }
}

function cleanupManifestBased(ocHome: string, manifest: AiKitManifest): void {
  let removed = 0;
  let skipped = 0;

  for (const [relPath, entry] of Object.entries(manifest.files)) {
    const targetPath = join(ocHome, relPath);
    if (!existsSync(targetPath) && !lstatExistsSafe(targetPath)) continue;

    try {
      const currentHash = sha256(targetPath);
      if (currentHash === entry.installedHash) {
        rmSync(targetPath, { recursive: true, force: true });
        console.log(`  [OK] Removed ${relPath}`);
        removed++;
      } else {
        console.log(`  [!] Leaving user-modified file: ${relPath}`);
        skipped++;
      }
    } catch {
      // skip unreadable files
    }
  }

  const manifestPath = join(ocHome, MANIFEST_FILE);
  if (existsSync(manifestPath)) unlinkSync(manifestPath);

  const incomingPath = join(ocHome, INCOMING_DIR);
  removeIfEmpty(incomingPath);

  console.log(
    `\n  [OK] Cleanup complete: ${removed} removed, ${skipped} skipped (user files preserved)\n`,
  );
}

export function main(): void {
  const ocHome = getOpenCodeHome();

  console.log(`\n@brisingr-kr/core preuninstall`);
  console.log(`  target: ${ocHome}`);

  const manifest = readManifest(ocHome);
  if (manifest) {
    cleanupManifestBased(ocHome, manifest);
    return;
  }

  const marker = readMarker(ocHome);
  if (!marker) {
    console.log(`  [!] No install marker found, nothing to clean up`);
    return;
  }

  const kitDir = marker.kitDir;
  let removed = 0;
  let skipped = 0;

  for (const item of marker.items) {
    const linkPath = join(ocHome, item);

    if (!existsSync(linkPath) && !lstatExistsSafe(linkPath)) {
      continue;
    }

    if (isOurSymlink(linkPath, kitDir)) {
      unlinkSync(linkPath);
      console.log(`  [OK] Removed symlink: ${item}`);
      removed++;
    } else {
      console.log(
        `  [!] Skipped ${item} (not our symlink, user file preserved)`,
      );
      skipped++;
    }
  }

  // Clean up marker and legacy checksums
  const markerPath = join(ocHome, MARKER_FILE);
  if (existsSync(markerPath)) unlinkSync(markerPath);

  const checksumsPath = join(ocHome, ".ai-kit-checksums");
  if (existsSync(checksumsPath)) unlinkSync(checksumsPath);

  console.log(
    `\n  [OK] Cleanup complete: ${removed} removed, ${skipped} skipped (user files preserved)\n`,
  );
}

export function lstatExistsSafe(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

// Only auto-execute when run directly (not when imported for testing)
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("preuninstall.js") ||
    process.argv[1].endsWith("preuninstall.ts"));

if (isDirectExecution) {
  try {
    main();
  } catch (error) {
    console.error(
      `\n  [X] @brisingr-kr/core preuninstall failed:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}
