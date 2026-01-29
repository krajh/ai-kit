import type { Plugin } from "@opencode-ai/plugin";

import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * ai-kit updater (WSL/Linux-only v1)
 *
 * Contract:
 * - Runs on OpenCode launch.
 * - Checks for updates at most once every 24h.
 * - Stages while OpenCode runs; applies on next restart by flipping ~/.config/opencode/current.
 * - Verifies release artifact using cosign keyless bundle (pinned issuer + identity).
 * - Never touches ~/.config/opencode/.env or ~/.config/opencode/local/.
 */

const OPENCODE_HOME = join(homedir(), ".config", "opencode");
const VERSIONS_DIR = join(OPENCODE_HOME, "versions");
const STAGING_DIR = join(OPENCODE_HOME, "staging");
const STATE_DIR = join(OPENCODE_HOME, "state");
const STATE_FILE = join(STATE_DIR, "ai-kit-update.json");
const CURRENT_LINK = join(OPENCODE_HOME, "current");

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

const GITHUB_RELEASE_LATEST_API =
  "https://api.github.com/repos/krajh/ai-kit/releases/latest";

const COSIGN_OIDC_ISSUER = "https://token.actions.githubusercontent.com";

interface UpdateState {
  lastCheckTime: number;
  lastCheckedTag: string;
  stagedTag?: string;
  stagedTime?: number;
}

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface LatestRelease {
  tag_name: string;
  assets: ReleaseAsset[];
}

interface Manifest {
  version: string;
  tag: string;
  timestamp: string;
  artifact: {
    name: string;
    url: string;
    sha256: string;
    size: number;
  };
  signature: {
    bundle_url: string;
    oidc_issuer: string;
    identity: string;
  };
}

function shouldCheck(lastCheckTime: number): boolean {
  return Date.now() - lastCheckTime > CHECK_INTERVAL_MS;
}

async function readState(): Promise<UpdateState> {
  try {
    const content = await readFile(STATE_FILE, "utf-8");
    const parsed = JSON.parse(content) as UpdateState;
    if (typeof parsed.lastCheckTime !== "number")
      return { lastCheckTime: 0, lastCheckedTag: "" };
    if (typeof parsed.lastCheckedTag !== "string")
      return { lastCheckTime: 0, lastCheckedTag: "" };
    return parsed;
  } catch {
    return { lastCheckTime: 0, lastCheckedTag: "" };
  }
}

