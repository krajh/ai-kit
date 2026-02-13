/**
 * Tests for @ai-kit/core npm distribution scripts.
 *
 * Covers postinstall (symlink creation, checksum tracking, personalisation safety)
 * and preuninstall (symlink cleanup, marker-based scoping).
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile, symlink, readlink } from "node:fs/promises";
import { existsSync, lstatSync, readlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  BACKUP_SUFFIX,
  CHECKSUMS_FILE,
  KIT_LINK_ITEMS,
  MARKER_FILE,
  backupUserFile,
  computeChecksums,
  detectUserModifications,
  getOpenCodeHome,
  isOurSymlink,
  isSymlinkToKit,
  readStoredChecksums,
  safeCreateLink,
  sha256,
  walkFiles,
  writeChecksums,
  writeMarker,
} from "../src/postinstall";

import {
  isOurSymlink as preuninstallIsOurSymlink,
  readMarker,
  lstatExistsSafe,
  main as preuninstallMain,
} from "../src/preuninstall";

// ─── helpers ────────────────────────────────────────────────────────────────

let testRoot: string;
let kitDir: string;
let ocHome: string;

function uniqueDir(): string {
  return join(
    tmpdir(),
    `ai-kit-npm-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

async function writeTestFile(path: string, content: string): Promise<void> {
  await mkdir(join(path, "..").replace(/\/\.\.$/, ""), { recursive: true });
  const dir = path.substring(0, path.lastIndexOf("/"));
  if (dir) await mkdir(dir, { recursive: true });
  await writeFile(path, content, "utf-8");
}

async function setupKitDir(): Promise<void> {
  // Populate kit/ with representative files for each link item
  await writeTestFile(join(kitDir, "opencode.json"), '{"version": "test"}');
  await writeTestFile(join(kitDir, "AGENTS.md"), "# Agents\n");
  await writeTestFile(join(kitDir, "agents", "implementer.md"), "# Implementer\n");
  await writeTestFile(join(kitDir, "skills", "my-skill", "SKILL.md"), "# Skill\n");
  await writeTestFile(join(kitDir, "protocols", "DELEGATION.md"), "# Delegation\n");
  await writeTestFile(join(kitDir, "plugins", "updater.ts"), "export function init() {}\n");
}

// ─── lifecycle ──────────────────────────────────────────────────────────────

beforeEach(async () => {
  testRoot = uniqueDir();
  kitDir = join(testRoot, "kit");
  ocHome = join(testRoot, "opencode-home");
  await mkdir(kitDir, { recursive: true });
  await mkdir(ocHome, { recursive: true });
  // Override env so getOpenCodeHome() returns our test dir
  process.env.OPENCODE_HOME = ocHome;
});

afterEach(async () => {
  await rm(testRoot, { recursive: true, force: true });
  delete process.env.OPENCODE_HOME;
});

// ─── postinstall: sha256 ────────────────────────────────────────────────────

describe("sha256", () => {
  test("returns consistent hash for same content", async () => {
    const file = join(testRoot, "hash-test.txt");
    await writeTestFile(file, "hello world");
    const h1 = sha256(file);
    const h2 = sha256(file);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // SHA-256 hex length
  });

  test("returns different hash for different content", async () => {
    const f1 = join(testRoot, "a.txt");
    const f2 = join(testRoot, "b.txt");
    await writeTestFile(f1, "content-a");
    await writeTestFile(f2, "content-b");
    expect(sha256(f1)).not.toBe(sha256(f2));
  });
});

// ─── postinstall: walkFiles ─────────────────────────────────────────────────

describe("walkFiles", () => {
  test("returns empty array for nonexistent path", () => {
    expect(walkFiles(join(testRoot, "nope"))).toEqual([]);
  });

  test("returns single file when given a file path", async () => {
    const file = join(testRoot, "single.txt");
    await writeTestFile(file, "hi");
    expect(walkFiles(file)).toEqual([file]);
  });

  test("recursively walks directory", async () => {
    await setupKitDir();
    const files = walkFiles(join(kitDir, "skills"));
    expect(files.length).toBe(1);
    expect(files[0]).toContain("SKILL.md");
  });

  test("finds files in nested directories", async () => {
    await mkdir(join(testRoot, "deep", "a", "b"), { recursive: true });
    await writeTestFile(join(testRoot, "deep", "root.txt"), "r");
    await writeTestFile(join(testRoot, "deep", "a", "mid.txt"), "m");
    await writeTestFile(join(testRoot, "deep", "a", "b", "leaf.txt"), "l");
    const files = walkFiles(join(testRoot, "deep"));
    expect(files.length).toBe(3);
  });
});

// ─── postinstall: isSymlinkToKit ────────────────────────────────────────────

describe("isSymlinkToKit", () => {
  test("returns true for symlink pointing into kit dir", async () => {
    await setupKitDir();
    const link = join(testRoot, "test-link");
    await symlink(join(kitDir, "opencode.json"), link);
    expect(isSymlinkToKit(link, kitDir)).toBe(true);
  });

  test("returns false for symlink pointing elsewhere", async () => {
    const otherFile = join(testRoot, "other.txt");
    await writeTestFile(otherFile, "other");
    const link = join(testRoot, "other-link");
    await symlink(otherFile, link);
    expect(isSymlinkToKit(link, kitDir)).toBe(false);
  });

  test("returns false for regular file", async () => {
    const file = join(testRoot, "regular.txt");
    await writeTestFile(file, "regular");
    expect(isSymlinkToKit(file, kitDir)).toBe(false);
  });

  test("returns false for nonexistent path", () => {
    expect(isSymlinkToKit(join(testRoot, "nope"), kitDir)).toBe(false);
  });
});

// ─── postinstall: isOurSymlink ──────────────────────────────────────────────

describe("isOurSymlink", () => {
  test("returns true for symlink with ai-kit in target path", async () => {
    // Create a file inside a path containing 'ai-kit'
    const aiKitPath = join(testRoot, "node_modules", "@ai-kit", "core");
    await mkdir(aiKitPath, { recursive: true });
    const file = join(aiKitPath, "test.txt");
    await writeTestFile(file, "test");
    const link = join(testRoot, "our-link");
    await symlink(file, link);
    expect(isOurSymlink(link)).toBe(true);
  });

  test("returns false for symlink not pointing to ai-kit", async () => {
    // Use a path outside testRoot that won't contain "ai-kit" in its path
    const isolatedDir = join(tmpdir(), `isolated-test-${Date.now()}`);
    await mkdir(join(isolatedDir, "random"), { recursive: true });
    const otherFile = join(isolatedDir, "random", "file.txt");
    await writeFile(otherFile, "random", "utf-8");
    const link = join(isolatedDir, "foreign-link");
    await symlink(otherFile, link);
    try {
      expect(isOurSymlink(link)).toBe(false);
    } finally {
      await rm(isolatedDir, { recursive: true, force: true });
    }
  });

  test("returns false for regular file", async () => {
    const file = join(testRoot, "regular.txt");
    await writeTestFile(file, "data");
    expect(isOurSymlink(file)).toBe(false);
  });
});

// ─── postinstall: computeChecksums ──────────────────────────────────────────

describe("computeChecksums", () => {
  test("computes checksums for all kit items", async () => {
    await setupKitDir();
    const checksums = computeChecksums(kitDir);
    expect(Object.keys(checksums).length).toBeGreaterThan(0);
    // Should have entries for each file
    expect(checksums["opencode.json"]).toBeDefined();
    expect(checksums["AGENTS.md"]).toBeDefined();
    expect(checksums["agents/implementer.md"]).toBeDefined();
    expect(checksums["skills/my-skill/SKILL.md"]).toBeDefined();
  });

  test("checksums are valid SHA-256 hex strings", async () => {
    await setupKitDir();
    const checksums = computeChecksums(kitDir);
    for (const hash of Object.values(checksums)) {
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test("returns empty object for empty kit dir", () => {
    const checksums = computeChecksums(kitDir);
    expect(checksums).toEqual({});
  });
});

// ─── postinstall: readStoredChecksums / writeChecksums ──────────────────────

describe("readStoredChecksums / writeChecksums", () => {
  test("round-trips checksums through write then read", () => {
    const checksums = { "opencode.json": "abc123", "AGENTS.md": "def456" };
    writeChecksums(ocHome, checksums);
    const read = readStoredChecksums(ocHome);
    expect(read).toEqual(checksums);
  });

  test("returns null when no checksums file exists", () => {
    expect(readStoredChecksums(ocHome)).toBeNull();
  });

  test("returns null for corrupt checksums file", async () => {
    await writeTestFile(join(ocHome, CHECKSUMS_FILE), "not json{{{");
    expect(readStoredChecksums(ocHome)).toBeNull();
  });
});

// ─── postinstall: detectUserModifications ───────────────────────────────────

describe("detectUserModifications", () => {
  test("detects modified regular files", async () => {
    // Write a file in ocHome and record its checksum
    const filePath = join(ocHome, "opencode.json");
    await writeTestFile(filePath, '{"original": true}');
    const originalHash = sha256(filePath);
    const stored = { "opencode.json": originalHash };

    // Modify the file
    await writeFile(filePath, '{"modified": true}', "utf-8");

    const modified = detectUserModifications(ocHome, stored);
    expect(modified).toContain("opencode.json");
  });

  test("skips symlinks (not user files)", async () => {
    await setupKitDir();
    const link = join(ocHome, "opencode.json");
    await symlink(join(kitDir, "opencode.json"), link);
    const stored = { "opencode.json": "some-old-hash" };

    const modified = detectUserModifications(ocHome, stored);
    expect(modified).toEqual([]);
  });

  test("skips nonexistent files", () => {
    const stored = { "missing.json": "abc123" };
    const modified = detectUserModifications(ocHome, stored);
    expect(modified).toEqual([]);
  });

  test("returns empty array when nothing modified", async () => {
    const filePath = join(ocHome, "test.md");
    await writeTestFile(filePath, "original content");
    const hash = sha256(filePath);
    const stored = { "test.md": hash };

    const modified = detectUserModifications(ocHome, stored);
    expect(modified).toEqual([]);
  });
});

// ─── postinstall: backupUserFile ────────────────────────────────────────────

describe("backupUserFile", () => {
  test("renames file with backup suffix", async () => {
    const file = join(testRoot, "user-file.json");
    await writeTestFile(file, "user content");
    backupUserFile(file);

    expect(existsSync(file)).toBe(false);
    expect(existsSync(file + BACKUP_SUFFIX)).toBe(true);

    const backupContent = await readFile(file + BACKUP_SUFFIX, "utf-8");
    expect(backupContent).toBe("user content");
  });
});

// ─── postinstall: safeCreateLink ────────────────────────────────────────────

describe("safeCreateLink", () => {
  test("creates symlink for a file item", async () => {
    await setupKitDir();
    safeCreateLink(kitDir, ocHome, "opencode.json");

    const link = join(ocHome, "opencode.json");
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    const target = readlinkSync(link);
    expect(target).toBe(join(kitDir, "opencode.json"));
  });

  test("creates symlink for a directory item", async () => {
    await setupKitDir();
    safeCreateLink(kitDir, ocHome, "agents");

    const link = join(ocHome, "agents");
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
  });

  test("replaces existing symlink to our kit", async () => {
    await setupKitDir();
    // Create an initial symlink
    const link = join(ocHome, "opencode.json");
    const oldKit = join(testRoot, "old-ai-kit", "opencode.json");
    await writeTestFile(oldKit, '{"old": true}');
    await symlink(oldKit, link);

    // safeCreateLink should replace it
    safeCreateLink(kitDir, ocHome, "opencode.json");
    const target = readlinkSync(link);
    expect(target).toBe(join(kitDir, "opencode.json"));
  });

  test("backs up existing user file before linking", async () => {
    await setupKitDir();
    const userFile = join(ocHome, "opencode.json");
    await writeTestFile(userFile, '{"user": true}');

    safeCreateLink(kitDir, ocHome, "opencode.json");

    // Symlink should exist
    expect(lstatSync(userFile).isSymbolicLink()).toBe(true);
    // User file should be backed up
    expect(existsSync(userFile + BACKUP_SUFFIX)).toBe(true);
    const backup = await readFile(userFile + BACKUP_SUFFIX, "utf-8");
    expect(backup).toBe('{"user": true}');
  });

  test("skips missing kit items gracefully", async () => {
    // Don't set up kit dir — item won't exist
    safeCreateLink(kitDir, ocHome, "nonexistent-item");
    expect(existsSync(join(ocHome, "nonexistent-item"))).toBe(false);
  });
});

// ─── postinstall: writeMarker ───────────────────────────────────────────────

describe("writeMarker", () => {
  test("writes marker file with expected structure", async () => {
    writeMarker(ocHome, kitDir);
    const markerPath = join(ocHome, MARKER_FILE);
    expect(existsSync(markerPath)).toBe(true);

    const marker = JSON.parse(await readFile(markerPath, "utf-8"));
    expect(marker.kitDir).toBe(kitDir);
    expect(marker.installedAt).toBeDefined();
    expect(marker.items).toEqual([...KIT_LINK_ITEMS]);
  });
});

// ─── postinstall: getOpenCodeHome ───────────────────────────────────────────

describe("getOpenCodeHome", () => {
  test("returns OPENCODE_HOME env when set", () => {
    process.env.OPENCODE_HOME = "/custom/path";
    expect(getOpenCodeHome()).toBe("/custom/path");
    process.env.OPENCODE_HOME = ocHome; // restore for other tests
  });

  test("falls back to ~/.config/opencode when env not set", () => {
    const saved = process.env.OPENCODE_HOME;
    delete process.env.OPENCODE_HOME;
    const result = getOpenCodeHome();
    expect(result).toContain(".config/opencode");
    process.env.OPENCODE_HOME = saved;
  });
});

// ─── postinstall: KIT_LINK_ITEMS ────────────────────────────────────────────

describe("KIT_LINK_ITEMS", () => {
  test("contains expected items", () => {
    expect(KIT_LINK_ITEMS).toContain("opencode.json");
    expect(KIT_LINK_ITEMS).toContain("AGENTS.md");
    expect(KIT_LINK_ITEMS).toContain("agents");
    expect(KIT_LINK_ITEMS).toContain("skills");
    expect(KIT_LINK_ITEMS).toContain("protocols");
    expect(KIT_LINK_ITEMS).toContain("plugins");
    expect(KIT_LINK_ITEMS.length).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// preuninstall tests
// ═══════════════════════════════════════════════════════════════════════════

// ─── preuninstall: readMarker ───────────────────────────────────────────────

describe("readMarker", () => {
  test("reads valid marker file", async () => {
    const marker = {
      version: "0.4.0",
      kitDir,
      installedAt: new Date().toISOString(),
      items: ["opencode.json", "agents"],
    };
    await writeTestFile(
      join(ocHome, MARKER_FILE),
      JSON.stringify(marker, null, 2)
    );

    const result = readMarker(ocHome);
    expect(result).not.toBeNull();
    expect(result!.version).toBe("0.4.0");
    expect(result!.kitDir).toBe(kitDir);
    expect(result!.items).toEqual(["opencode.json", "agents"]);
  });

  test("returns null when marker doesn't exist", () => {
    expect(readMarker(ocHome)).toBeNull();
  });

  test("returns null for corrupt marker", async () => {
    await writeTestFile(join(ocHome, MARKER_FILE), "corrupt{{{");
    expect(readMarker(ocHome)).toBeNull();
  });
});

// ─── preuninstall: isOurSymlink (preuninstall version — uses kitDir) ────────

describe("preuninstall isOurSymlink", () => {
  test("returns true for symlink pointing into kitDir", async () => {
    await setupKitDir();
    const link = join(testRoot, "link-to-kit");
    await symlink(join(kitDir, "opencode.json"), link);
    expect(preuninstallIsOurSymlink(link, kitDir)).toBe(true);
  });

  test("returns false for symlink pointing elsewhere", async () => {
    const other = join(testRoot, "other.txt");
    await writeTestFile(other, "other");
    const link = join(testRoot, "other-link");
    await symlink(other, link);
    expect(preuninstallIsOurSymlink(link, kitDir)).toBe(false);
  });

  test("returns false for regular file", async () => {
    const file = join(testRoot, "file.txt");
    await writeTestFile(file, "content");
    expect(preuninstallIsOurSymlink(file, kitDir)).toBe(false);
  });

  test("returns false for nonexistent path", () => {
    expect(preuninstallIsOurSymlink(join(testRoot, "nope"), kitDir)).toBe(false);
  });
});

// ─── preuninstall: lstatExistsSafe ──────────────────────────────────────────

describe("lstatExistsSafe", () => {
  test("returns true for existing file", async () => {
    const file = join(testRoot, "exists.txt");
    await writeTestFile(file, "hi");
    expect(lstatExistsSafe(file)).toBe(true);
  });

  test("returns true for existing symlink (even broken)", async () => {
    const link = join(testRoot, "broken-link");
    await symlink(join(testRoot, "nonexistent-target"), link);
    // existsSync returns false for broken symlinks, but lstatExistsSafe should return true
    expect(existsSync(link)).toBe(false);
    expect(lstatExistsSafe(link)).toBe(true);
  });

  test("returns false for nonexistent path", () => {
    expect(lstatExistsSafe(join(testRoot, "nope"))).toBe(false);
  });
});

// ─── preuninstall: main (end-to-end) ────────────────────────────────────────

describe("preuninstall main", () => {
  test("removes our symlinks and cleans up marker/checksums", async () => {
    await setupKitDir();

    // Simulate a postinstall state: symlinks + marker + checksums
    for (const item of KIT_LINK_ITEMS) {
      const source = join(kitDir, item);
      const target = join(ocHome, item);
      if (existsSync(source)) {
        await symlink(source, target);
      }
    }

    // Write marker
    const marker = {
      version: "0.4.0",
      kitDir,
      installedAt: new Date().toISOString(),
      items: [...KIT_LINK_ITEMS],
    };
    await writeTestFile(
      join(ocHome, MARKER_FILE),
      JSON.stringify(marker, null, 2)
    );
    await writeTestFile(
      join(ocHome, CHECKSUMS_FILE),
      JSON.stringify({ "opencode.json": "abc" })
    );

    // Run preuninstall
    preuninstallMain();

    // All symlinks should be gone
    for (const item of KIT_LINK_ITEMS) {
      const target = join(ocHome, item);
      if (item === "opencode.json" || item === "AGENTS.md" || item === "agents" ||
          item === "skills" || item === "protocols" || item === "plugins") {
        expect(lstatExistsSafe(target)).toBe(false);
      }
    }

    // Marker and checksums should be gone
    expect(existsSync(join(ocHome, MARKER_FILE))).toBe(false);
    expect(existsSync(join(ocHome, CHECKSUMS_FILE))).toBe(false);
  });

  test("preserves user files (non-symlinks)", async () => {
    await setupKitDir();

    // Create a user-owned file where a symlink would normally go
    await writeTestFile(join(ocHome, "opencode.json"), '{"user": true}');

    // Create symlinks for the rest
    for (const item of KIT_LINK_ITEMS) {
      if (item === "opencode.json") continue;
      const source = join(kitDir, item);
      const target = join(ocHome, item);
      if (existsSync(source)) {
        await symlink(source, target);
      }
    }

    // Write marker with all items
    const marker = {
      version: "0.4.0",
      kitDir,
      installedAt: new Date().toISOString(),
      items: [...KIT_LINK_ITEMS],
    };
    await writeTestFile(
      join(ocHome, MARKER_FILE),
      JSON.stringify(marker, null, 2)
    );

    preuninstallMain();

    // User file should be preserved
    expect(existsSync(join(ocHome, "opencode.json"))).toBe(true);
    const content = await readFile(join(ocHome, "opencode.json"), "utf-8");
    expect(content).toBe('{"user": true}');
  });

  test("handles missing marker gracefully (no-op)", () => {
    // No marker file — should not throw
    preuninstallMain();
    // Nothing to assert beyond no-throw
  });
});

// ─── end-to-end: postinstall → preuninstall cycle ───────────────────────────

describe("postinstall → preuninstall cycle", () => {
  test("full install then uninstall leaves clean state", async () => {
    await setupKitDir();

    // Simulate postinstall
    for (const item of KIT_LINK_ITEMS) {
      safeCreateLink(kitDir, ocHome, item);
    }
    const checksums = computeChecksums(kitDir);
    writeChecksums(ocHome, checksums);
    writeMarker(ocHome, kitDir);

    // Verify install state
    for (const item of KIT_LINK_ITEMS) {
      const target = join(ocHome, item);
      if (existsSync(join(kitDir, item))) {
        expect(lstatSync(target).isSymbolicLink()).toBe(true);
      }
    }
    expect(existsSync(join(ocHome, MARKER_FILE))).toBe(true);
    expect(existsSync(join(ocHome, CHECKSUMS_FILE))).toBe(true);

    // Run preuninstall
    preuninstallMain();

    // Verify clean state
    for (const item of KIT_LINK_ITEMS) {
      expect(lstatExistsSafe(join(ocHome, item))).toBe(false);
    }
    expect(existsSync(join(ocHome, MARKER_FILE))).toBe(false);
    expect(existsSync(join(ocHome, CHECKSUMS_FILE))).toBe(false);
  });

  test("reinstall after uninstall works cleanly", async () => {
    await setupKitDir();

    // First install
    for (const item of KIT_LINK_ITEMS) {
      safeCreateLink(kitDir, ocHome, item);
    }
    writeChecksums(ocHome, computeChecksums(kitDir));
    writeMarker(ocHome, kitDir);

    // Uninstall
    preuninstallMain();

    // Second install
    for (const item of KIT_LINK_ITEMS) {
      safeCreateLink(kitDir, ocHome, item);
    }
    writeChecksums(ocHome, computeChecksums(kitDir));
    writeMarker(ocHome, kitDir);

    // Verify second install is valid
    for (const item of KIT_LINK_ITEMS) {
      const target = join(ocHome, item);
      if (existsSync(join(kitDir, item))) {
        expect(lstatSync(target).isSymbolicLink()).toBe(true);
      }
    }
    expect(existsSync(join(ocHome, MARKER_FILE))).toBe(true);
  });

  test("update scenario: modified user file gets backed up on reinstall", async () => {
    await setupKitDir();

    // First install
    for (const item of KIT_LINK_ITEMS) {
      safeCreateLink(kitDir, ocHome, item);
    }
    const checksums = computeChecksums(kitDir);
    writeChecksums(ocHome, checksums);
    writeMarker(ocHome, kitDir);

    // Simulate user modifying a file:
    // Remove symlink, write a regular file
    const ocJsonLink = join(ocHome, "opencode.json");
    const { unlinkSync } = await import("node:fs");
    unlinkSync(ocJsonLink);
    await writeFile(ocJsonLink, '{"customised": true}', "utf-8");

    // Detect modifications (like postinstall would on upgrade)
    const stored = readStoredChecksums(ocHome);
    expect(stored).not.toBeNull();
    const modified = detectUserModifications(ocHome, stored!);
    // opencode.json was a symlink before, now it's a regular file — but
    // detectUserModifications only flags regular files with changed hashes.
    // Since we replaced the symlink with a regular file, the hash will differ.
    expect(modified).toContain("opencode.json");

    // Reinstall: safeCreateLink should back up the user file
    safeCreateLink(kitDir, ocHome, "opencode.json");

    // User file backed up
    expect(existsSync(ocJsonLink + BACKUP_SUFFIX)).toBe(true);
    const backup = await readFile(ocJsonLink + BACKUP_SUFFIX, "utf-8");
    expect(backup).toBe('{"customised": true}');

    // Symlink restored
    expect(lstatSync(ocJsonLink).isSymbolicLink()).toBe(true);
  });
});
