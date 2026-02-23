import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import type { AiKitManifest, FileEntry } from "../types";

export const MANIFEST_FILE = ".ai-kit-manifest.json";

export type UserModification = {
  relativePath: string;
  type: "modified" | "added";
};

export function readManifest(configDir: string): AiKitManifest | null {
  const manifestPath = join(configDir, MANIFEST_FILE);
  if (!existsSync(manifestPath)) return null;

  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8")) as AiKitManifest;
  } catch {
    return null;
  }
}

export function writeManifest(
  configDir: string,
  manifest: AiKitManifest,
): void {
  writeFileSync(
    join(configDir, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf-8",
  );
}

export function computeFileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export async function detectUserModifications(
  configDir: string,
  manifest: AiKitManifest,
): Promise<UserModification[]> {
  const modifications: UserModification[] = [];
  const knownPaths = new Set(Object.keys(manifest.files));

  for (const [relativePath, entry] of Object.entries(manifest.files)) {
    if (entry.category !== "managed" && entry.category !== "merged") continue;

    const fullPath = join(configDir, relativePath);
    if (!existsSync(fullPath)) continue;

    const currentHash = computeFileHash(fullPath);
    if (currentHash !== entry.installedHash) {
      modifications.push({ relativePath, type: "modified" });
    }
  }

  const walk = (dir: string, prefix = ""): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === MANIFEST_FILE) continue;
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.isFile()) {
        if (!knownPaths.has(relPath)) {
          modifications.push({ relativePath: relPath, type: "added" });
        }
      }
    }
  };

  if (existsSync(configDir)) {
    const stat = statSync(configDir);
    if (stat.isDirectory()) walk(configDir);
  }

  return modifications;
}

export type { AiKitManifest, FileEntry };