async function writeState(state: UpdateState): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  const tmp = `${STATE_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2));
  await rename(tmp, STATE_FILE);
}

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

async function fetchLatestRelease(): Promise<LatestRelease | null> {
  try {
    const response = await fetch(GITHUB_RELEASE_LATEST_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as LatestRelease;
  } catch {
    return null;
  }
}

async function fetchManifest(url: string): Promise<Manifest | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as Manifest;
  } catch {
    return null;
  }
}

async function findCosignBinary(): Promise<string | null> {
  const candidates = [
    join(OPENCODE_HOME, "bin", "cosign"),
    "/usr/local/bin/cosign",
    "/usr/bin/cosign",
  ];

  for (const p of candidates) {
    try {
      await stat(p);
      return p;
    } catch {
      // ignore
    }
  }

  return null;
}

async function execFileWithTimeout(
  file: string,
  args: string[],
  timeoutMs: number,
): Promise<{ ok: boolean; stderr: string }> {
  return await new Promise((resolve) => {
    const child = execFile(
      file,
      args,
      { timeout: timeoutMs },
      (error, _stdout, stderr) => {
        resolve({
          ok: !error,
          stderr: typeof stderr === "string" ? stderr : "",
        });
      },
    );

    if (!child.pid) resolve({ ok: false, stderr: "failed to spawn" });
  });
}

async function verifyWithCosign(
  cosignPath: string,
  tarPath: string,
  bundlePath: string,
  expectedIdentity: string,
): Promise<boolean> {
  const args = [
    "verify-blob",
    "--bundle",
    bundlePath,
    "--certificate-identity",
    expectedIdentity,
    "--certificate-oidc-issuer",
    COSIGN_OIDC_ISSUER,
    tarPath,
  ];

  const result = await execFileWithTimeout(cosignPath, args, 15_000);
  return result.ok;
}

async function downloadFileAtomic(
  url: string,
  destPath: string,
): Promise<boolean> {
  try {
    await mkdir(dirname(destPath), { recursive: true });
    const tmpPath = `${destPath}.tmp`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(tmpPath, buf);
    await rename(tmpPath, destPath);
    return true;
  } catch {
    return false;
  }
}

async function validateTarEntriesSafe(tarPath: string): Promise<boolean> {
  // Prevent path traversal / absolute paths.
  const { execFile: execFileCb } = await import("node:child_process");
  return await new Promise((resolve) => {
    execFileCb("tar", ["-tzf", tarPath], { timeout: 10_000 }, (err, stdout) => {
      if (err) return resolve(false);
      const lines = String(stdout)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      for (const entry of lines) {
        if (entry.startsWith("/")) return resolve(false);
        if (entry.includes("\\")) return resolve(false);
        const parts = entry.split("/");
        if (parts.some((p) => p === "..")) return resolve(false);
      }

      resolve(true);
    });
  });
}

async function extractTarGzSafe(
  tarPath: string,
  destDir: string,
): Promise<boolean> {
  const { execFile: execFileCb } = await import("node:child_process");
  return await new Promise((resolve) => {
    execFileCb(
      "tar",
      [
        "--no-same-owner",
        "--no-same-permissions",
        "-xzf",
        tarPath,
        "-C",
        destDir,
      ],
      { timeout: 30_000 },
      (err) => resolve(!err),
    );
  });
}

async function looksLikeKitRoot(dir: string): Promise<boolean> {
  try {
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

async function applyStagedUpdate(tag: string): Promise<boolean> {
  const stagedPath = join(STAGING_DIR, tag);
  const versionPath = join(VERSIONS_DIR, tag);

  try {
    try {
      await stat(stagedPath);
      await mkdir(VERSIONS_DIR, { recursive: true });
      await rename(stagedPath, versionPath);
    } catch {
      // ignore
    }

    if (!(await looksLikeKitRoot(versionPath))) return false;

    const { symlink, unlink } = await import("node:fs/promises");
    try {
      await unlink(CURRENT_LINK);
    } catch {
      // ignore
    }
    await symlink(versionPath, CURRENT_LINK);
    return true;
  } catch {
    return false;
  }
}

async function applyStagedUpdateOnStartup(): Promise<void> {
  const state = await readState();
  if (!state.stagedTag) return;
  const applied = await applyStagedUpdate(state.stagedTag);
  if (!applied) return;
  state.stagedTag = undefined;
  state.stagedTime = undefined;
  await writeState(state);
}

async function checkAndStageUpdate(): Promise<void> {
  const state = await readState();
  if (!shouldCheck(state.lastCheckTime)) return;

  state.lastCheckTime = Date.now();
  await writeState(state);

  const latest = await fetchLatestRelease();
  if (!latest) return;

  const manifestAsset = latest.assets.find((a) => a.name === "manifest.json");
  if (!manifestAsset) return;

  const manifest = await fetchManifest(manifestAsset.browser_download_url);
  if (!manifest) return;

  if (manifest.signature.oidc_issuer !== COSIGN_OIDC_ISSUER) return;
  const expectedIdentity = `https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/${manifest.tag}`;
  if (manifest.signature.identity !== expectedIdentity) return;

  const latestVer = parseVersion(manifest.tag);
  const currentVer = parseVersion(state.lastCheckedTag);
  if (!latestVer) return;
  if (currentVer && compareVersions(latestVer, currentVer) <= 0) return;

  const cosignPath = await findCosignBinary();
  if (!cosignPath) return;

  const stageDir = join(STAGING_DIR, manifest.tag);
  const tarPath = join(stageDir, manifest.artifact.name);
  const bundlePath = join(stageDir, `ai-kit-${manifest.tag}.bundle.json`);

  await rm(stageDir, { recursive: true, force: true });
  await mkdir(stageDir, { recursive: true });

  const okTar = await downloadFileAtomic(manifest.artifact.url, tarPath);
  const okBundle = await downloadFileAtomic(
    manifest.signature.bundle_url,
    bundlePath,
  );
  if (!okTar || !okBundle) {
    await rm(stageDir, { recursive: true, force: true });
    return;
  }

  const tarSafe = await validateTarEntriesSafe(tarPath);
  if (!tarSafe) {
    await rm(stageDir, { recursive: true, force: true });
    return;
  }

  const verified = await verifyWithCosign(
    cosignPath,
    tarPath,
    bundlePath,
    expectedIdentity,
  );
  if (!verified) {
    await rm(stageDir, { recursive: true, force: true });
    return;
  }

  const extracted = await extractTarGzSafe(tarPath, stageDir);
  if (!extracted) {
    await rm(stageDir, { recursive: true, force: true });
    return;
  }

  if (!(await looksLikeKitRoot(stageDir))) {
    await rm(stageDir, { recursive: true, force: true });
    return;
  }

  state.lastCheckedTag = manifest.tag;
  state.stagedTag = manifest.tag;
  state.stagedTime = Date.now();
  await writeState(state);
}

const AiKitUpdaterPlugin: Plugin = async () => {
  try {
    await applyStagedUpdateOnStartup();
  } catch {
    // never block startup
  }

  checkAndStageUpdate().catch(() => {
    // never block startup
  });

  return {};
};

export default AiKitUpdaterPlugin;
