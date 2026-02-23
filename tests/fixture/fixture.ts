import { $ } from "bun";

import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function sanitizePath(value: string): string {
  return value.replace(/\0/g, "");
}

type TmpDirOptions<T = void> = {
  git?: boolean;
  opencodeConfig?: Record<string, unknown>;
  init?: (dir: string) => Promise<T>;
};

export async function tmpdir<T = void>(options?: TmpDirOptions<T>) {
  const baseDir = sanitizePath(path.join(os.tmpdir(), "ai-kit-test-"));
  const dir = await fs.mkdtemp(baseDir);

  try {
    if (options?.git) {
      await $`git init`.cwd(dir).quiet();
      await $`git config user.email "test@test.com"`.cwd(dir).quiet();
      await $`git config user.name "Test"`.cwd(dir).quiet();
      await $`git commit --allow-empty -m "init"`.cwd(dir).quiet();
    }

    if (options?.opencodeConfig) {
      const configPath = path.join(dir, "opencode.json");
      await fs.writeFile(
        configPath,
        JSON.stringify(
          {
            $schema: "https://opencode.ai/config.json",
            ...options.opencodeConfig,
          },
          null,
          2,
        ),
      );
    }

    let extra: T | undefined;
    if (options?.init) {
      extra = await options.init(dir);
    }

    return {
      path: dir,
      extra: extra as T,
      [Symbol.asyncDispose]: async () => {
        try {
          await fs.rm(dir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      },
    };
  } catch (error) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

export async function runPostinstallAgainst(
  targetConfigDir: string,
): Promise<void> {
  const originalHome = process.env.HOME;
  process.env.HOME = path.dirname(targetConfigDir);

  try {
    const { installAiKit } = await import("../../src/postinstall.js");
    await installAiKit({ configDir: targetConfigDir });
  } finally {
    process.env.HOME = originalHome;
  }
}
