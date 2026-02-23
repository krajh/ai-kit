#!/usr/bin/env bun

/**
 * Assembles the kit/ directory from repo source files.
 * Run before `npm publish` to populate the distribution payload.
 *
 * Usage: bun run build-kit
 */

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const KIT_DIR = join(ROOT, "kit");

const KIT_ITEMS = [
  { src: "agents", type: "dir" },
  { src: "skills", type: "dir" },
  { src: "protocols", type: "dir" },
  { src: "plugins", type: "dir" },
  { src: "AGENTS.md", type: "file" },
  { src: "opencode.json", type: "file" },
  { src: "bunfig.toml", type: "file" },
] as const;

function main(): void {
  console.log("[kit-builder] Assembling kit/ from repo sources\n");

  if (existsSync(KIT_DIR)) {
    rmSync(KIT_DIR, { recursive: true });
  }
  mkdirSync(KIT_DIR, { recursive: true });

  let copied = 0;
  let skipped = 0;

  for (const item of KIT_ITEMS) {
    const srcPath = join(ROOT, item.src);

    if (!existsSync(srcPath)) {
      console.log(`  [!] Skipped: ${item.src} (not found)`);
      skipped++;
      continue;
    }

    const destPath = join(KIT_DIR, item.src);

    if (item.type === "dir") {
      cpSync(srcPath, destPath, { recursive: true });
    } else {
      cpSync(srcPath, destPath);
    }

    console.log(`  [OK] ${item.src}`);
    copied++;
  }

  console.log(
    `\n[kit-builder] Done: ${copied} items copied, ${skipped} skipped`
  );
}

main();
