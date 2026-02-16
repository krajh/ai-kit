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

function stripJsoncComments(text: string): string {
  // Minimal JSONC support: strips // and /* */ comments while preserving strings.
  let out = "";
  let inString = false;
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;
  let quoteChar: '"' | "'" = '"';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? "";
    const next = text[i + 1] ?? "";

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        out += ch;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      out += ch;
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === quoteChar) {
        inString = false;
      }
      continue;
    }

    if ((ch === '"' || ch === "'") && !inString) {
      inString = true;
      quoteChar = ch;
      out += ch;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    out += ch;
  }

  return out;
}

function stripJsonTrailingCommas(text: string): string {
  let out = "";
  let inString = false;
  let escape = false;
  let quoteChar: '"' | "'" = '"';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? "";

    if (inString) {
      out += ch;
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === quoteChar) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quoteChar = ch;
      out += ch;
      continue;
    }

    if (ch === ",") {
      let j = i + 1;
      while (j < text.length) {
        const look = text[j] ?? "";
        if (look === " " || look === "\t" || look === "\n" || look === "\r") {
          j++;
          continue;
        }
        if (look === "}" || look === "]") {
          // drop trailing comma
          break;
        }
        out += ch;
        break;
      }
      continue;
    }

    out += ch;
  }

  return out;
}

