import { tool } from "@opencode-ai/plugin";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";

import {
  formatSemanticGateOutput,
  runSpecSemanticValidation,
} from "./spec-verify";

/**
 * verify-loop: Verification loop tool for Definition of Done enforcement
 *
 * Runs standardized checks (fmt, typecheck, tests) based on work type.
 * Supports monorepo layouts — detects the nearest project root for each
 * changed file and runs checks in the correct directory.
 */

type WorkType = "tool" | "plugin" | "doc" | "auto" | "code";
type PackageManager = "bun" | "pnpm" | "npm" | "yarn";
const VERIFY_LOOP_VERSION = "1.0.0";
const VERIFY_LOOP_CIRCUIT_BREAKER_THRESHOLD = 3;
const VERIFY_LOOP_FAILURE_STATE_PATH = join(
  process.cwd(),
  ".opencode",
  "verify-loop-failure-state.json",
);

interface VerifyLoopFailureState {
  consecutiveFailures: number;
  lastError: string;
  updatedAt: number;
}

const DEFAULT_FAILURE_STATE: VerifyLoopFailureState = {
  consecutiveFailures: 0,
  lastError: "",
  updatedAt: 0,
};

// Standardized quality gate names (GAIA-inspired vocabulary)
const GATE_NAMES: Record<string, string> = {
  format: "lint",
  typecheck: "build",
  test: "unit",
  "doc policy": "docs-updated",
  "console logging": "console-logging",
  guillotine: "guillotine",
};

interface CheckResult {
  name: string;
  passed: boolean;
  output: string;
  duration_ms: number;
  remedy?: string;
  meta?: Record<string, unknown>;
}

interface ProjectRoot {
  dir: string; // relative to CWD, "." for repo root
  pm: PackageManager;
  scripts: Record<string, string>;
  files: string[]; // changed files in this root
}

interface VerifyResult {
  success: boolean;
  work_types: WorkType[];
  checks: CheckResult[];
  failed_checks: string[];
  dry_run?: boolean;
  project_roots?: ProjectRoot[];
  checkpoint_created?: boolean;
  blocker_created?: boolean;
  semantic_gate_output?: string;
  semantic_spec_source?: string;
}

