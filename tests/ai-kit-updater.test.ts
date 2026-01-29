import { describe, it, expect } from "bun:test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function parseVersion(tag: string): [number, number, number] | null {
  const match = tag.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(
  a: [number, number, number],
  b: [number, number, number],
): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

async function looksLikeKitRoot(dir: string): Promise<boolean> {
  try {
    const { stat } = await import("node:fs/promises");
    const required = [
      join(dir, "agent"),
      join(dir, "protocols"),
      join(dir, "opencode.json"),
    ];
    for (const p of required) await stat(p);
    return true;
  } catch {
    return false;
  }
}

describe("ai-kit-updater semver", () => {
  it("parses vX.Y.Z and X.Y.Z", () => {
    expect(parseVersion("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
  });

  it("rejects invalid versions", () => {
    expect(parseVersion("v1.2")).toBeNull();
    expect(parseVersion("v1.2.3-rc1")).toBeNull();
    expect(parseVersion("abc")).toBeNull();
  });

  it("compares versions", () => {
    expect(compareVersions([1, 0, 0], [1, 0, 0])).toBe(0);
    expect(compareVersions([1, 0, 1], [1, 0, 0])).toBe(1);
    expect(compareVersions([1, 9, 9], [2, 0, 0])).toBe(-1);
  });
});

describe("ai-kit-updater looksLikeKitRoot (essentials-only tarball)", () => {
  it("validates essentials-only tarball structure", async () => {
    const testDir = join(tmpdir(), `ai-kit-test-${Date.now()}`);
    try {
      // Create essentials-only structure (matching new tarball spec)
      await mkdir(join(testDir, "agent"), { recursive: true });
      await mkdir(join(testDir, "protocols"), { recursive: true });
      await mkdir(join(testDir, "plugin"), { recursive: true });
      await mkdir(join(testDir, "skills"), { recursive: true });

      // Create required files
      await writeFile(join(testDir, "opencode.json"), "{}");
      await writeFile(join(testDir, "AGENTS.md"), "# Agents");
      await writeFile(
        join(testDir, "protocols", "TOOL_USAGE_GUIDE.md"),
        "# Guide",
      );
      await writeFile(
        join(testDir, "protocols", "DELEGATION_PROTOCOLS.md"),
        "# Protocols",
      );

      // Validate: should pass with essentials-only structure
      const result = await looksLikeKitRoot(testDir);
      expect(result).toBe(true);
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it("rejects incomplete tarball (missing agent/)", async () => {
    const testDir = join(tmpdir(), `ai-kit-test-${Date.now()}`);
    try {
      await mkdir(join(testDir, "protocols"), { recursive: true });
      await writeFile(join(testDir, "opencode.json"), "{}");

      const result = await looksLikeKitRoot(testDir);
      expect(result).toBe(false);
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it("rejects incomplete tarball (missing protocols/)", async () => {
    const testDir = join(tmpdir(), `ai-kit-test-${Date.now()}`);
    try {
      await mkdir(join(testDir, "agent"), { recursive: true });
      await writeFile(join(testDir, "opencode.json"), "{}");

      const result = await looksLikeKitRoot(testDir);
      expect(result).toBe(false);
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it("rejects incomplete tarball (missing opencode.json)", async () => {
    const testDir = join(tmpdir(), `ai-kit-test-${Date.now()}`);
    try {
      await mkdir(join(testDir, "agent"), { recursive: true });
      await mkdir(join(testDir, "protocols"), { recursive: true });

      const result = await looksLikeKitRoot(testDir);
      expect(result).toBe(false);
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });
});