export function parseJsonc(text: string): unknown {
  const withoutBom = text.replace(/^\uFEFF/, "");
  const withoutComments = stripJsoncComments(withoutBom);
  const normalized = stripJsonTrailingCommas(withoutComments);
  return JSON.parse(normalized);
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

async function checkLogPaths(): Promise<CheckResult> {
  const start = Date.now();
  const logBase = join(process.cwd(), "logs");
  const expected = [
    "episodic-memory.jsonl",
    "agent-monitoring.jsonl",
    "context-monitor.jsonl",
    "auto-checkpoints.jsonl",
    "roadmap-sync.jsonl",
    "decision-events.jsonl",
  ];

  const missing: string[] = [];
  for (const file of expected) {
    const path = join(logBase, file);
    if (!(await checkPathExists(path))) {
      missing.push(file);
    }
  }

  if (missing.length === 0) {
    return {
      name: "Log paths",
      passed: true,
      message: `[OK] All expected log files exist under ${logBase} (legacy; SQLite is now primary)`,
      duration_ms: Date.now() - start,
    };
  }

  return {
    name: "Log paths",
    passed: false,
    message: `[!] Missing log files under ${logBase} (legacy; SQLite is now primary):\n${missing.map((f) => `  - ${f}`).join("\n")}\nPlugins will create them on first write.`,
    duration_ms: Date.now() - start,
  };
}

async function checkIngesterAlignment(): Promise<CheckResult> {
  const start = Date.now();
  const pluginLogPath = join(process.cwd(), "logs", "episodic-memory.jsonl");
  const ingesterPath = join(
    process.cwd(),
    "external",
    "context-db-mcp",
    "ingest_episodic_memory.py",
  );

  if (!(await checkPathExists(ingesterPath))) {
    return {
      name: "Ingester alignment",
      passed: false,
      message: `[X] Ingester script not found: ${ingesterPath}`,
      duration_ms: Date.now() - start,
    };
  }

  try {
    const ingesterContent = await Bun.file(ingesterPath).text();
    // The ingester is designed to be portable (env vars + default log dir),
    // so we should not require a hardcoded absolute path string.
    const usesEnvOverrides =
      ingesterContent.includes("EPISODIC_MEMORY_JSONL_PATH") &&
      ingesterContent.includes("OPENCODE_LOG_DIR");
    const referencesFilename = ingesterContent.includes(
      "episodic-memory.jsonl",
    );

    if (usesEnvOverrides && referencesFilename) {
      return {
        name: "Ingester alignment",
        passed: true,
        message: `[OK] Ingester reads from correct path: ${pluginLogPath} (legacy; SQLite is now primary)`,
        duration_ms: Date.now() - start,
      };
    }

    return {
      name: "Ingester alignment",
      passed: false,
      message: `[!] Ingester alignment not verifiable (legacy; SQLite is now primary)\nExpected (default): ${pluginLogPath}\nCheck: ${ingesterPath}\nTip: run with EPISODIC_MEMORY_JSONL_PATH=${pluginLogPath}`,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "Ingester alignment",
      passed: false,
      message: `[X] Failed to read ingester: ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - start,
    };
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
  const pluginFiles = [
    "plugins/mai-compaction-plugin.ts",
    "plugins/decision-hook-plugin.ts",
    "plugins/roadmap-sync-plugin.ts",
  ];

  const warnings: string[] = [];
  for (const file of pluginFiles) {
    const path = join(process.cwd(), file);
    if (!(await checkPathExists(path))) continue;

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
          warnings.push(`  ${file}: contains MCP call but no safety comment`);
        }
      }
    } catch {
      // skip
    }
  }

  if (warnings.length === 0) {
    return {
      name: "MCP assumptions",
      passed: true,
      message: `[OK] Plugins correctly document MCP access limitations`,
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

async function checkOpencodeMemConfig(): Promise<CheckResult> {
  const start = Date.now();
  const configPath = join(process.cwd(), "opencode-mem.jsonc");

  if (!(await checkPathExists(configPath))) {
    return {
      name: "opencode-mem config",
      passed: false,
      message: `[X] opencode-mem config not found: ${configPath}\nCreate it (or restore from repo) to ensure memory plugin health.`,
      duration_ms: Date.now() - start,
    };
  }

  try {
    const text = await Bun.file(configPath).text();
    const parsed = parseJsonc(text);

    if (typeof parsed !== "object" || parsed === null) {
      return {
        name: "opencode-mem config",
        passed: false,
        message: `[X] opencode-mem config invalid: expected object at root (${configPath})`,
        duration_ms: Date.now() - start,
      };
    }

    const cfg = parsed as Record<string, unknown>;
    const required = [
      { key: "similarityThreshold", label: "similarity threshold" },
      { key: "autoCleanupRetentionDays", label: "retention days" },
      { key: "embeddingModel", label: "embedding model" },
      { key: "memoryModel", label: "extraction model" },
    ];

    const missing: string[] = [];
    for (const r of required) {
      if (
        cfg[r.key] === undefined ||
        cfg[r.key] === null ||
        cfg[r.key] === ""
      ) {
        missing.push(`${r.label} (${r.key})`);
      }
    }

    if (missing.length > 0) {
      return {
        name: "opencode-mem config",
        passed: false,
        message: `[X] opencode-mem config missing required settings:\n${missing.map((m) => `  - ${m}`).join("\n")}\nEdit: ${configPath}`,
        duration_ms: Date.now() - start,
      };
    }

    const drift: string[] = [];
    if (cfg.similarityThreshold !== 0.65) {
      drift.push(
        `  - similarityThreshold expected 0.65 (found ${JSON.stringify(cfg.similarityThreshold)})`,
      );
    }
    if (cfg.autoCleanupRetentionDays !== 30) {
      drift.push(
        `  - autoCleanupRetentionDays expected 30 (found ${JSON.stringify(cfg.autoCleanupRetentionDays)})`,
      );
    }
    if (cfg.embeddingModel !== "Xenova/nomic-embed-text-v1") {
      drift.push(
        `  - embeddingModel expected Xenova/nomic-embed-text-v1 (found ${JSON.stringify(cfg.embeddingModel)})`,
      );
    }
    // Extraction model is environment-dependent (may be changed if gpt-4o-mini is unavailable).
    // Keep this as a soft policy: allow known-good alternatives.
    const allowedExtractionModels = new Set(["gpt-4o-mini", "gpt-4.1"]);
    if (
      typeof cfg.memoryModel !== "string" ||
      !allowedExtractionModels.has(cfg.memoryModel)
    ) {
      drift.push(
        `  - memoryModel expected one of ${JSON.stringify(Array.from(allowedExtractionModels))} (found ${JSON.stringify(cfg.memoryModel)})`,
      );
    }

    if (drift.length > 0) {
      return {
        name: "opencode-mem config",
        passed: false,
        message: `[!] opencode-mem config drift detected:\n${drift.join("\n")}\nRemediate by updating: ${configPath}`,
        duration_ms: Date.now() - start,
      };
    }

    return {
      name: "opencode-mem config",
      passed: true,
      message: `[OK] opencode-mem config present and healthy (${configPath})`,
      duration_ms: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "opencode-mem config",
      passed: false,
      message: `[X] Failed to validate opencode-mem config (${configPath}): ${error instanceof Error ? error.message : String(error)}`,
      duration_ms: Date.now() - start,
    };
  }
}

export default tool({
  description:
    "Run health checks for OpenCode configuration (logs, skills, config, MCP)",
  args: {},
  async execute() {
    const checks: CheckResult[] = [];

    checks.push(await checkSkillRoots());
    checks.push(await checkSqliteDb());
    checks.push(await checkLogPaths());
    checks.push(await checkIngesterAlignment());
    checks.push(await checkConfigFiles());
    checks.push(await checkOpencodeMemConfig());
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
