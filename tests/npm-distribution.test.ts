/**
 * Tests for @brisingr-kr/core npm distribution scripts.
 *
 * Covers postinstall (file copy + manifest tracking)
 * and preuninstall (manifest-aware cleanup).
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  INCOMING_DIR,
  KIT_LINK_ITEMS,
  MANIFEST_FILE,
  MARKER_FILE,
  getOpenCodeHome,
  installKit,
  mergeJson,
  readManifest,
  sha256,
  walkFiles,
  writeMarker,
} from "../src/postinstall";

import { lstatExistsSafe, main as preuninstallMain } from "../src/preuninstall";

// ─── helpers ────────────────────────────────────────────────────────────────

let testRoot: string;
let kitDir: string;
let ocHome: string;

function uniqueDir(): string {
  return join(
    tmpdir(),
    `ai-kit-npm-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
}

async function writeTestFile(path: string, content: string): Promise<void> {
  const dir = path.substring(0, path.lastIndexOf("/"));
  if (dir) await mkdir(dir, { recursive: true });
  await writeFile(path, content, "utf-8");
}

async function setupKitDir(): Promise<void> {
  await writeTestFile(
    join(kitDir, "opencode.json"),
    '{"version": "test", "plugins": ["ai-kit-updater"]}',
  );
  await writeTestFile(join(kitDir, "AGENTS.md"), "# Agents\n");
  await writeTestFile(
    join(kitDir, "bunfig.toml"),
    '[install]\ntrustedDependencies = ["protobufjs"]\n',
  );
  await writeTestFile(
    join(kitDir, "agents", "implementer.md"),
    "# Implementer\n",
  );
  await writeTestFile(
    join(kitDir, "skills", "my-skill", "SKILL.md"),
    "# Skill\n",
  );
  await writeTestFile(
    join(kitDir, "protocols", "DELEGATION.md"),
    "# Delegation\n",
  );
  await writeTestFile(
    join(kitDir, "plugins", "updater.ts"),
    "export function init() {}\n",
  );
}

// ─── lifecycle ──────────────────────────────────────────────────────────────

beforeEach(async () => {
  testRoot = uniqueDir();
  kitDir = join(testRoot, "kit");
  ocHome = join(testRoot, "opencode-home");
  await mkdir(kitDir, { recursive: true });
  await mkdir(ocHome, { recursive: true });
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
    expect(h1).toHaveLength(64);
  });
});

// ─── postinstall: walkFiles ─────────────────────────────────────────────────

describe("walkFiles", () => {
  test("returns empty array for nonexistent path", () => {
    expect(walkFiles(join(testRoot, "nope"))).toEqual([]);
  });

  test("recursively walks directory", async () => {
    await setupKitDir();
    const files = walkFiles(join(kitDir, "skills"));
    expect(files.length).toBe(1);
    expect(files[0]).toContain("SKILL.md");
  });
});

// ─── postinstall: mergeJson ─────────────────────────────────────────────────

describe("mergeJson", () => {
  test("preserves user keys while adding incoming", () => {
    const installed = { plugins: ["a"], foo: "old" };
    const incoming = { plugins: ["a", "b"], foo: "kit", bar: true };
    const user = { plugins: ["a", "custom"], foo: "user" };
    const merged = mergeJson(installed, incoming, user);
    expect(merged.foo).toBe("user");
    expect(merged.bar).toBe(true);
    expect(merged.plugins).toEqual(["a", "b", "custom"]);
  });
});

// ─── postinstall: installKit ────────────────────────────────────────────────

describe("installKit", () => {
  test("first install copies files and writes manifest", async () => {
    await setupKitDir();
    installKit(kitDir, ocHome);

    expect(existsSync(join(ocHome, "opencode.json"))).toBe(true);
    expect(existsSync(join(ocHome, "agents", "implementer.md"))).toBe(true);
    expect(existsSync(join(ocHome, "skills", "my-skill", "SKILL.md"))).toBe(
      true,
    );
    expect(existsSync(join(ocHome, MANIFEST_FILE))).toBe(true);

    const manifest = readManifest(ocHome);
    expect(manifest).not.toBeNull();
    expect(manifest!.files["opencode.json"]).toBeDefined();
  });

  test("reinstall overwrites unmodified files", async () => {
    await setupKitDir();
    installKit(kitDir, ocHome);

    const initialHash = sha256(join(ocHome, "AGENTS.md"));
    await writeTestFile(join(kitDir, "AGENTS.md"), "# Agents v2\n");

    installKit(kitDir, ocHome);
    const updatedHash = sha256(join(ocHome, "AGENTS.md"));
    expect(updatedHash).not.toBe(initialHash);
  });

  test("reinstall stages user-modified files into incoming", async () => {
    await setupKitDir();
    installKit(kitDir, ocHome);

    await writeTestFile(join(ocHome, "AGENTS.md"), "# User Agents\n");
    await writeTestFile(join(kitDir, "AGENTS.md"), "# Agents v2\n");

    installKit(kitDir, ocHome);

    const incomingPath = join(ocHome, INCOMING_DIR, "AGENTS.md");
    expect(existsSync(incomingPath)).toBe(true);
    const original = await readFile(join(ocHome, "AGENTS.md"), "utf-8");
    expect(original).toBe("# User Agents\n");
  });

  test("opencode.json merge preserves user additions", async () => {
    await setupKitDir();
    installKit(kitDir, ocHome);

    await writeTestFile(
      join(ocHome, "opencode.json"),
      '{"plugins": ["ai-kit-updater", "custom"], "userKey": true}',
    );
    await writeTestFile(
      join(kitDir, "opencode.json"),
      '{"plugins": ["ai-kit-updater", "new-plugin"], "kitKey": true}',
    );

    installKit(kitDir, ocHome);
    const merged = JSON.parse(
      await readFile(join(ocHome, "opencode.json"), "utf-8"),
    ) as Record<string, unknown>;

    expect(merged.userKey).toBe(true);
    expect(merged.kitKey).toBe(true);
    expect(merged.plugins).toEqual(["ai-kit-updater", "new-plugin", "custom"]);
  });
});

// ─── postinstall: getOpenCodeHome ───────────────────────────────────────────

describe("getOpenCodeHome", () => {
  test("returns OPENCODE_HOME env when set", () => {
    process.env.OPENCODE_HOME = "/custom/path";
    expect(getOpenCodeHome()).toBe("/custom/path");
    process.env.OPENCODE_HOME = ocHome;
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
    expect(KIT_LINK_ITEMS.length).toBe(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// preuninstall tests
// ═══════════════════════════════════════════════════════════════════════════

describe("preuninstall main", () => {
  test("removes unmodified files and preserves modified ones", async () => {
    await setupKitDir();
    installKit(kitDir, ocHome);

    await writeTestFile(join(ocHome, "AGENTS.md"), "# User Agents\n");

    preuninstallMain();

    expect(existsSync(join(ocHome, "opencode.json"))).toBe(false);
    expect(existsSync(join(ocHome, "AGENTS.md"))).toBe(true);
  });

  test("fallbacks to legacy symlink cleanup when no manifest", async () => {
    await setupKitDir();

    const marker = {
      version: "0.4.0",
      kitDir,
      installedAt: new Date().toISOString(),
      items: ["opencode.json"],
    };
    await writeTestFile(
      join(ocHome, MARKER_FILE),
      JSON.stringify(marker, null, 2),
    );

    preuninstallMain();
    expect(existsSync(join(ocHome, MARKER_FILE))).toBe(false);
  });
});

describe("lstatExistsSafe", () => {
  test("returns true for existing file", async () => {
    const file = join(testRoot, "exists.txt");
    await writeTestFile(file, "hi");
    expect(lstatExistsSafe(file)).toBe(true);
  });
});
