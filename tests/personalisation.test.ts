import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  walkDirectory,
  computeFileHash,
  computeChecksums,
  readChecksums,
  detectUserModifications,
  stashModifications,
  reapplyModifications,
} from "../plugins/ai-kit-updater";
import type {
  ChecksumEntry,
  UserModification,
} from "../plugins/ai-kit-updater";

const CHECKSUMS_FILE = ".ai-kit-checksums";

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

  test("excludes checksums file", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    await writeFile(join(testRoot, CHECKSUMS_FILE), "checksums");

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

    const hash = await computeFileHash(filePath);
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

    const hash1 = await computeFileHash(file1);
    const hash2 = await computeFileHash(file2);
    expect(hash1).not.toBe(hash2);
  });

  test("same content produces same hash", async () => {
    const file1 = join(testRoot, "a.txt");
    const file2 = join(testRoot, "b.txt");
    await writeFile(file1, "identical");
    await writeFile(file2, "identical");

    const hash1 = await computeFileHash(file1);
    const hash2 = await computeFileHash(file2);
    expect(hash1).toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// computeChecksums + readChecksums
// ---------------------------------------------------------------------------

describe("computeChecksums / readChecksums", () => {
  test("writes checksums file that can be read back", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    await mkdir(join(testRoot, "sub"), { recursive: true });
    await writeFile(join(testRoot, "sub", "b.txt"), "bravo");

    await computeChecksums(testRoot);

    const entries = await readChecksums(testRoot);
    expect(entries).not.toBeNull();
    expect(entries!.length).toBe(2);

    const paths = entries!.map((e) => e.path).sort();
    expect(paths).toEqual(["a.txt", "sub/b.txt"]);

    // Verify hashes are valid hex strings
    for (const entry of entries!) {
      expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  test("readChecksums returns null for missing checksums file", async () => {
    const result = await readChecksums(testRoot);
    expect(result).toBeNull();
  });

  test("checksums file is not included in its own checksums", async () => {
    await writeFile(join(testRoot, "file.txt"), "data");
    await computeChecksums(testRoot);

    const entries = await readChecksums(testRoot);
    const paths = entries!.map((e) => e.path);
    expect(paths).not.toContain(CHECKSUMS_FILE);
  });
});

// ---------------------------------------------------------------------------
// detectUserModifications
// ---------------------------------------------------------------------------

describe("detectUserModifications", () => {
  test("returns empty when no modifications", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    await computeChecksums(testRoot);

    const mods = await detectUserModifications(testRoot);
    expect(mods).toEqual([]);
  });

  test("detects modified file", async () => {
    await writeFile(join(testRoot, "a.txt"), "original");
    await computeChecksums(testRoot);

    // Modify the file
    await writeFile(join(testRoot, "a.txt"), "modified");

    const mods = await detectUserModifications(testRoot);
    expect(mods).toEqual([{ type: "M", relativePath: "a.txt" }]);
  });

  test("detects user-added file", async () => {
    await writeFile(join(testRoot, "a.txt"), "original");
    await computeChecksums(testRoot);

    // Add a new file
    await writeFile(join(testRoot, "custom.txt"), "user-added");

    const mods = await detectUserModifications(testRoot);
    expect(mods).toEqual([{ type: "A", relativePath: "custom.txt" }]);
  });

  test("detects both modified and added files", async () => {
    await writeFile(join(testRoot, "a.txt"), "original");
    await writeFile(join(testRoot, "b.txt"), "original-b");
    await computeChecksums(testRoot);

    await writeFile(join(testRoot, "a.txt"), "modified");
    await writeFile(join(testRoot, "custom.txt"), "user-added");

    const mods = await detectUserModifications(testRoot);
    const modifiedPaths = mods
      .filter((m) => m.type === "M")
      .map((m) => m.relativePath);
    const addedPaths = mods
      .filter((m) => m.type === "A")
      .map((m) => m.relativePath);

    expect(modifiedPaths).toEqual(["a.txt"]);
    expect(addedPaths).toEqual(["custom.txt"]);
  });

  test("ignores deleted files gracefully", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    await writeFile(join(testRoot, "b.txt"), "bravo");
    await computeChecksums(testRoot);

    // Delete one file
    await rm(join(testRoot, "a.txt"));

    const mods = await detectUserModifications(testRoot);
    // Deleted file should not appear as modified
    expect(mods.find((m) => m.relativePath === "a.txt")).toBeUndefined();
  });

  test("returns empty when no checksums file exists", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    const mods = await detectUserModifications(testRoot);
    expect(mods).toEqual([]);
  });

  test("detects user-added file in nested directory", async () => {
    await writeFile(join(testRoot, "a.txt"), "alpha");
    await computeChecksums(testRoot);

    await mkdir(join(testRoot, "custom-dir"), { recursive: true });
    await writeFile(join(testRoot, "custom-dir", "my-tool.ts"), "tool code");

    const mods = await detectUserModifications(testRoot);
    expect(mods).toEqual([
      { type: "A", relativePath: "custom-dir/my-tool.ts" },
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
      { type: "M", relativePath: "a.txt" },
      { type: "M", relativePath: "sub/b.txt" },
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
      { type: "A", relativePath: "custom.txt" },
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
      { type: "A", relativePath: "deep/nested/file.ts" },
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
// reapplyModifications
// ---------------------------------------------------------------------------

describe("reapplyModifications", () => {
  let newVersionDir: string;
  let stashDir: string;

  beforeEach(async () => {
    newVersionDir = join(testRoot, "new-version");
    stashDir = join(testRoot, "stash");
    await mkdir(newVersionDir, { recursive: true });
    await mkdir(stashDir, { recursive: true });
  });

  test("copies user file when not in new version", async () => {
    // User modified a file that doesn't exist in new version
    await writeFile(join(stashDir, "custom.txt"), "user-content");

    const oldChecksums: ChecksumEntry[] = [
      { path: "custom.txt", hash: "oldhash" },
    ];
    const mods: UserModification[] = [
      { type: "M", relativePath: "custom.txt" },
    ];

    const result = await reapplyModifications(
      oldChecksums,
      newVersionDir,
      stashDir,
      mods,
    );

    expect(result.applied).toContain("custom.txt");
    expect(result.conflicts).toEqual([]);
    const content = await readFile(join(newVersionDir, "custom.txt"), "utf-8");
    expect(content).toBe("user-content");
  });

  test("applies user modification when new version file unchanged from old", async () => {
    // Old version had file with hash "abc123"
    // New version has same file with same hash "abc123"
    // User modified the file → should safely apply user's version
    const originalContent = "original-content";
    const { createHash } = await import("node:crypto");
    const originalHash = createHash("sha256")
      .update(originalContent)
      .digest("hex");

    // New version has the original (unchanged) content
    await writeFile(join(newVersionDir, "config.txt"), originalContent);
    // User's modified version in stash
    await writeFile(join(stashDir, "config.txt"), "user-modified-content");

    const oldChecksums: ChecksumEntry[] = [
      { path: "config.txt", hash: originalHash },
    ];
    const mods: UserModification[] = [
      { type: "M", relativePath: "config.txt" },
    ];

    const result = await reapplyModifications(
      oldChecksums,
      newVersionDir,
      stashDir,
      mods,
    );

    expect(result.applied).toContain("config.txt");
    expect(result.conflicts).toEqual([]);
    const content = await readFile(join(newVersionDir, "config.txt"), "utf-8");
    expect(content).toBe("user-modified-content");
  });

  test("creates .user sidecar when both user and new version changed", async () => {
    // Old version had hash "oldhash"
    // New version changed the file (different hash)
    // User also changed the file → conflict
    await writeFile(join(newVersionDir, "config.txt"), "new-version-content");
    await writeFile(join(stashDir, "config.txt"), "user-modified-content");

    const oldChecksums: ChecksumEntry[] = [
      { path: "config.txt", hash: "completely-different-old-hash" },
    ];
    const mods: UserModification[] = [
      { type: "M", relativePath: "config.txt" },
    ];

    const result = await reapplyModifications(
      oldChecksums,
      newVersionDir,
      stashDir,
      mods,
    );

    expect(result.conflicts).toContain("config.txt");
    expect(result.applied).toEqual([]);

    // New version file should remain unchanged
    const newContent = await readFile(
      join(newVersionDir, "config.txt"),
      "utf-8",
    );
    expect(newContent).toBe("new-version-content");

    // User's version saved as .user sidecar
    const userContent = await readFile(
      join(newVersionDir, "config.txt.user"),
      "utf-8",
    );
    expect(userContent).toBe("user-modified-content");
  });

  test("copies user-added file when path doesn't exist in new version", async () => {
    await writeFile(join(stashDir, "my-tool.ts"), "custom tool code");

    const oldChecksums: ChecksumEntry[] = [];
    const mods: UserModification[] = [
      { type: "A", relativePath: "my-tool.ts" },
    ];

    const result = await reapplyModifications(
      oldChecksums,
      newVersionDir,
      stashDir,
      mods,
    );

    expect(result.applied).toContain("my-tool.ts");
    const content = await readFile(join(newVersionDir, "my-tool.ts"), "utf-8");
    expect(content).toBe("custom tool code");
  });

  test("creates .user sidecar for user-added file that also exists in new version", async () => {
    // Both user and new version added a file at the same path
    await writeFile(join(newVersionDir, "same-name.ts"), "new-version-code");
    await writeFile(join(stashDir, "same-name.ts"), "user-custom-code");

    const oldChecksums: ChecksumEntry[] = [];
    const mods: UserModification[] = [
      { type: "A", relativePath: "same-name.ts" },
    ];

    const result = await reapplyModifications(
      oldChecksums,
      newVersionDir,
      stashDir,
      mods,
    );

    expect(result.conflicts).toContain("same-name.ts");

    // New version file preserved
    const newContent = await readFile(
      join(newVersionDir, "same-name.ts"),
      "utf-8",
    );
    expect(newContent).toBe("new-version-code");

    // User file saved as .user sidecar
    const userContent = await readFile(
      join(newVersionDir, "same-name.ts.user"),
      "utf-8",
    );
    expect(userContent).toBe("user-custom-code");
  });

  test("handles mixed modifications correctly", async () => {
    const { createHash } = await import("node:crypto");
    const unchangedContent = "unchanged-content";
    const unchangedHash = createHash("sha256")
      .update(unchangedContent)
      .digest("hex");

    // File unchanged in new version → user mod applied
    await writeFile(join(newVersionDir, "safe.txt"), unchangedContent);
    await writeFile(join(stashDir, "safe.txt"), "user-safe-mod");

    // File changed in new version → conflict
    await writeFile(join(newVersionDir, "risky.txt"), "new-risky-content");
    await writeFile(join(stashDir, "risky.txt"), "user-risky-mod");

    // User-added file, not in new version → applied
    await writeFile(join(stashDir, "added.txt"), "user-added");

    const oldChecksums: ChecksumEntry[] = [
      { path: "safe.txt", hash: unchangedHash },
      { path: "risky.txt", hash: "old-risky-hash" },
    ];

    const mods: UserModification[] = [
      { type: "M", relativePath: "safe.txt" },
      { type: "M", relativePath: "risky.txt" },
      { type: "A", relativePath: "added.txt" },
    ];

    const result = await reapplyModifications(
      oldChecksums,
      newVersionDir,
      stashDir,
      mods,
    );

    expect(result.applied.sort()).toEqual(["added.txt", "safe.txt"]);
    expect(result.conflicts).toEqual(["risky.txt"]);

    // Verify file contents
    expect(await readFile(join(newVersionDir, "safe.txt"), "utf-8")).toBe(
      "user-safe-mod",
    );
    expect(await readFile(join(newVersionDir, "risky.txt"), "utf-8")).toBe(
      "new-risky-content",
    );
    expect(await readFile(join(newVersionDir, "risky.txt.user"), "utf-8")).toBe(
      "user-risky-mod",
    );
    expect(await readFile(join(newVersionDir, "added.txt"), "utf-8")).toBe(
      "user-added",
    );
  });

  test("handles nested directory paths in reapply", async () => {
    await mkdir(join(stashDir, "skills", "custom"), { recursive: true });
    await writeFile(
      join(stashDir, "skills", "custom", "SKILL.md"),
      "# Custom Skill",
    );

    const oldChecksums: ChecksumEntry[] = [];
    const mods: UserModification[] = [
      { type: "A", relativePath: "skills/custom/SKILL.md" },
    ];

    const result = await reapplyModifications(
      oldChecksums,
      newVersionDir,
      stashDir,
      mods,
    );

    expect(result.applied).toContain("skills/custom/SKILL.md");
    const content = await readFile(
      join(newVersionDir, "skills", "custom", "SKILL.md"),
      "utf-8",
    );
    expect(content).toBe("# Custom Skill");
  });
});

// ---------------------------------------------------------------------------
// End-to-end: compute → modify → detect → stash → reapply
// ---------------------------------------------------------------------------

describe("end-to-end personalisation workflow", () => {
  test("full cycle: compute checksums → user modifies → detect → stash → reapply to new version", async () => {
    const oldVersionDir = join(testRoot, "v1");
    const newVersionDir = join(testRoot, "v2");
    const stashDir = join(testRoot, "stash");

    // Set up old version
    await mkdir(join(oldVersionDir, "agents"), { recursive: true });
    await writeFile(join(oldVersionDir, "opencode.json"), '{"name":"kit"}');
    await writeFile(
      join(oldVersionDir, "agents", "main.md"),
      "# Main Agent v1",
    );
    await writeFile(join(oldVersionDir, "agents", "helper.md"), "# Helper v1");

    // Compute checksums for old version
    await computeChecksums(oldVersionDir);

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
    const mods = await detectUserModifications(oldVersionDir);
    expect(mods.length).toBe(2);

    const modPaths = mods.map((m) => `${m.type}:${m.relativePath}`).sort();
    expect(modPaths).toEqual([
      "A:agents/custom/my-agent.md",
      "M:agents/main.md",
    ]);

    // Stash modifications
    const oldChecksums = await readChecksums(oldVersionDir);
    expect(oldChecksums).not.toBeNull();
    await stashModifications(oldVersionDir, stashDir, mods);

    // Set up new version (main.md unchanged from v1 original)
    await mkdir(join(newVersionDir, "agents"), { recursive: true });
    await writeFile(
      join(newVersionDir, "opencode.json"),
      '{"name":"kit","version":"2"}',
    );
    await writeFile(
      join(newVersionDir, "agents", "main.md"),
      "# Main Agent v1",
    ); // Same as original v1
    await writeFile(
      join(newVersionDir, "agents", "helper.md"),
      "# Helper v2 - UPDATED",
    );

    // Reapply modifications
    const result = await reapplyModifications(
      oldChecksums!,
      newVersionDir,
      stashDir,
      mods,
    );

    // main.md: old unchanged in new version → user mod applied safely
    expect(result.applied).toContain("agents/main.md");
    // custom agent: not in new version → copied over
    expect(result.applied).toContain("agents/custom/my-agent.md");
    expect(result.conflicts).toEqual([]);

    // Verify final state
    const mainContent = await readFile(
      join(newVersionDir, "agents", "main.md"),
      "utf-8",
    );
    expect(mainContent).toBe("# Main Agent v1 - CUSTOMISED");

    const customContent = await readFile(
      join(newVersionDir, "agents", "custom", "my-agent.md"),
      "utf-8",
    );
    expect(customContent).toBe("# My Custom Agent");

    // helper.md: not modified by user, so should remain as v2
    const helperContent = await readFile(
      join(newVersionDir, "agents", "helper.md"),
      "utf-8",
    );
    expect(helperContent).toBe("# Helper v2 - UPDATED");
  });

  test("conflict scenario: both user and upstream modified same file", async () => {
    const oldVersionDir = join(testRoot, "v1");
    const newVersionDir = join(testRoot, "v2");
    const stashDir = join(testRoot, "stash");

    // Set up old version
    await mkdir(oldVersionDir, { recursive: true });
    await writeFile(join(oldVersionDir, "config.json"), '{"key":"v1"}');
    await computeChecksums(oldVersionDir);

    // User modifies
    await writeFile(
      join(oldVersionDir, "config.json"),
      '{"key":"user-custom"}',
    );

    // Detect and stash
    const mods = await detectUserModifications(oldVersionDir);
    const oldChecksums = await readChecksums(oldVersionDir);
    await stashModifications(oldVersionDir, stashDir, mods);

    // New version also changes config.json
    await mkdir(newVersionDir, { recursive: true });
    await writeFile(join(newVersionDir, "config.json"), '{"key":"v2-new"}');

    // Reapply
    const result = await reapplyModifications(
      oldChecksums!,
      newVersionDir,
      stashDir,
      mods,
    );

    // Should be a conflict
    expect(result.conflicts).toContain("config.json");
    expect(result.applied).toEqual([]);

    // New version preserved, user version saved as .user
    expect(await readFile(join(newVersionDir, "config.json"), "utf-8")).toBe(
      '{"key":"v2-new"}',
    );
    expect(
      await readFile(join(newVersionDir, "config.json.user"), "utf-8"),
    ).toBe('{"key":"user-custom"}');
  });
});
