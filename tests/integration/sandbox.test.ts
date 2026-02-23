import { describe, expect, test } from "bun:test";
import { $ } from "bun";

import * as fs from "node:fs/promises";
import path from "node:path";

import { runPostinstallAgainst, tmpdir } from "../fixture/fixture";

let opencodeAvailable = false;
try {
  await $`which opencode`.quiet();
  opencodeAvailable = true;
} catch {
  opencodeAvailable = false;
}

describe("ai-kit integration", () => {
  test("postinstall creates manifest and files", async () => {
    await using dir = await tmpdir({ git: true });

    const configDir = path.join(dir.path, ".config", "opencode");
    await fs.mkdir(configDir, { recursive: true });

    await runPostinstallAgainst(configDir);

    const manifestPath = path.join(configDir, ".ai-kit-manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
    expect(manifest.version).toBeDefined();
    expect(manifest.files).toBeDefined();
    expect(Object.keys(manifest.files).length).toBeGreaterThan(0);

    const agentsPath = path.join(configDir, "AGENTS.md");
    const agents = await fs.readFile(agentsPath, "utf-8");
    expect(agents).toContain("# AGENTS.md");
  });

  test.skipIf(!opencodeAvailable)(
    "opencode loads with ai-kit plugins",
    async () => {
      await using dir = await tmpdir({ git: true });

      const configDir = path.join(dir.path, ".config", "opencode");
      await fs.mkdir(configDir, { recursive: true });

      await runPostinstallAgainst(configDir);

      const proc = Bun.spawn(["opencode", "--version"], {
        env: { ...process.env, HOME: dir.path },
        cwd: dir.path,
      });

      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
    },
  );
});
