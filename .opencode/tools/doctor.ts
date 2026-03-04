import { tool } from "@opencode-ai/plugin";
import { Database } from "bun:sqlite";

import { stat } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_SKILL_DIRS = [
  ".opencode/skills",
  join(process.env.HOME ?? "", ".config/opencode/skills"),
];

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  duration_ms: number;
}

async function checkPathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function checkSkillRoots(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const missing: string[] = [];
    for (const dir of DEFAULT_SKILL_DIRS) {
      if (!(await checkPathExists(dir))) {
        missing.push(dir);
      }
    }

    if (missing.length === 0) {
      return {
        name: "Skill roots",
        passed: true,
        message: `[OK] All skill directories exist (${DEFAULT_SKILL_DIRS.length} configured)`,
        duration_ms: Date.now() - start,
      };
    }

    return {
      name: "Skill roots",
      passed: false,
      message: `[!] Missing skill directories:\n${missing.map((d) => `  - ${d}`).join("\n")}\nCreate them (OpenCode native skills: .opencode/skills/<name>/SKILL.md or ~/.config/opencode/skills/<name>/SKILL.md)`,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "Skill roots",
      passed: false,
      message: `[X] Failed to check skill roots: ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - start,
    };
  }
}

async function checkSqliteDb(): Promise<CheckResult> {
  const start = Date.now();
  const dbPath = join(
    process.env.HOME || "/",
    ".local",
    "share",
    "opencode",
    "opencode.db",
  );

  if (!(await checkPathExists(dbPath))) {
    return {
      name: "SQLite database",
      passed: false,
      message: `[X] SQLite database not found: ${dbPath}\nExpected at ~/.local/share/opencode/opencode.db`,
      duration_ms: Date.now() - start,
    };
  }

  let db: Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true });

    const tables = new Set(
      (
        db
          .query("SELECT name FROM sqlite_master WHERE type='table'")
          .all() as Array<{ name: string }>
      ).map((row) => row.name),
    );
    const expectedTables = ["message", "part", "session", "project", "todo"];
    const missingTables = expectedTables.filter((name) => !tables.has(name));

    if (missingTables.length > 0) {
      return {
        name: "SQLite database",
        passed: false,
        message: `[X] SQLite database missing tables:\n${missingTables.map((name) => `  - ${name}`).join("\n")}\nPath: ${dbPath}`,
        duration_ms: Date.now() - start,
      };
    }

    const schemaRow = db
      .query(
        "SELECT type FROM pragma_table_info('part') WHERE name='time_created'",
      )
      .get() as { type: string } | null;
    if (!schemaRow) {
      return {
        name: "SQLite database",
        passed: false,
        message: `[X] SQLite schema missing part.time_created column\nPath: ${dbPath}`,
        duration_ms: Date.now() - start,
      };
    }

    const maxTimeRow = db
      .query("SELECT MAX(time_created) as max_time FROM part")
      .get() as { max_time: number | null } | null;
    const maxTime = maxTimeRow?.max_time ?? null;
    const now = Date.now();
    const normalizedMaxTime =
      typeof maxTime === "number" && maxTime > 0
        ? maxTime < 1_000_000_000_000
          ? maxTime * 1000
          : maxTime
        : null;

    const messageCount =
      (
        db.query("SELECT COUNT(*) as count FROM message").get() as {
          count: number;
        } | null
      )?.count ?? 0;
    const partCount =
      (
        db.query("SELECT COUNT(*) as count FROM part").get() as {
          count: number;
        } | null
      )?.count ?? 0;
    const sessionCount =
      (
        db.query("SELECT COUNT(*) as count FROM session").get() as {
          count: number;
        } | null
      )?.count ?? 0;

    const recencyMs =
      normalizedMaxTime !== null ? now - normalizedMaxTime : null;
    const isStale = recencyMs !== null && recencyMs > 24 * 60 * 60 * 1000;
    const isSeverelyStale =
      recencyMs !== null && recencyMs > 7 * 24 * 60 * 60 * 1000;
    const recencyLine =
      normalizedMaxTime === null
        ? "  - Latest part timestamp: missing"
        : `  - Latest part timestamp: ${new Date(normalizedMaxTime).toISOString()}`;
    const counts = [
      `  - message rows: ${messageCount}`,
      `  - part rows: ${partCount}`,
      `  - session rows: ${sessionCount}`,
    ].join("\n");

    if (normalizedMaxTime === null) {
      return {
        name: "SQLite database",
        passed: false,
        message: `[X] SQLite database has no part records (empty or corrupted)\n${recencyLine}\n${counts}\nPath: ${dbPath}`,
        duration_ms: Date.now() - start,
      };
    }

    if (isSeverelyStale) {
      return {
        name: "SQLite database",
        passed: false,
        message: `[X] SQLite database severely stale (>7 days since last activity)\n${recencyLine}\n${counts}\nPath: ${dbPath}`,
        duration_ms: Date.now() - start,
      };
    }

    if (isStale) {
      return {
        name: "SQLite database",
        passed: false,
        message: `[!] SQLite database data looks stale (>24h since last activity)\n${recencyLine}\n${counts}\nPath: ${dbPath}`,
        duration_ms: Date.now() - start,
      };
    }

    return {
      name: "SQLite database",
      passed: true,
      message: `[OK] SQLite database readable and healthy\n${recencyLine}\n${counts}\nPath: ${dbPath}`,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "SQLite database",
      passed: false,
      message: `[X] Failed to open SQLite database (readonly): ${error instanceof Error ? error.message : String(error)}\nPath: ${dbPath}`,
      duration_ms: Date.now() - start,
    };
  } finally {
    db?.close();
  }
}

async function checkConfigFiles(): Promise<CheckResult> {
  const start = Date.now();
  const projectConfig = join(process.cwd(), "opencode.json");
  const userConfig = join(
    process.env.HOME || "/",
    ".config",
    "opencode",
    "opencode.json",
  );

  const results: string[] = [];
  let allValid = true;

  for (const [label, path] of [
    ["Project", projectConfig],
    ["User", userConfig],
  ]) {
    if (!(await checkPathExists(path))) {
      results.push(`  ${label}: not found (${path}) — will use defaults`);
      continue;
    }

    try {
      const text = await Bun.file(path).text();
      JSON.parse(text);
      results.push(`  ${label}: valid JSON (${path})`);
    } catch (error) {
      allValid = false;
      results.push(
        `  ${label}: [X] invalid JSON (${path})\n    ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    name: "Config files",
    passed: allValid,
    message: allValid
      ? `[OK] Config files valid or using defaults:\n${results.join("\n")}`
      : `[X] Config file errors:\n${results.join("\n")}`,
    duration_ms: Date.now() - start,
  };
}