function loadFailureState(): VerifyLoopFailureState {
  try {
    const raw = readFileSync(VERIFY_LOOP_FAILURE_STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<VerifyLoopFailureState>;
    return {
      consecutiveFailures:
        typeof parsed.consecutiveFailures === "number"
          ? Math.max(0, Math.floor(parsed.consecutiveFailures))
          : 0,
      lastError: typeof parsed.lastError === "string" ? parsed.lastError : "",
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return { ...DEFAULT_FAILURE_STATE };
  }
}

function persistFailureState(state: VerifyLoopFailureState): void {
  try {
    mkdirSync(dirname(VERIFY_LOOP_FAILURE_STATE_PATH), { recursive: true });
    writeFileSync(
      VERIFY_LOOP_FAILURE_STATE_PATH,
      `${JSON.stringify(state, null, 2)}\n`,
      "utf8",
    );
  } catch {
    // Persistence failure must never block verification output
  }
}

function resetFailureState(): void {
  persistFailureState({ ...DEFAULT_FAILURE_STATE, updatedAt: Date.now() });
}

function bumpFailureState(lastError: string): VerifyLoopFailureState {
  const current = loadFailureState();
  const next: VerifyLoopFailureState = {
    consecutiveFailures: current.consecutiveFailures + 1,
    lastError,
    updatedAt: Date.now(),
  };
  persistFailureState(next);
  return next;
}

function formatCircuitBreakerMessage(
  consecutiveFailures: number,
  lastError: string,
): string {
  const safeLastError = lastError.trim() || "(no prior error captured)";
  return [
    `[X] circuit breaker tripped after ${consecutiveFailures} consecutive verify-loop failures`,
    `Last error encountered: ${safeLastError}`,
    "Suggestion: inspect the last error, fix the root cause, then retry verify-loop.",
  ].join("\n");
}

type DryRunCheckMode = "executed" | "simulated" | "analyzed" | "skipped";

function withDryRunPrefix(
  dryRun: boolean | undefined,
  mode: Exclude<DryRunCheckMode, "executed">,
  text: string,
): string {
  if (!dryRun) return text;
  return `[dry-run][${mode}] ${text}`;
}

function modeFromCheck(
  check: CheckResult,
  dryRun: boolean | undefined,
): DryRunCheckMode {
  if (!dryRun) return "executed";
  const mode = check.meta?.dry_run_mode;
  if (
    mode === "simulated" ||
    mode === "analyzed" ||
    mode === "skipped" ||
    mode === "executed"
  ) {
    return mode;
  }
  return "simulated";
}

async function getDryRunFileBlockers(
  files: string[],
  opts: { check: "format" | "typecheck" | "test" },
): Promise<string[]> {
  const blockers: string[] = [];
  const onlyPattern = /\b(?:describe|it|test)\.only\s*\(/;

  for (const file of files) {
    const absolute = resolve(process.cwd(), file);
    const bunFile = Bun.file(absolute);
    if (!(await bunFile.exists())) continue;

    let text = "";
    try {
      text = await bunFile.text();
    } catch {
      continue;
    }

    if (/^<{7}|^={7}|^>{7}/m.test(text)) {
      blockers.push(`${file}: merge conflict markers detected`);
    }

    if (opts.check === "format" && /[ \t]+$/m.test(text)) {
      blockers.push(`${file}: trailing whitespace detected`);
    }

    if (opts.check === "test" && onlyPattern.test(text)) {
      blockers.push(`${file}: .only() test focus detected`);
    }
  }

  return blockers;
}

// ============================================================================
// Utilities
// ============================================================================

async function runCommand(
  cmd: string,
  cwd?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(cmd.split(" "), {
    cwd: cwd ?? process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  await proc.exited;
  return { stdout, stderr, exitCode: proc.exitCode ?? 1 };
}

// Code file extensions that require typecheck/test verification when changed outside tools/ and plugins/.
// Lock files are included: a dependency change warrants running tests.
const APP_CODE_EXTS =
  /\.(ts|tsx|js|jsx|mjs|cjs|svelte|vue|cs|go|py|rb|rs|java|kt|swift|lock|lockb)$/i;

async function detectWorkTypes(): Promise<WorkType[]> {
  try {
    const { stdout } = await runCommand("git diff --name-only HEAD");
    const files = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const types = new Set<WorkType>();
    for (const file of files) {
      if (file.startsWith("tools/")) {
        types.add("tool");
      } else if (file.startsWith("plugins/")) {
        types.add("plugin");
      } else if (APP_CODE_EXTS.test(file)) {
        // App-code file outside opencode's tools/plugins dirs.
        // Triggers fmt / typecheck / test checks at the correct project root.
        // console-logging check scans tools/plugins dirs only — no false hits here.
        types.add("code");
      }
      // .md/.txt can coexist with code — always enforce doc policy when present.
      if (/\.(md|txt)$/.test(file)) types.add("doc");
    }

    return types.size > 0 ? Array.from(types) : ["auto"];
  } catch {
    return ["auto"];
  }
}

function checkForbiddenDocPatterns(files: string[]): string[] {
  const forbidden = [
    /SUMMARY\.md$/,
    /IMPLEMENTATION.*\.md$/,
    /COMPLETE\.md$/,
    /CHECK_LIST\.md$/,
    /PHASE_.*\.md$/,
    /test-.*\.md$/,
    /CREATION-LOG\.md$/,
  ];

  // Documented exceptions per DOCUMENTATION_POLICY.md
  const allowed = [
    /^\.opencode\/tool\/INTEGRATION_SUMMARY\.md$/,
    /^protocols\/.*_CHECK_LIST\.md$/,
  ];

  const violations: string[] = [];
  for (const file of files) {
    const normalized = file
      .trim()
      .replace(/\r/g, "")
      .replace(/^\.\//, "")
      .replace(/\\/g, "/");

    // Explicit allow: protocol checklists are permitted by policy
    if (
      normalized.startsWith("protocols/") &&
      normalized.endsWith("_CHECK_LIST.md")
    ) {
      continue;
    }

    // Skip archive directory
    if (normalized.startsWith("archive/")) continue;

    // Check if file matches any allowed exception
    const isAllowed = allowed.some((pattern) => pattern.test(normalized));
    if (isAllowed) continue;

    // Check if file matches any forbidden pattern
    for (const pattern of forbidden) {
      if (pattern.test(normalized)) {
        violations.push(normalized);
        break;
      }
    }
  }

  return violations;
}

function parseGitNameStatus(stdout: string): string[] {
  // Parse `git diff --name-status` output.
  // Only consider paths that will exist after the change:
  // - Ignore deletions (D)
  // - For renames (Rxxx), use the NEW path
  // - For adds/copies/modifies, use the path
  const paths: string[] = [];

  for (const rawLine of stdout.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    const status = parts[0] ?? "";

    if (status.startsWith("D")) continue;

    if (status.startsWith("R") && parts.length >= 3) {
      // R100 old/path new/path
      paths.push((parts[2] ?? "").trim());
      continue;
    }

    // A, C, M, T, U, etc.
    if (parts.length >= 2) paths.push((parts[1] ?? "").trim());
  }

  return paths.filter(Boolean);
}

// ============================================================================
// Package Manager Detection (per-directory)
// ============================================================================

/**
 * Walk up from `filePath`'s directory to find the nearest `package.json`,
 * stopping at `repoRoot`. Returns the directory containing `package.json`
 * as a path relative to `repoRoot`, or `"."` if none found before root.
 */
export async function findNearestPackageJson(
  filePath: string,
  repoRoot: string = process.cwd(),
): Promise<string> {
  const absRoot = resolve(repoRoot);
  let dir = resolve(dirname(join(absRoot, filePath)));

  while (dir.startsWith(absRoot)) {
    const pkgPath = join(dir, "package.json");
    if (await Bun.file(pkgPath).exists()) {
      // Return relative path from repoRoot
      const rel = dir.slice(absRoot.length).replace(/^\//, "") || ".";
      return rel;
    }
    const parent = dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }

  return ".";
}

/**
 * Detect which package manager is in use for a specific directory.
 */
export async function detectPmInDir(dir: string): Promise<PackageManager> {
  const absDir = resolve(dir);
  const checks: Array<[string, PackageManager]> = [
    ["bun.lockb", "bun"],
    ["bun.lock", "bun"],
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
  ];
  for (const [file, pm] of checks) {
    if (await Bun.file(join(absDir, file)).exists()) return pm;
  }
  return "bun"; // fallback
}

async function getScriptsInDir(dir: string): Promise<Record<string, string>> {
  try {
    const absDir = resolve(dir);
    const pkg = (await Bun.file(join(absDir, "package.json")).json()) as {
      scripts?: Record<string, string>;
    };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

/**
 * Group changed files by their nearest project root (the closest ancestor
 * directory containing a `package.json`).
 * Returns a Map<relativeDir, filePaths[]>.
 */
export async function groupFilesByProjectRoot(
  files: string[],
  repoRoot: string = process.cwd(),
): Promise<Map<string, string[]>> {
  const groups = new Map<string, string[]>();
  for (const file of files) {
    const rootDir = await findNearestPackageJson(file, repoRoot);
    const existing = groups.get(rootDir) ?? [];
    existing.push(file);
    groups.set(rootDir, existing);
  }
  return groups;
}

/**
 * Get changed files from git diff and group them into ProjectRoot entries.
 */
async function detectProjectRoots(): Promise<ProjectRoot[]> {
  let files: string[] = [];
  try {
    const { stdout } = await runCommand("git diff --name-only HEAD");
    files = stdout
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  } catch {
    // No git or no changes — fall back to repo root
  }

  if (files.length === 0) {
    // No changed files: run checks at repo root
    const pm = await detectPmInDir(".");
    const scripts = await getScriptsInDir(".");
    return [{ dir: ".", pm, scripts, files: [] }];
  }

  const groups = await groupFilesByProjectRoot(files);
  const roots: ProjectRoot[] = [];

  for (const [dir, groupFiles] of groups) {
    const pm = await detectPmInDir(dir);
    const scripts = await getScriptsInDir(dir);
    roots.push({ dir, pm, scripts, files: groupFiles });
  }

  return roots;
}

function pmRun(pm: PackageManager, script: string): string {
  return `${pm} run ${script}`;
}

function pmExec(pm: PackageManager): string {
  if (pm === "pnpm") return "pnpm exec";
  if (pm === "yarn") return "yarn exec";
  if (pm === "npm") return "npx";
  return "bunx";
}

/** Strip `[dir]` suffix from a check name before GATE_NAMES lookup. */
function getGateName(checkName: string): string {
  return checkName.replace(/\s*\[.*\]$/, "");
}

// ============================================================================
// Check Runners
// ============================================================================

async function runConsoleLoggingCheck(
  skip?: boolean,
  dryRun?: boolean,
  changedFiles?: string[],
): Promise<CheckResult | null> {
  if (skip) return null;

  const start = Date.now();
  try {
    const files = dryRun
      ? (changedFiles ?? [])
          .map((line) => line.trim())
          .filter(
            (file) =>
              file.endsWith(".ts") &&
              (file.startsWith("tools/") ||
                file.startsWith("plugins/") ||
                file.startsWith("tool/")),
          )
      : (() => {
          const stdout = Bun.spawnSync(
            ["git", "ls-files", "tools", "plugins", "tool"],
            {
              cwd: process.cwd(),
              stdout: "pipe",
              stderr: "pipe",
            },
          ).stdout.toString();

          return stdout
            .split("\n")
            .map((line) => line.trim())
            .filter((file) => file.endsWith(".ts"));
        })();

    if (!dryRun && files.length === 0) {
      return null;
    }

    const offenders: string[] = [];
    const consolePattern = /\bconsole\.(log|debug|info|warn|error)\b/;
    // Matches the CLI entrypoint block starting at the beginning of a line.
    // Calls to console.*() inside that block are legitimate CLI output — skip them.
    const mainBlockPattern = /^if\s*\(import\.meta\.main\)/m;
    // TUI/diagnostic tools that are pure console output by design.
    const CONSOLE_ALLOWED_PREFIXES = ["scripts/wtf-", "tool/"];
    const CONSOLE_ALLOWED_EXACT = new Set([
      "scripts/wtf-agents.ts",
      "scripts/wtf-cost.ts",
      "scripts/wtf-roadmap.ts",
      "scripts/wtf-health.ts",
    ]);

    for (const file of files) {
      const isAllowed =
        CONSOLE_ALLOWED_EXACT.has(file) ||
        CONSOLE_ALLOWED_PREFIXES.some((p) => file.startsWith(p));
      if (isAllowed) continue;
      try {
        const text = await Bun.file(file).text();
        const mainMatch = mainBlockPattern.exec(text);
        const checkText = mainMatch ? text.slice(0, mainMatch.index) : text;
        if (consolePattern.test(checkText)) offenders.push(file);
      } catch {
        return {
          name: "console logging",
          passed: false,
          output: `[X] console logging check: failed to read ${file}`,
          duration_ms: Date.now() - start,
        };
      }
    }

    if (offenders.length > 0) {
      return {
        name: "console logging",
        passed: false,
        output: withDryRunPrefix(
          dryRun,
          "analyzed",
          `[X] console logging forbidden in tools/plugins\n${offenders.join("\n")}`,
        ),
        duration_ms: Date.now() - start,
        meta: {
          dry_run_mode: dryRun ? "analyzed" : "executed",
        },
      };
    }

    return {
      name: "console logging",
      passed: true,
      output: withDryRunPrefix(
        dryRun,
        "analyzed",
        dryRun
          ? "[!] console logging: no heuristic blockers detected in changed tools/plugin files"
          : "[OK] console logging (none found in tools/plugins)",
      ),
      duration_ms: Date.now() - start,
      meta: {
        dry_run_mode: dryRun ? "analyzed" : "executed",
      },
    };
  } catch (error) {
    return {
      name: "console logging",
      passed: false,
      output: withDryRunPrefix(
        dryRun,
        "analyzed",
        `[X] console logging error: ${error instanceof Error ? error.message : String(error)}`,
      ),
      duration_ms: Date.now() - start,
      meta: {
        dry_run_mode: dryRun ? "analyzed" : "executed",
      },
    };
  }
}

async function runFormatCheck(
  pm: PackageManager,
  scripts: Record<string, string>,
  dir: string,
  files: string[],
  dryRun?: boolean,
): Promise<CheckResult> {
  const start = Date.now();
  const label = dir !== "." ? ` [${dir}]` : "";
  const checkName = `format${label}`;
  const candidates = ["fmt", "format", "lint"];
  const match = candidates.find((s) => s in scripts);

  if (!match) {
    return {
      name: checkName,
      passed: true,
      output: withDryRunPrefix(
        dryRun,
        "skipped",
        `[!] format${label}: no fmt/format/lint script defined (skipped)`,
      ),
      duration_ms: Date.now() - start,
      meta: {
        dry_run_mode: "skipped",
      },
    };
  }

  const cmd = pmRun(pm, match);
  const cwd = resolve(process.cwd(), dir);

  if (dryRun) {
    try {
      const blockers = await getDryRunFileBlockers(files, { check: "format" });
      const hasBlockers = blockers.length > 0;
      return {
        name: checkName,
        passed: !hasBlockers,
        output: hasBlockers
          ? withDryRunPrefix(
              true,
              "simulated",
              `[X] format${label}: heuristic blockers detected\n${blockers.join("\n")}`,
            )
          : withDryRunPrefix(
              true,
              "simulated",
              `[!] format${label}: no heuristic blockers detected (static scan only)`,
            ),
        duration_ms: Date.now() - start,
        meta: {
          dry_run_mode: "simulated",
          simulation_basis: "file-analysis",
        },
        remedy: hasBlockers
          ? `Fix: Run '${cmd}' in ${dir} to validate formatting after resolving blockers`
          : undefined,
      };
    } catch (error) {
      return {
        name: checkName,
        passed: false,
        output: withDryRunPrefix(
          true,
          "simulated",
          `[X] format${label} dry-run analysis error: ${error instanceof Error ? error.message : String(error)}`,
        ),
        duration_ms: Date.now() - start,
        meta: {
          dry_run_mode: "simulated",
          simulation_basis: "file-analysis",
        },
      };
    }
  }

  try {
    const { exitCode, stderr } = await runCommand(cmd, cwd);
    const duration_ms = Date.now() - start;
    return {
      name: checkName,
      passed: exitCode === 0,
      output:
        exitCode === 0
          ? `[OK] ${cmd}${label}`
          : `[X] ${cmd}${label} failed\n${stderr}`,
      duration_ms,
      meta: {
        dry_run_mode: "executed",
      },
      remedy:
        exitCode !== 0
          ? `Fix: Run '${cmd}' in ${dir} to auto-format, then re-run verify-loop`
          : undefined,
    };
  } catch (error) {
    return {
      name: checkName,
      passed: false,
      output: `[X] format${label} error: ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - start,
      meta: {
        dry_run_mode: "executed",
      },
    };
  }
}

async function runTypecheckCheck(
  pm: PackageManager,
  scripts: Record<string, string>,
  dir: string,
  files: string[],
  dryRun?: boolean,
): Promise<CheckResult> {
  const start = Date.now();
  const label = dir !== "." ? ` [${dir}]` : "";
  const checkName = `typecheck${label}`;
  const scriptCandidates = ["typecheck", "type-check"];
  const match = scriptCandidates.find((s) => s in scripts);
  const cwd = resolve(process.cwd(), dir);

  let cmd: string;
  if (match) {
    cmd = pmRun(pm, match);
  } else if (await Bun.file(join(cwd, "tsconfig.json")).exists()) {
    // Use tsconfig.json which already has proper exclusions
    cmd = `${pmExec(pm)} tsc --noEmit --pretty false`;
  } else {
    return {
      name: checkName,
      passed: true,
      output: withDryRunPrefix(
        dryRun,
        "skipped",
        `[!] typecheck${label}: no typecheck script or tsconfig.json found (skipped)`,
      ),
      duration_ms: Date.now() - start,
      meta: {
        dry_run_mode: "skipped",
      },
    };
  }

  if (dryRun) {
    try {
      const blockers = await getDryRunFileBlockers(files, {
        check: "typecheck",
      });
      const parserBlockers: string[] = [];
      const parserByLoader = {
        ts: new Bun.Transpiler({ loader: "ts" }),
        tsx: new Bun.Transpiler({ loader: "tsx" }),
        js: new Bun.Transpiler({ loader: "js" }),
        jsx: new Bun.Transpiler({ loader: "jsx" }),
      } as const;

      for (const file of files) {
        const extMatch = file.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/i);
        if (!extMatch) continue;

        const ext = extMatch[1].toLowerCase();
        const loader: keyof typeof parserByLoader =
          ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx"
            ? ext
            : "js";

        const bunFile = Bun.file(resolve(process.cwd(), file));
        if (!(await bunFile.exists())) continue;

        try {
          const source = await bunFile.text();
          parserByLoader[loader].transformSync(source);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          parserBlockers.push(
            `${file}: parse/transpile error detected (${message.split("\n")[0]})`,
          );
        }
      }

      const allBlockers = [...blockers, ...parserBlockers];
      const hasBlockers = allBlockers.length > 0;
      return {
        name: checkName,
        passed: !hasBlockers,
        output: hasBlockers
          ? withDryRunPrefix(
              true,
              "simulated",
              `[X] typecheck${label}: heuristic blockers detected\n${allBlockers.join("\n")}`,
            )
          : withDryRunPrefix(
              true,
              "simulated",
              `[!] typecheck${label}: no heuristic blockers detected (static scan only; type errors may still exist)`,
            ),
        duration_ms: Date.now() - start,
        meta: {
          dry_run_mode: "simulated",
          simulation_basis: "file-analysis+transpile-parse",
        },
      };
    } catch (error) {
      return {
        name: checkName,
        passed: false,
        output: withDryRunPrefix(
          true,
          "simulated",
          `[X] typecheck${label} dry-run analysis error: ${error instanceof Error ? error.message : String(error)}`,
        ),
        duration_ms: Date.now() - start,
        meta: {
          dry_run_mode: "simulated",
          simulation_basis: "file-analysis",
        },
      };
    }
  }

  try {
    const { exitCode, stdout, stderr } = await runCommand(cmd, cwd);
    const duration_ms = Date.now() - start;

    // tsc may show help if invoked incorrectly
    if (stdout.includes("Version") || stdout.includes("tsc [options]")) {
      return {
        name: checkName,
        passed: true,
        output: `[!] typecheck${label}: tsc invocation skipped (no valid options)`,
        duration_ms,
      };
    }

    return {
      name: checkName,
      passed: exitCode === 0,
      output:
        exitCode === 0
          ? `[OK] ${cmd}${label}`
          : `[X] typecheck${label} failed\n${stderr.slice(0, 500)}`,
      duration_ms,
      meta: {
        dry_run_mode: "executed",
      },
      remedy:
        exitCode !== 0
          ? "Fix: Address TypeScript errors above. Common causes: missing imports, type mismatches, undefined variables"
          : undefined,
    };
  } catch (error) {
    return {
      name: checkName,
      passed: false,
      output: `[X] typecheck${label} error: ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - start,
      meta: {
        dry_run_mode: "executed",
      },
    };
  }
}

async function runTestCheck(
  pm: PackageManager,
  scripts: Record<string, string>,
  dir: string,
  files: string[],
  dryRun?: boolean,
): Promise<CheckResult> {
  const start = Date.now();
  const label = dir !== "." ? ` [${dir}]` : "";
  const checkName = `test${label}`;
  const cwd = resolve(process.cwd(), dir);

  // Prefer the project's test script (vitest, jest, mocha, etc.) over a PM-native runner.
  // Fall back to bun's built-in runner only when PM is bun and no test script is defined.
  let cmd: string;
  let isBunNative = false;
  if ("test" in scripts) {
    cmd = pmRun(pm, "test");
  } else if (pm === "bun") {
    cmd = "bun test --pass-with-no-tests";
    isBunNative = true;
  } else {
    return {
      name: checkName,
      passed: true,
      output: withDryRunPrefix(
        dryRun,
        "skipped",
        `[!] test${label}: no test script defined (skipped)`,
      ),
      duration_ms: Date.now() - start,
      meta: {
        dry_run_mode: "skipped",
      },
    };
  }

  if (dryRun) {
    try {
      const blockers = await getDryRunFileBlockers(files, { check: "test" });
      const hasBlockers = blockers.length > 0;
      return {
        name: checkName,
        passed: !hasBlockers,
        output: hasBlockers
          ? withDryRunPrefix(
              true,
              "simulated",
              `[X] test${label}: heuristic blockers detected\n${blockers.join("\n")}`,
            )
          : withDryRunPrefix(
              true,
              "simulated",
              `[!] test${label}: no heuristic blockers detected (static scan only)`,
            ),
        duration_ms: Date.now() - start,
        meta: {
          dry_run_mode: "simulated",
          simulation_basis: "file-analysis",
        },
        remedy: hasBlockers
          ? `Fix: Resolve blockers, then run '${cmd}' in ${dir} to validate test execution`
          : undefined,
      };
    } catch (error) {
      return {
        name: checkName,
        passed: false,
        output: withDryRunPrefix(
          true,
          "simulated",
          `[X] test${label} dry-run analysis error: ${error instanceof Error ? error.message : String(error)}`,
        ),
        duration_ms: Date.now() - start,
        meta: {
          dry_run_mode: "simulated",
          simulation_basis: "file-analysis",
        },
      };
    }
  }

  try {
    const { exitCode, stdout, stderr } = await runCommand(cmd, cwd);
    const duration_ms = Date.now() - start;

    const noTests =
      stdout.includes("0 pass") || stdout.includes("No tests found");
    if (isBunNative && noTests) {
      return {
        name: checkName,
        passed: true,
        output: `[!] No tests found${label} (pass-with-no-tests)`,
        duration_ms,
      };
    }

    return {
      name: checkName,
      passed: exitCode === 0,
      output:
        exitCode === 0
          ? `[OK] ${cmd}${label}\n${stdout.slice(0, 200)}`
          : `[X] test${label} failed\n${stderr.slice(0, 500)}`,
      duration_ms,
      meta: {
        dry_run_mode: "executed",
      },
      remedy:
        exitCode !== 0
          ? `Fix: Run '${cmd}' in ${dir} to see full output. Fix failing tests, then re-run verify-loop`
          : undefined,
    };
  } catch (error) {
    return {
      name: checkName,
      passed: false,
      output: `[X] test${label} error: ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - start,
      meta: {
        dry_run_mode: "executed",
      },
    };
  }
}

async function runDocPolicyCheck(
  dryRun?: boolean,
  changedFiles?: string[],
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const files = dryRun
      ? (changedFiles ?? [])
      : parseGitNameStatus(
          (await runCommand("git diff --name-status HEAD")).stdout,
        );
    const violations = checkForbiddenDocPatterns(files);

    const duration_ms = Date.now() - start;

    if (violations.length > 0) {
      return {
        name: "doc policy",
        passed: false,
        output: withDryRunPrefix(
          dryRun,
          "analyzed",
          `[X] Documentation policy violation: forbidden filename patterns\n${violations.join("\n")}`,
        ),
        duration_ms,
        meta: {
          dry_run_mode: dryRun ? "analyzed" : "executed",
        },
        remedy:
          "Fix: Rename or delete forbidden doc files (*SUMMARY.md, *IMPLEMENTATION*.md, *COMPLETE.md). Update canonical docs instead.",
      };
    }

    return {
      name: "doc policy",
      passed: true,
      output: withDryRunPrefix(
        dryRun,
        "analyzed",
        dryRun
          ? "[!] doc policy: no heuristic blockers detected in changed files"
          : "[OK] doc policy (no forbidden patterns)",
      ),
      duration_ms,
      meta: {
        dry_run_mode: dryRun ? "analyzed" : "executed",
      },
    };
  } catch (error) {
    return {
      name: "doc policy",
      passed: false,
      output: withDryRunPrefix(
        dryRun,
        "analyzed",
        `[X] doc policy error: ${error instanceof Error ? error.message : String(error)}`,
      ),
      duration_ms: Date.now() - start,
      meta: {
        dry_run_mode: dryRun ? "analyzed" : "executed",
      },
    };
  }
}

// ============================================================================
// Completion Proof Builder
// ============================================================================

async function buildCompletionProof(checks: CheckResult[]): Promise<string> {
  const gatesPassed = checks
    .filter((c) => c.passed)
    .map((c) => GATE_NAMES[getGateName(c.name)] ?? getGateName(c.name));

  let changedFiles: string[] = [];
  let testsAdded: string[] = [];

  try {
    const { stdout } = await runCommand("git diff --name-only HEAD");
    const files = stdout
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    changedFiles = files;
    testsAdded = files.filter(
      (f) =>
        f.includes(".test.") || f.includes(".spec.") || f.startsWith("tests/"),
    );
  } catch {
    // Non-fatal — proof still emits with empty file lists
  }

  const lines: string[] = [
    "### Completion Proof",
    'Paste into `updateroadmap(note)` when marking `status="completed"`:',
    "```",
    `gates_passed: [${gatesPassed.join(", ")}]`,
    "changed_files:",
    ...(changedFiles.length > 0
      ? changedFiles.map((f) => `  - ${f}`)
      : ["  - (none)"]),
    "tests_added:",
    ...(testsAdded.length > 0
      ? testsAdded.map((f) => `  - ${f}`)
      : ["  - (none)"]),
    "```",
  ];

  return lines.join("\n");
}

// ============================================================================
// Main Verification Logic
// ============================================================================

async function executeVerification(args: {
  type: WorkType;
  checkpointName?: string;
  effort?: "f1" | "f2" | "f3";
  skipConsoleLogging?: boolean;
  guillotinePassed?: boolean;
  dryRun?: boolean;
  skipCircuitBreaker?: boolean;
  spec?: string;
}): Promise<VerifyResult> {
  if (!args.dryRun && !args.skipCircuitBreaker) {
    const state = loadFailureState();
    if (state.consecutiveFailures >= VERIFY_LOOP_CIRCUIT_BREAKER_THRESHOLD) {
      return {
        success: false,
        work_types: args.type === "auto" ? ["auto"] : [args.type],
        checks: [
          {
            name: "circuit breaker",
            passed: false,
            output: formatCircuitBreakerMessage(
              state.consecutiveFailures,
              state.lastError,
            ),
            duration_ms: 0,
            remedy:
              "Fix the underlying failure first. A successful verify-loop run resets the circuit breaker automatically.",
            meta: {
              dry_run_mode: "executed",
            },
          },
        ],
        failed_checks: ["circuit breaker"],
        dry_run: false,
      };
    }
  }

  const workTypes =
    args.type === "auto" ? await detectWorkTypes() : [args.type];
  const checks: CheckResult[] = [];

  // Determine which checks to run based on work types
  const needsCodeChecks =
    workTypes.includes("tool") ||
    workTypes.includes("plugin") ||
    workTypes.includes("auto") ||
    workTypes.includes("code"); // app-code outside tools/plugins also requires code checks
  const needsDocChecks =
    workTypes.includes("doc") || workTypes.includes("auto");

  // Detect project roots from changed files
  const projectRoots = await detectProjectRoots();
  const changedFiles = Array.from(
    new Set(projectRoots.flatMap((root) => root.files)),
  );

  // Run per-project-root code checks
  if (needsCodeChecks) {
    for (const root of projectRoots) {
      checks.push(
        await runFormatCheck(
          root.pm,
          root.scripts,
          root.dir,
          root.files,
          args.dryRun,
        ),
      );
      checks.push(
        await runTypecheckCheck(
          root.pm,
          root.scripts,
          root.dir,
          root.files,
          args.dryRun,
        ),
      );
      checks.push(
        await runTestCheck(
          root.pm,
          root.scripts,
          root.dir,
          root.files,
          args.dryRun,
        ),
      );
    }
    // Console logging check is repo-wide (opencode-specific), run once
    const consoleCheck = await runConsoleLoggingCheck(
      args.skipConsoleLogging,
      args.dryRun,
      changedFiles,
    );
    if (consoleCheck) checks.push(consoleCheck);
  }

  if (needsDocChecks) {
    checks.push(await runDocPolicyCheck(args.dryRun, changedFiles));
  }

  let semanticGateOutput: string | undefined;
  let semanticSpecSource: string | undefined;
  if (args.spec) {
    const start = Date.now();
    try {
      const semanticResult = await runSpecSemanticValidation({
        specPath: args.spec,
        dryRun: args.dryRun,
      });
      const semanticOutput = formatSemanticGateOutput(semanticResult);
      checks.push({
        name: "semantic",
        passed: semanticResult.gateStatus === "PASS",
        output: semanticOutput,
        duration_ms: Date.now() - start,
        meta: {
          dry_run_mode: args.dryRun ? "simulated" : "executed",
          source: semanticResult.sourcePath,
        },
        remedy:
          semanticResult.gateStatus === "PASS"
            ? undefined
            : "Fix: align implementation with failed criteria, then re-run verify-loop with --spec",
      });
      semanticGateOutput = semanticOutput;
      semanticSpecSource = semanticResult.sourcePath;
    } catch (error) {
      checks.push({
        name: "semantic",
        passed: false,
        output: `[X] semantic gate error: ${error instanceof Error ? error.message : String(error)}`,
        duration_ms: Date.now() - start,
        meta: {
          dry_run_mode: args.dryRun ? "simulated" : "executed",
        },
        remedy:
          "Fix: verify --spec path points to a valid spec.md/plan.md with acceptance criteria headings and list items.",
      });
    }
  }

  // F2/F3 Guillotine gate — fails by default; pass --guillotine-passed after review is done.
  // Only shown when all other checks pass (no point reviewing broken code).
  if (
    (args.effort === "f2" || args.effort === "f3") &&
    !args.guillotinePassed
  ) {
    const allOtherChecksPassed = checks.every((c) => c.passed);
    checks.push({
      name: "guillotine",
      passed: false,
      output: allOtherChecksPassed
        ? withDryRunPrefix(
            args.dryRun,
            "simulated",
            "[X] guillotine: F2/F3 work requires a Guillotine review before the Completion Proof is emitted.",
          )
        : withDryRunPrefix(
            args.dryRun,
            "simulated",
            "[X] guillotine: Pending — fix all other failures first, then run Guillotine review.",
          ),
      duration_ms: 0,
      meta: {
        dry_run_mode: args.dryRun ? "simulated" : "executed",
      },
      remedy:
        "1. Run: opencode run guillotine-reviewer\n" +
        "   2. Address any findings\n" +
        "   3. Re-run: bun tools/verify-loop.ts --effort f2 --guillotine-passed",
    });
  }

  // Collect failures
  const failedChecks = checks.filter((c) => !c.passed).map((c) => c.name);
  const success = failedChecks.length === 0;

  const result: VerifyResult = {
    success,
    work_types: workTypes,
    checks,
    failed_checks: failedChecks,
    dry_run: args.dryRun,
    project_roots: projectRoots,
    semantic_gate_output: semanticGateOutput,
    semantic_spec_source: semanticSpecSource,
  };

  if (!args.dryRun) {
    if (success) {
      resetFailureState();
    } else {
      const lastFailureOutput =
        checks
          .filter((c) => !c.passed)
          .map((c) => c.output.trim())
          .find(Boolean) ?? "Unknown verify-loop failure";
      const state = bumpFailureState(lastFailureOutput);
      if (state.consecutiveFailures >= VERIFY_LOOP_CIRCUIT_BREAKER_THRESHOLD) {
        checks.push({
          name: "circuit breaker",
          passed: false,
          output: formatCircuitBreakerMessage(
            state.consecutiveFailures,
            state.lastError,
          ),
          duration_ms: 0,
          remedy:
            "Fix the underlying failure first. A successful verify-loop run resets the circuit breaker automatically.",
          meta: {
            dry_run_mode: "executed",
          },
        });
        result.failed_checks = checks
          .filter((c) => !c.passed)
          .map((c) => c.name);
      }
    }
  }

  // Create blocker if checks failed
  if (!success && !args.dryRun) {
    try {
      const blockerTitle = `verification-loop failure: ${failedChecks.join(", ")}`;
      const blockerNote = `Failed checks:\n${checks
        .filter((c) => !c.passed)
        .map((c) => c.output)
        .join("\n\n")}`;

      const blockerProc = Bun.spawn(
        [
          "bun",
          "tools/blocker-tracker.ts",
          "--op",
          "upsert",
          "--title",
          blockerTitle,
          "--note",
          blockerNote,
          "--status",
          "open",
        ],
        { cwd: process.cwd(), stdout: "pipe", stderr: "pipe" },
      );
      await blockerProc.exited;
      result.blocker_created = true;
    } catch {
      result.blocker_created = false;
    }
  }

  // Create checkpoint if checks passed and checkpoint name provided
  if (success && args.checkpointName && !args.dryRun) {
    try {
      const checkpointProc = Bun.spawn(
        [
          "bun",
          "tools/checkpoint.ts",
          "--name",
          args.checkpointName,
          "--focus",
          "verification-loop passed",
        ],
        { cwd: process.cwd(), stdout: "pipe", stderr: "pipe" },
      );
      await checkpointProc.exited;
      result.checkpoint_created = true;
    } catch {
      result.checkpoint_created = false;
    }
  }

  return result;
}

async function renderVerificationReport(
  result: VerifyResult,
  opts: {
    effort?: "f1" | "f2" | "f3";
    guillotinePassed?: boolean;
    checkpointName?: string;
    spec?: string;
  },
): Promise<string> {
  const lines: string[] = [];
  const tag = result.success ? "OK" : "X";
  const totalMs = result.checks.reduce((s, c) => s + c.duration_ms, 0);

  lines.push(`## Verification Report`);
  lines.push(
    `[${tag}] ${result.success ? "PASSED" : "FAILED"} | work: ${result.work_types.join(", ")} | ${totalMs}ms${result.dry_run ? " | dry-run" : ""}`,
  );
  lines.push("");

  if (result.dry_run) {
    lines.push(
      "[!] Dry-run mode: verification commands were NOT executed; results are simulated/analyzed from file and config state.",
    );
    lines.push("");
  }

  if (result.project_roots && result.project_roots.length > 0) {
    lines.push("| Project Root | PM | Changed Files |");
    lines.push("|---|---|---|");
    for (const root of result.project_roots) {
      lines.push(`| ${root.dir} | ${root.pm} | ${root.files.length} |`);
    }
    lines.push("");
  }

  if (opts.spec) {
    lines.push(`Spec gate source: ${result.semantic_spec_source ?? opts.spec}`);
    lines.push("");
  }

  if (result.semantic_gate_output) {
    lines.push("### Semantic Gate");
    lines.push(result.semantic_gate_output);
    lines.push("");
  }

  lines.push("| Gate | Check | Status | Mode | Duration |");
  lines.push("|------|-------|--------|------|----------|");
  for (const check of result.checks) {
    const status = check.passed ? "[OK]" : "[X]";
    const gate = GATE_NAMES[getGateName(check.name)] ?? getGateName(check.name);
    const mode = modeFromCheck(check, result.dry_run);
    lines.push(
      `| ${gate} | ${check.name} | ${status} | ${mode} | ${check.duration_ms}ms |`,
    );
  }
  lines.push("");

  const failures = result.checks.filter((c) => !c.passed);
  const warnings = result.checks.filter(
    (c) => c.passed && c.output.includes("[!]"),
  );

  if (failures.length > 0) {
    lines.push("### Failures");
    for (const f of failures) {
      lines.push(`**${f.name}:**`);
      lines.push(f.output);
      if (f.remedy) {
        lines.push(`> ${f.remedy}`);
      }
      lines.push("");
    }
  }

  if (warnings.length > 0) {
    lines.push("### Warnings");
    for (const w of warnings) {
      lines.push(w.output);
    }
    lines.push("");
  }

  if (result.success) {
    lines.push("### Next Action");
    lines.push("[OK] All checks passed — work meets Definition of Done.");
    if (
      (opts.effort === "f2" || opts.effort === "f3") &&
      opts.guillotinePassed
    ) {
      lines.push("[OK] Guillotine review: confirmed.");
    }
    if (result.checkpoint_created) {
      lines.push(`[OK] Checkpoint created: ${opts.checkpointName}`);
    }
    if (result.dry_run) {
      lines.push(
        "[!] Dry-run only: re-run without --dry-run to execute verification gates.",
      );
    }
    lines.push("Suggested next steps:");
    lines.push(
      "  1. Commit:   git add -A && git commit -m '<describe changes>'",
    );
    lines.push(
      "  2. Mark done: updateroadmap(actionNumber='N.NN', status='completed', note='<paste Completion Proof below>')",
    );
    lines.push("  3. Continue: readroadmap to find next pending action");
    lines.push("");
    lines.push(await buildCompletionProof(result.checks));
  } else {
    lines.push("### Next Action");
    lines.push(
      `[X] Fix ${result.failed_checks.length} failing check(s): ${result.failed_checks.join(", ")}`,
    );
    lines.push(
      "Fix each check using remedies shown in Failures section above.",
    );
    lines.push(
      result.dry_run
        ? "When ready: run without --dry-run to execute real checks."
        : "When fixed: bun tools/verify-loop.ts --type auto",
    );
    if (result.blocker_created) {
      lines.push("[!] Blocker created/updated in status tracker.");
    }
  }

  return lines.join("\n");
}

// ============================================================================
// Tool Definition
// ============================================================================

export const searchHint = "format typecheck test quality gate definition done";

export default tool({
  description:
    "Run verification loop to ensure work meets Definition of Done. Checks formatting, typechecking, tests, and doc policy based on work type.",
  args: {
    type: tool.schema
      .enum(["tool", "plugin", "doc", "auto"])
      .optional()
      .default("auto")
      .describe("Work type: tool, plugin, doc, or auto (detect from git diff)"),
    checkpointName: tool.schema
      .string()
      .optional()
      .describe("Create checkpoint with this name if all checks pass"),
    spec: tool.schema
      .string()
      .optional()
      .describe(
        "Optional path to spec.md/plan.md (or directory containing one) for semantic acceptance-criteria validation.",
      ),
    effort: tool.schema
      .enum(["f1", "f2", "f3"])
      .optional()
      .describe(
        "Effort level (Crimson Seal). f2 or f3 triggers mandatory Guillotine code review gate before completion proof is emitted.",
      ),
    skipConsoleLogging: tool.schema
      .boolean()
      .optional()
      .default(false)
      .describe("Skip console logging check (for non-opencode repos)"),
    guillotinePassed: tool.schema
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Confirm Guillotine code review is complete (required for f2/f3 work to emit Completion Proof).",
      ),
    dryRun: tool.schema
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Simulate verification outcomes from file analysis without executing verification commands.",
      ),
    skipCircuitBreaker: tool.schema
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Ignore persisted verify-loop failure state and force gate execution.",
      ),
  },
  async execute(args): Promise<string> {
    const result = await executeVerification({
      type: args.type as WorkType,
      checkpointName: args.checkpointName,
      spec: args.spec,
      effort: args.effort as "f1" | "f2" | "f3" | undefined,
      skipConsoleLogging: args.skipConsoleLogging,
      guillotinePassed: args.guillotinePassed,
      dryRun: args.dryRun,
      skipCircuitBreaker: args.skipCircuitBreaker,
    });
    return renderVerificationReport(result, {
      spec: args.spec,
      effort: args.effort as "f1" | "f2" | "f3" | undefined,
      guillotinePassed: args.guillotinePassed,
      checkpointName: args.checkpointName,
    });
  },
});

// CLI entrypoint

if (import.meta.main) {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const typeArg = get("--type") || get("-t") || "auto";
  const checkpointNameArg = get("--checkpoint-name") || get("-c");
  const specArg = get("--spec");
  const effortArg = get("--effort") || get("-e");
  const skipConsoleLoggingArg =
    args.includes("--skip-console-logging") || args.includes("-s");
  const skipCircuitBreakerArg = args.includes("--skip-circuit-breaker");
  const guillotinePassedArg =
    args.includes("--guillotine-passed") || args.includes("-g");
  const dryRunArg = args.includes("--dry-run") || args.includes("-d");
  const versionArg = args.includes("--version") || args.includes("-v");

  if (versionArg) {
    process.stdout.write(`${VERIFY_LOOP_VERSION}\n`);
    process.exit(0);
  }

  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(
      "Usage: bun tools/verify-loop.ts [options]\n\n" +
        "Options:\n" +
        "  --type, -t <type>         Work type: tool, plugin, doc, or auto (default: auto)\n" +
        "  --spec <path>             Optional semantic gate using acceptance criteria from spec.md/plan.md\n" +
        "  --checkpoint-name, -c <name>  Create checkpoint with this name if all checks pass\n" +
        "  --effort, -e <level>      Effort level: f1, f2, or f3 (for Crimson Seal)\n" +
        "  --guillotine-passed, -g   Confirm Guillotine review done (required for f2/f3 completion)\n" +
        "  --skip-console-logging, -s   Skip console logging check (for non-opencode repos)\n" +
        "  --skip-circuit-breaker    Ignore persisted failure state and force execution\n" +
        "  --dry-run, -d             Simulate gate outcomes from file analysis (no command execution)\n" +
        "  --version, -v             Print verify-loop version and exit\n" +
        "  --help, -h                Show this help message\n\n" +
        "Examples:\n" +
        "  bun tools/verify-loop.ts --version\n" +
        "  bun tools/verify-loop.ts --type auto\n" +
        "  bun tools/verify-loop.ts --type auto --spec ./docs/plan.md\n" +
        "  bun tools/verify-loop.ts --type tool --checkpoint-name 'my-checkpoint'\n" +
        "  bun tools/verify-loop.ts --type plugin --effort f2\n" +
        "  bun tools/verify-loop.ts --effort f2 --guillotine-passed  # after Guillotine review\n" +
        "  bun tools/verify-loop.ts --skip-console-logging # for other repos\n" +
        "  bun tools/verify-loop.ts --type auto --dry-run\n",
    );
    process.exit(0);
  }

  try {
    const result = await executeVerification({
      type: typeArg as WorkType,
      checkpointName: checkpointNameArg,
      spec: specArg,
      effort: effortArg as "f1" | "f2" | "f3" | undefined,
      skipConsoleLogging: skipConsoleLoggingArg,
      skipCircuitBreaker: skipCircuitBreakerArg,
      guillotinePassed: guillotinePassedArg,
      dryRun: dryRunArg,
    });

    const report = await renderVerificationReport(result, {
      spec: specArg,
      effort: effortArg as "f1" | "f2" | "f3" | undefined,
      guillotinePassed: guillotinePassedArg,
      checkpointName: checkpointNameArg,
    });
    process.stdout.write(`${report}\n`);
    if (!dryRunArg) {
      try {
        const outcomesPath = join(
          process.cwd(),
          ".opencode",
          "verify-outcomes.jsonl",
        );
        mkdirSync(dirname(outcomesPath), { recursive: true });
        const outcome = {
          ts: Date.now(),
          checkpointName: checkpointNameArg ?? undefined,
          effort: effortArg ?? undefined,
          gates_passed: result.checks
            .filter((c) => c.passed)
            .map((c) => c.name),
          gates_failed: result.failed_checks,
          all_passed: result.success,
        };
        appendFileSync(outcomesPath, `${JSON.stringify(outcome)}\n`, "utf8");
      } catch {
        // silent persistence failure; never affect CLI exit behavior
      }
    }
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    process.stderr.write(
      `[X] Error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}
