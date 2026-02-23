import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  walkDirectory,
  computeFileHash,
  detectUserModificationsForVersion,
  stashModifications,
} from "../plugins/ai-kit-updater";
import type { UserModification } from "../src/lib/manifest";
import {
  readManifest,
  writeManifest,
  MANIFEST_FILE,
  type AiKitManifest,
} from "../src/lib/manifest";

const buildManifest = (root: string): AiKitManifest => {
  const files: AiKitManifest["files"] = {};

  const addEntry = (relPath: string): void => {
    const filePath = join(root, relPath);
    try {
      const hash = computeFileHash(filePath);
      files[relPath] = {
        category: "managed",
        installedHash: hash,
        sourceHash: hash,
      };
    } catch {
      // ignore missing files
    }
  };

  addEntry("a.txt");
  addEntry("b.txt");
  addEntry("agents/main.md");
  addEntry("agents/helper.md");
  addEntry("opencode.json");

  const manifest: AiKitManifest = {
    version: "v0.6.1",
    installedAt: new Date().toISOString(),
    installedVia: "npm",
    files,
  };
  writeManifest(root, manifest);
  return manifest;
};

let testRoot: string;

beforeEach(async () => {
  testRoot = join(
    tmpdir(),
    `ai-kit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(testRoot, { recursive: true });
});

afterEach(async () => {
  await rm(testRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// walkDirectory
// ---------------------------------------------------------------------------

describe("walkDirectory", () => {
  test("lists files in flat directory", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    await writeFile(join(testRoot, "b.txt"), "bravo");

    const result = await walkDirectory(testRoot);
    expect(result.sort()).toEqual(["a.txt", "b.txt"]);
  });

  test("lists files in nested directories", async () => {
    await mkdir(join(testRoot, "sub", "deep"), { recursive: true });
    await writeFile(join(testRoot, "root.txt"), "root");
    await writeFile(join(testRoot, "sub", "mid.txt"), "mid");
    await writeFile(join(testRoot, "sub", "deep", "leaf.txt"), "leaf");

    const result = await walkDirectory(testRoot);
    expect(result.sort()).toEqual([
      "root.txt",
      "sub/deep/leaf.txt",
      "sub/mid.txt",
    ]);
  });

  test("excludes manifest file", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    await writeFile(join(testRoot, MANIFEST_FILE), "manifest");

    const result = await walkDirectory(testRoot);
    expect(result).toEqual(["a.txt"]);
  });

  test("returns empty array for empty directory", async () => {
    const result = await walkDirectory(testRoot);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeFileHash
// ---------------------------------------------------------------------------

describe("computeFileHash", () => {
  test("returns SHA256 hex for known content", async () => {
    const filePath = join(testRoot, "hello.txt");
    await writeFile(filePath, "hello world");

    const hash = computeFileHash(filePath);
    // SHA256 of "hello world"
    expect(hash).toBe(
      "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    );
  });

  test("different content produces different hash", async () => {
    const file1 = join(testRoot, "a.txt");
    const file2 = join(testRoot, "b.txt");
    await writeFile(file1, "content-a");
    await writeFile(file2, "content-b");

    const hash1 = computeFileHash(file1);
    const hash2 = computeFileHash(file2);
    expect(hash1).not.toBe(hash2);
  });

  test("same content produces same hash", async () => {
    const file1 = join(testRoot, "a.txt");
    const file2 = join(testRoot, "b.txt");
    await writeFile(file1, "identical");
    await writeFile(file2, "identical");

    const hash1 = computeFileHash(file1);
    const hash2 = computeFileHash(file2);
    expect(hash1).toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// readManifest / writeManifest
// ---------------------------------------------------------------------------

describe("readManifest / writeManifest", () => {
  test("writes manifest file that can be read back", async () => {
    const manifest: AiKitManifest = {
      version: "v0.6.1",
      installedAt: new Date().toISOString(),
      installedVia: "npm",
      files: {
        "a.txt": {
          category: "managed",
          installedHash: "abc",
          sourceHash: "abc",
        },
        "sub/b.txt": {
          category: "managed",
          installedHash: "def",
          sourceHash: "def",
        },
      },
    };

    writeManifest(testRoot, manifest);

    const loaded = readManifest(testRoot);
    expect(loaded).not.toBeNull();
    expect(Object.keys(loaded!.files).sort()).toEqual(["a.txt", "sub/b.txt"]);
  });

  test("readManifest returns null for missing manifest file", async () => {
    const result = readManifest(testRoot);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectUserModifications
// ---------------------------------------------------------------------------

describe("detectUserModifications", () => {
  test("returns empty when no modifications", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    buildManifest(testRoot);

    const mods = await detectUserModificationsForVersion(testRoot);
    expect(mods).toEqual([]);
  });

  test("detects modified file", async () => {
    await writeFile(join(testRoot, "a.txt"), "original");
    buildManifest(testRoot);

    // Modify the file
    await writeFile(join(testRoot, "a.txt"), "modified");

    const mods = await detectUserModificationsForVersion(testRoot);
    expect(mods).toEqual([{ type: "modified", relativePath: "a.txt" }]);
  });

  test("detects user-added file", async () => {
    await writeFile(join(testRoot, "a.txt"), "original");
    buildManifest(testRoot);

    // Add a new file
    await writeFile(join(testRoot, "custom.txt"), "user-added");

    const mods = await detectUserModificationsForVersion(testRoot);
    expect(mods).toEqual([{ type: "added", relativePath: "custom.txt" }]);
  });

  test("detects both modified and added files", async () => {
    await writeFile(join(testRoot, "a.txt"), "original");
    await writeFile(join(testRoot, "b.txt"), "original-b");
    buildManifest(testRoot);

    await writeFile(join(testRoot, "a.txt"), "modified");
    await writeFile(join(testRoot, "custom.txt"), "user-added");

    const mods = await detectUserModificationsForVersion(testRoot);
    const modifiedPaths = mods
      .filter((m) => m.type === "modified")
      .map((m) => m.relativePath);
    const addedPaths = mods
      .filter((m) => m.type === "added")
      .map((m) => m.relativePath);

    expect(modifiedPaths).toEqual(["a.txt"]);
    expect(addedPaths).toEqual(["custom.txt"]);
  });

  test("ignores deleted files gracefully", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    await writeFile(join(testRoot, "b.txt"), "bravo");
    buildManifest(testRoot);

    // Delete one file
    await rm(join(testRoot, "a.txt"));

    const mods = await detectUserModificationsForVersion(testRoot);
    // Deleted file should not appear as modified
    expect(mods.find((m) => m.relativePath === "a.txt")).toBeUndefined();
  });

  test("returns empty when no manifest file exists", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    const mods = await detectUserModificationsForVersion(testRoot);
    expect(mods).toEqual([]);
  });

  test("detects user-added file in nested directory", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    buildManifest(testRoot);

    await mkdir(join(testRoot, "custom-dir"), { recursive: true });
    await writeFile(join(testRoot, "custom-dir", "my-tool.ts"), "tool code");

    const mods = await detectUserModificationsForVersion(testRoot);
    expect(mods).toEqual([
      { type: "added", relativePath: "custom-dir/my-tool.ts" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// stashModifications
// ---------------------------------------------------------------------------

describe("stashModifications", () => {
  test("copies modified files to stash directory", async () => {
    await writeFile(join(testRoot, "a.txt"), "modified-content");
    await mkdir(join(testRoot, "sub"), { recursive: true });
    await writeFile(join(testRoot, "sub", "b.txt"), "modified-nested");

    const stashDir = join(testRoot, "_stash");
    const mods: UserModification[] = [
      { type: "modified", relativePath: "a.txt" },
      { type: "modified", relativePath: "sub/b.txt" },
    ];

    await stashModifications(testRoot, stashDir, mods);

    const stashedA = await readFile(join(stashDir, "a.txt"), "utf-8");
    const stashedB = await readFile(join(stashDir, "sub", "b.txt"), "utf-8");
    expect(stashedA).toBe("modified-content");
    expect(stashedB).toBe("modified-nested");
  });

  test("copies user-added files to stash directory", async () => {
    await writeFile(join(testRoot, "custom.txt"), "user-tool");

    const stashDir = join(testRoot, "_stash");
    const mods: UserModification[] = [
      { type: "added", relativePath: "custom.txt" },
    ];

    await stashModifications(testRoot, stashDir, mods);

    const stashed = await readFile(join(stashDir, "custom.txt"), "utf-8");
    expect(stashed).toBe("user-tool");
  });

  test("creates nested directories in stash", async () => {
    await mkdir(join(testRoot, "deep", "nested"), { recursive: true });
    await writeFile(join(testRoot, "deep", "nested", "file.ts"), "code");

    const stashDir = join(testRoot, "_stash");
    const mods: UserModification[] = [
      { type: "added", relativePath: "deep/nested/file.ts" },
    ];

    await stashModifications(testRoot, stashDir, mods);

    const stashed = await readFile(
      join(stashDir, "deep", "nested", "file.ts"),
      "utf-8",
    );
    expect(stashed).toBe("code");
  });
});

// ---------------------------------------------------------------------------
// End-to-end: compute → modify → detect → stash
// ---------------------------------------------------------------------------

describe("end-to-end personalisation workflow", () => {
  test("full cycle: compute manifest → user modifies → detect → stash", async () => {
    const oldVersionDir = join(testRoot, "v1");
    const stashDir = join(testRoot, "stash");

    // Set up old version
    await mkdir(join(oldVersionDir, "agents"), { recursive: true });
    await writeFile(join(oldVersionDir, "opencode.json"), '{"name":"kit"}');
    await writeFile(
      join(oldVersionDir, "agents", "main.md"),
      "# Main Agent v1",
    );
    await writeFile(join(oldVersionDir, "agents", "helper.md"), "# Helper v1");

    const oldManifest = buildManifest(oldVersionDir);

    // User personalises
    await writeFile(
      join(oldVersionDir, "agents", "main.md"),
      "# Main Agent v1 - CUSTOMISED",
    );
    await mkdir(join(oldVersionDir, "agents", "custom"), { recursive: true });
    await writeFile(
      join(oldVersionDir, "agents", "custom", "my-agent.md"),
      "# My Custom Agent",
    );

    // Detect modifications
    const mods = await detectUserModificationsForVersion(oldVersionDir);
    expect(mods.length).toBe(2);

    const modPaths = mods.map((m) => `${m.type}:${m.relativePath}`).sort();
    expect(modPaths).toEqual([
      "added:agents/custom/my-agent.md",
      "modified:agents/main.md",
    ]);

    // Stash modifications
    expect(oldManifest).not.toBeNull();
    await stashModifications(oldVersionDir, stashDir, mods);

    const stashedMain = await readFile(
      join(stashDir, "agents", "main.md"),
      "utf-8",
    );
    const stashedCustom = await readFile(
      join(stashDir, "agents", "custom", "my-agent.md"),
      "utf-8",
    );

    expect(stashedMain).toBe("# Main Agent v1 - CUSTOMISED");
    expect(stashedCustom).toBe("# My Custom Agent");
  });
});