async function checkMCPAssumptions(): Promise<CheckResult> {
  const start = Date.now();
  const pluginsDir = join(process.cwd(), "plugins");

  if (!(await checkPathExists(pluginsDir))) {
    return {
      name: "MCP assumptions",
      passed: true,
      message: `[OK] No plugins directory found — nothing to check`,
      duration_ms: Date.now() - start,
    };
  }

  let pluginFiles: string[] = [];
  try {
    const glob = new Bun.Glob("*.ts");
    for await (const file of glob.scan({ cwd: pluginsDir })) {
      pluginFiles.push(file);
    }
  } catch {
    return {
      name: "MCP assumptions",
      passed: true,
      message: `[OK] No plugin .ts files found`,
      duration_ms: Date.now() - start,
    };
  }

  const warnings: string[] = [];
  for (const file of pluginFiles) {
    const path = join(pluginsDir, file);
    try {
      const content = await Bun.file(path).text();
      if (
        content.includes("global.mcp") ||
        content.includes("(global as any).mcp")
      ) {
        const hasComment =
          content.includes("OpenCode plugins do not have access to MCP") ||
          content.includes("OpenCode plugins cannot call MCP");
        if (!hasComment) {
          warnings.push(
            `  plugins/${file}: contains MCP call but no safety comment`,
          );
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  if (warnings.length === 0) {
    return {
      name: "MCP assumptions",
      passed: true,
      message: `[OK] Plugins correctly document MCP access limitations (${pluginFiles.length} plugin(s) checked)`,
      duration_ms: Date.now() - start,
    };
  }

  return {
    name: "MCP assumptions",
    passed: false,
    message: `[!] Plugins may have undocumented MCP assumptions:\n${warnings.join("\n")}`,
    duration_ms: Date.now() - start,
  };
}

export default tool({
  description:
    "Run health checks for OpenCode configuration (skills, config, SQLite DB, MCP plugin safety)",
  args: {},
  async execute() {
    const checks: CheckResult[] = [];

    checks.push(await checkSkillRoots());
    checks.push(await checkSqliteDb());
    checks.push(await checkConfigFiles());
    checks.push(await checkMCPAssumptions());

    const allPassed = checks.every((c) => c.passed);
    const summary = allPassed
      ? "[OK] All health checks passed"
      : "[!] Some health checks failed or have warnings";

    const output = [
      summary,
      "",
      ...checks.map((c) => c.message),
      "",
      allPassed ? "[OK] doctor: healthy" : "[!] doctor: warnings present",
    ].join("\n");

    return output;
  },
});
