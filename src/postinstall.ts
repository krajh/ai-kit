#!/usr/bin/env bun

/**
 * @brisingr-kr/core postinstall
 *
 * Copies files from this package's kit/ directory into ~/.config/opencode/.
 * Tracks installed files via .ai-kit-manifest.json and preserves user edits.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

import type { AiKitManifest, FileEntry } from "./types";
import { readManifest, writeManifest } from "./lib/manifest";

export const KIT_LINK_ITEMS = [
  "opencode.json",
  "AGENTS.md",
  "bunfig.toml",
  "agents",
  "skills",
  "protocols",
  "plugins",
] as const;

export const MARKER_FILE = ".ai-kit-npm";
export { MANIFEST_FILE } from "./lib/manifest";
export const INCOMING_DIR = ".ai-kit-incoming";

export interface InstallOptions {
  configDir?: string;
}

export function getOpenCodeHome(): string {
  return process.env.OPENCODE_HOME ?? join(homedir(), ".config", "opencode");
}

export function getKitDir(): string {
  return resolve(join(__dirname, "..", "kit"));
}

export function sha256(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
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

export { readManifest, writeManifest } from "./lib/manifest";

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, data: Record<string, unknown>): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function mergeJson(
  installed: Record<string, unknown>,
  incoming: Record<string, unknown>,
  user: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...incoming, ...user };

  for (const key of Object.keys(incoming)) {
    if (Array.isArray(incoming[key]) && Array.isArray(user[key])) {
      const userItems = (user[key] as unknown[]).filter(
        (item) => !(incoming[key] as unknown[]).includes(item),
      );
      merged[key] = [...(incoming[key] as unknown[]), ...userItems];
    }
  }

  return merged;
}

function ensureDirForFile(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function copyFile(source: string, dest: string): void {
  ensureDirForFile(dest);
  copyFileSync(source, dest);
}

function stageIncoming(ocHome: string, relPath: string, source: string): void {
  const incomingPath = join(ocHome, INCOMING_DIR, relPath);
  copyFile(source, incomingPath);
  console.log(
    `  [!] User-modified file detected, new version staged at ${INCOMING_DIR}/${relPath}`,
  );
}

function getCategoryForItem(item: string): FileEntry["category"] {
  if (item === "opencode.json") return "merged";
  if (item === "bunfig.toml") return "generated";
  return "managed";
}

function updateManifestEntry(
  manifest: AiKitManifest,
  relPath: string,
  category: FileEntry["category"],
  source: string,
  dest: string,
): void {
  manifest.files[relPath] = {
    category,
    installedHash: sha256(dest),
    sourceHash: sha256(source),
  };
}

function extractInstallSection(source: string): string | null {
  const match = source.match(/^\[install\][\s\S]*?(?=^\[|\s*$)/m);
  if (!match) return null;
  return match[0].trimEnd();
}

function updateBunfigToml(
  source: string,
  dest: string,
  entry: FileEntry | undefined,
  manifest: AiKitManifest,
): void {
  if (!existsSync(dest)) {
    copyFile(source, dest);
    updateManifestEntry(manifest, "bunfig.toml", "generated", source, dest);
    console.log("  [OK] bunfig.toml installed");
    return;
  }

  if (entry) {
    const currentHash = sha256(dest);
    if (currentHash === entry.installedHash) {
      copyFile(source, dest);
      updateManifestEntry(manifest, "bunfig.toml", "generated", source, dest);
      console.log("  [OK] bunfig.toml updated");
      return;
    }
  }

  const sourceHash = sha256(source);
  const currentHash = sha256(dest);
  if (!entry && currentHash === sourceHash) {
    updateManifestEntry(manifest, "bunfig.toml", "generated", source, dest);
    console.log("  [OK] bunfig.toml already up-to-date");
    return;
  }

  const destContent = readFileSync(dest, "utf-8");
  if (/^\[install\]/m.test(destContent)) {
    console.log(
      "  [!] bunfig.toml already contains [install] section, leaving user changes",
    );
    return;
  }

  const sourceContent = readFileSync(source, "utf-8");
  const installSection = extractInstallSection(sourceContent);
  if (!installSection) {
    console.log(
      "  [!] bunfig.toml missing [install] section in kit, skipping append",
    );
    return;
  }

  const nextContent = `${destContent.trimEnd()}\n\n${installSection}\n`;
  writeFileSync(dest, nextContent, "utf-8");
  console.log("  [OK] bunfig.toml appended with [install] section");
}

export function installKit(kitDir: string, ocHome: string): AiKitManifest {
  mkdirSync(ocHome, { recursive: true });

  const existingManifest = readManifest(ocHome);
  const manifest = existingManifest ?? {
    version: getPackageVersion(),
    installedAt: new Date().toISOString(),
    installedVia: "npm",
    files: {},
  };
  const isFreshInstall = !existingManifest;

  manifest.version = getPackageVersion();
  manifest.installedAt = new Date().toISOString();

  for (const item of KIT_LINK_ITEMS) {
    const sourceRoot = join(kitDir, item);
    if (!existsSync(sourceRoot)) {
      console.log(`  [!] Kit item not found, skipping: ${item}`);
      continue;
    }

    if (item === "bunfig.toml") {
      updateBunfigToml(
        sourceRoot,
        join(ocHome, item),
        manifest.files[item],
        manifest,
      );
      continue;
    }

    const files = walkFiles(sourceRoot);
    const category = getCategoryForItem(item);

    for (const sourcePath of files) {
      const relPath = sourcePath.slice(kitDir.length + 1);
      const destPath = join(ocHome, relPath);
      const entry = manifest.files[relPath];

      if (category === "merged" && relPath === "opencode.json" && !entry) {
        if (isFreshInstall && !existsSync(destPath)) {
          copyFile(sourcePath, destPath);
          updateManifestEntry(
            manifest,
            relPath,
            category,
            sourcePath,
            destPath,
          );
          console.log("  [OK] opencode.json installed");
        } else {
          console.log(
            `  [!] Skipping ${relPath}: exists but not in ai-kit manifest`,
          );
        }
        continue;
      }

      if (!existsSync(destPath)) {
        copyFile(sourcePath, destPath);
        updateManifestEntry(manifest, relPath, category, sourcePath, destPath);
        console.log(`  [OK] Installed ${relPath}`);
        continue;
      }

      if (!entry) {
        console.log(
          `  [!] Skipping ${relPath}: exists but not in ai-kit manifest`,
        );
        continue;
      }

      if (category === "merged" && relPath === "opencode.json") {
        const incoming = readJsonFile(sourcePath);
        const user = readJsonFile(destPath);
        if (!incoming || !user) {
          stageIncoming(ocHome, relPath, sourcePath);
          continue;
        }

        let installed = incoming;
        if (entry) {
          const currentHash = sha256(destPath);
          installed = currentHash === entry.installedHash ? user : incoming;
        }

        const merged = mergeJson(installed ?? {}, incoming, user) as Record<
          string,
          unknown
        >;
        writeJsonFile(destPath, merged);
        updateManifestEntry(manifest, relPath, category, sourcePath, destPath);
        console.log("  [OK] opencode.json merged");
        continue;
      }

      const currentHash = sha256(destPath);
      if (currentHash === entry.installedHash) {
        copyFile(sourcePath, destPath);
        updateManifestEntry(manifest, relPath, category, sourcePath, destPath);
        console.log(`  [OK] Updated ${relPath}`);
        continue;
      }

      stageIncoming(ocHome, relPath, sourcePath);
    }
  }

  writeManifest(ocHome, manifest);
  writeMarker(ocHome, kitDir);
  return manifest;
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
    "utf-8",
  );
}

export function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
    );
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function installAiKit(
  options: InstallOptions = {},
): Promise<void> {
  const ocHome = options.configDir ?? getOpenCodeHome();
  const kitDir = getKitDir();

  console.log(`\n@brisingr-kr/core postinstall`);
  console.log(`  target: ${ocHome}`);
  console.log(`  source: ${kitDir}`);

  if (!existsSync(kitDir)) {
    console.log(`  [X] Kit directory not found: ${kitDir}`);
    console.log(`  Skipping postinstall (development mode?)`);
    return;
  }

  installKit(kitDir, ocHome);

  console.log(
    `\n  [OK] @brisingr-kr/core v${getPackageVersion()} installed successfully\n`,
  );
}

export function main(): void {
  void installAiKit();
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
      `\n  [X] @brisingr-kr/core postinstall failed:`,
      error instanceof Error ? error.message : String(error),
    );
    // Don't exit(1) — postinstall failures shouldn't block npm install
  }
}
