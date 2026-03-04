import { tool } from "@opencode-ai/plugin";

import { Database } from "bun:sqlite";

import { existsSync } from "node:fs";

import { deriveProjectIdSync } from "./project-id";

// F-05 fix: sanitize episodic memory output before injecting into agent context
function sanitizeForPrompt(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // strip markdown links
    .replace(/[*_`#]/g, "") // strip markdown formatting
    .replace(/[\x00-\x1F\x7F]/g, "") // strip control characters
    .replace(/^(system|assistant|user|instruction):/i, ":$1") // neutralize prompt injection prefixes
    .slice(0, 4000); // cap length for tool output
}

// ============================================================================
// Types
// ============================================================================

type ArtifactType = "file" | "git_commit" | "url" | "pr" | "issue" | string;

export type EpisodicRecentEvent = {
  session_id?: string;
  task_id?: string;
  agent_id?: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  tool_output?: string;
  success?: boolean;
  duration_ms?: number;
  timestamp?: number;
  created_at?: string;
};

export type EpisodicRecentResponse = {
  success: boolean;
  events: EpisodicRecentEvent[];
  count: number;
  source: "sqlite";
  error?: string;
};

export type EpisodicArtifact = {
  type: string;
  path?: string;
  url?: string;
  git_commit?: string;
  created_at?: string;
  task_id?: string;
  session_id?: string;
  meta?: Record<string, unknown>;
};

export type EpisodicArtifactsResponse = {
  success: boolean;
  artifacts: EpisodicArtifact[];
  count: number;
  error?: string;
};

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DB_PATH = `${process.env.HOME ?? "/tmp"}/.local/share/opencode/opencode.db`;

// ============================================================================
// Utilities
// ============================================================================

function toIso(ms: number | undefined): string | undefined {
  if (!ms || !Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

function passesTypeFilter(
  type: string,
  allowed: string[] | null | undefined,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(type);
}

function uniqKey(context: {
  project_id?: string;
  session_id?: string;
  task_id?: string;
  type: ArtifactType;
  value: string;
}): string {
  return [
    context.type,
    context.value,
    context.project_id ?? "",
    context.session_id ?? "",
    context.task_id ?? "",
  ].join("::");
}

function extractFilesFromPatchText(patchText: string): string[] {
  const out: string[] = [];
  // OpenCode patch format headers:
  // *** Add File: path
  // *** Update File: path
  // *** Delete File: path
  const re = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm;
  for (const match of Array.from(patchText.matchAll(re))) {
    const p = match[1]?.trim();
    if (p) out.push(p);
  }
  return out;
}

function firstCommitHashFromGitCommitOutput(out: string): string | null {
  // Typical output: "[branch abc1234] message" or a full hash sometimes.
  const m = out.match(/\[[^\]]+\s+([0-9a-f]{7,40})\]|\b([0-9a-f]{7,40})\b/i);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

function extractUrls(text: string): string[] {
  const urls = new Set<string>();
  const re = /https?:\/\/[^\s)\]}>\"']+/g;
  for (const m of Array.from(text.matchAll(re))) {
    urls.add(m[0]);
  }
  return Array.from(urls);
}

function toShimArtifact(row: {
  type: string;
  value: string;
  created_at?: string;
  task_id?: string;
  session_id?: string;
  meta?: Record<string, unknown>;
}): EpisodicArtifact {
  if (row.type === "file") {
    return {
      type: row.type,
      path: row.value,
      created_at: row.created_at,
      task_id: row.task_id,
      session_id: row.session_id,
      meta: row.meta,
    };
  }

  if (row.type === "git_commit") {
    return {
      type: row.type,
      git_commit: row.value,
      created_at: row.created_at,
      task_id: row.task_id,
      session_id: row.session_id,
      meta: row.meta,
    };
  }

  if (row.type === "url") {
    return {
      type: row.type,
      url: row.value,
      created_at: row.created_at,
      task_id: row.task_id,
      session_id: row.session_id,
      meta: row.meta,
    };
  }

  // Fallback: expose raw value via meta only.
  return {
    type: row.type,
    created_at: row.created_at,
    task_id: row.task_id,
    session_id: row.session_id,
    meta: { ...row.meta, value: row.value },
  };
}

function parseJson<T>(input: string | null): T | null {
  if (!input) return null;
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeStringify(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getDbPath(): string {
  return process.env.OPENCODE_DB_PATH ?? DEFAULT_DB_PATH;
}

function formatDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/SQLITE_BUSY|database is locked/i.test(message)) {
    return "SQLite database is locked (SQLITE_BUSY). Close other OpenCode instances and retry.";
  }
  return message;
}

function clampLimit(limit: number | undefined, max: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return 50;
  return Math.min(Math.max(limit, 1), max);
}

type ToolPartRow = {
  part_id: string;
  message_id: string | null;
  session_id: string | null;
  time_created: number | null;
  part_data: string | null;
  message_data: string | null;
};

type ToolPartData = {
  type?: string;
  tool?: string;
  state?: {
    status?: unknown;
    input?: unknown;
    output?: unknown;
    time?: { start?: number; end?: number };
  };
};

type ToolPartQueryArgs = {
  session_id?: string;
  task_id?: string;
  agent_id?: string;
  tool_names?: string[];
  limit: number;
};

function buildToolPartsQuery(
  args: ToolPartQueryArgs,
  order: "ASC" | "DESC" = "DESC",
): {
  sql: string;
  params: Array<string | number>;
} {
  const where: string[] = ["json_extract(part.data, '$.type') = 'tool'"];
  const params: Array<string | number> = [];

  const projectId = deriveProjectIdSync();
  where.push("session.project_id = ?");
  params.push(projectId);

  if (args.session_id) {
    where.push("part.session_id = ?");
    params.push(args.session_id);
  }

  if (args.task_id) {
    where.push("json_extract(part.data, '$.state.input.task_id') = ?");
    params.push(args.task_id);
  }

  if (args.agent_id) {
    where.push("json_extract(part.data, '$.state.input.agent_id') = ?");
    params.push(args.agent_id);
  }

  if (args.tool_names && args.tool_names.length > 0) {
    const placeholders = args.tool_names.map(() => "?").join(", ");
    where.push(`json_extract(part.data, '$.tool') IN (${placeholders})`);
    params.push(...args.tool_names);
  }

  const sql = `
    SELECT
      part.id AS part_id,
      part.message_id AS message_id,
      part.session_id AS session_id,
      part.time_created AS time_created,
      part.data AS part_data,
      message.data AS message_data
    FROM part
    LEFT JOIN message ON message.id = part.message_id
    LEFT JOIN session ON session.id = part.session_id
    WHERE ${where.join(" AND ")}
    ORDER BY part.time_created ${order}
    LIMIT ?
  `;

  params.push(args.limit ?? 50);
  return { sql, params };
}

function parseStatus(status: unknown): boolean | undefined {
  if (typeof status === "boolean") return status;
  if (typeof status === "string") {
    const normalized = status.toLowerCase();
    if (["success", "completed", "ok"].includes(normalized)) return true;
    if (
      ["failed", "error", "rejected", "canceled", "cancelled"].includes(
        normalized,
      )
    )
      return false;
  }
  return undefined;
}

// ============================================================================
// Mode: recent (get recent tool execution events)
// ============================================================================

async function executeRecent(args: {
  session_id?: string;
  task_id?: string;
  agent_id?: string;
  tool_names?: string[];
  limit: number;
}): Promise<string> {
  const dbPath = getDbPath();
  const limit = clampLimit(args.limit, 500);

  try {
    if (!existsSync(dbPath)) {
      throw new Error(`SQLite database not found at ${dbPath}`);
    }

    let db: Database | null = null;
    try {
      db = new Database(dbPath, { readonly: true });
      const events: EpisodicRecentEvent[] = [];

      const { sql, params } = buildToolPartsQuery({
        session_id: args.session_id,
        task_id: args.task_id,
        agent_id: args.agent_id,
        tool_names: args.tool_names,
        limit,
      });

      const rows = db.query(sql).all(...params) as ToolPartRow[];

      for (const row of rows) {
        const partData = parseJson<ToolPartData>(row.part_data);
        if (!partData || partData.type !== "tool") continue;

        const state = partData.state ?? {};
        const toolName =
          typeof partData.tool === "string" ? partData.tool : undefined;
        const toolArgs = isRecord(state.input) ? state.input : undefined;
        const toolOutput = sanitizeForPrompt(safeStringify(state.output));
        const status = parseStatus(state.status);

        const start =
          typeof state.time?.start === "number" ? state.time.start : undefined;
        const end =
          typeof state.time?.end === "number" ? state.time.end : undefined;
        const timestamp = end ?? start ?? row.time_created ?? undefined;
        const duration =
          typeof start === "number" && typeof end === "number" && end >= start
            ? end - start
            : undefined;

        const taskId =
          toolArgs && typeof toolArgs.task_id === "string"
            ? toolArgs.task_id
            : undefined;
        const agentId =
          toolArgs && typeof toolArgs.agent_id === "string"
            ? toolArgs.agent_id
            : undefined;

        events.push({
          session_id: row.session_id ?? undefined,
          task_id: taskId,
          agent_id: agentId,
          tool_name: toolName,
          tool_args: toolArgs,
          tool_output: toolOutput
            ? `[episodic — unverified] ${toolOutput}`
            : undefined,
          success: status,
          duration_ms: duration,
          timestamp,
          created_at: toIso(timestamp),
        });
      }

      return JSON.stringify({
        success: true,
        events,
        count: events.length,
        source: "sqlite",
      } satisfies EpisodicRecentResponse);
    } finally {
      db?.close();
    }
  } catch (error) {
    return JSON.stringify({
      success: false,
      events: [],
      count: 0,
      source: "sqlite",
      error: formatDbError(error),
    } satisfies EpisodicRecentResponse);
  }
}

// ============================================================================
// Mode: artifacts (get episodic artifacts by scanning JSONL)
// ============================================================================

async function executeArtifacts(args: {
  task_id?: string;
  session_id?: string;
  artifact_types?: string[];
  limit: number;
}): Promise<string> {
  const dbPath = getDbPath();
  const projectId = deriveProjectIdSync();
  const artifactTypes = args.artifact_types ?? null;
  const limit = clampLimit(args.limit, 500);

  try {
    if (!existsSync(dbPath)) {
      throw new Error(`SQLite database not found at ${dbPath}`);
    }

    let db: Database | null = null;
    try {
      db = new Database(dbPath, { readonly: true });
      const dedupe = new Set<string>();
      const rows: Array<{
        type: string;
        value: string;
        created_at?: string;
        task_id?: string;
        session_id?: string;
        meta?: Record<string, unknown>;
        created_ms?: number;
      }> = [];

      // Scan 5x requested limit (heuristic) to compensate for filtering.
      const scanLimit = Math.min(Math.max(limit * 5, limit), 1000);
      const { sql, params } = buildToolPartsQuery({
        session_id: args.session_id,
        task_id: args.task_id,
        limit: scanLimit,
      });

      const toolRows = db.query(sql).all(...params) as ToolPartRow[];

      for (const row of toolRows) {
        const partData = parseJson<ToolPartData>(row.part_data);
        if (!partData || partData.type !== "tool") continue;

        const state = partData.state ?? {};
        const toolName = typeof partData.tool === "string" ? partData.tool : "";
        const toolArgs = isRecord(state.input) ? state.input : {};
        const toolOut = safeStringify(state.output) ?? "";

        const start =
          typeof state.time?.start === "number" ? state.time.start : undefined;
        const end =
          typeof state.time?.end === "number" ? state.time.end : undefined;
        const timestamp = end ?? start ?? row.time_created ?? undefined;
        const createdAt = toIso(timestamp);
        const createdMs = timestamp ?? undefined;

        const taskId =
          typeof toolArgs.task_id === "string" ? toolArgs.task_id : undefined;
        const agentId =
          typeof toolArgs.agent_id === "string" ? toolArgs.agent_id : undefined;

        const commonMeta: Record<string, unknown> = {
          source_tool_name: toolName,
          source_agent_id: agentId,
        };

        // FILE artifacts
        if (passesTypeFilter("file", artifactTypes)) {
          if (toolName === "write" || toolName === "edit") {
            const fp =
              toolArgs["filePath"] ??
              toolArgs["relative_path"] ??
              toolArgs["path"];
            if (typeof fp === "string" && fp.trim()) {
              const key = uniqKey({
                project_id: projectId,
                session_id: row.session_id ?? undefined,
                task_id: taskId,
                type: "file",
                value: fp,
              });
              if (!dedupe.has(key)) {
                dedupe.add(key);
                rows.push({
                  type: "file",
                  value: fp,
                  created_at: createdAt,
                  created_ms: createdMs,
                  task_id: taskId,
                  session_id: row.session_id ?? undefined,
                  meta: commonMeta,
                });
              }
            }
          }

          if (toolName === "apply_patch") {
            const patchText = toolArgs["patchText"];
            if (typeof patchText === "string") {
              for (const fp of extractFilesFromPatchText(patchText)) {
                const key = uniqKey({
                  project_id: projectId,
                  session_id: row.session_id ?? undefined,
                  task_id: taskId,
                  type: "file",
                  value: fp,
                });
                if (dedupe.has(key)) continue;
                dedupe.add(key);
                rows.push({
                  type: "file",
                  value: fp,
                  created_at: createdAt,
                  created_ms: createdMs,
                  task_id: taskId,
                  session_id: row.session_id ?? undefined,
                  meta: { ...commonMeta, source: "apply_patch" },
                });
              }
            }
          }
        }

        // GIT COMMIT artifacts
        if (passesTypeFilter("git_commit", artifactTypes)) {
          if (toolName === "bash") {
            const cmd =
              typeof toolArgs["command"] === "string"
                ? toolArgs["command"]
                : "";
            if (cmd.includes("git commit")) {
              const commit = firstCommitHashFromGitCommitOutput(toolOut);
              if (commit) {
                const key = uniqKey({
                  project_id: projectId,
                  session_id: row.session_id ?? undefined,
                  task_id: taskId,
                  type: "git_commit",
                  value: commit,
                });
                if (!dedupe.has(key)) {
                  dedupe.add(key);
                  rows.push({
                    type: "git_commit",
                    value: commit,
                    created_at: createdAt,
                    created_ms: createdMs,
                    task_id: taskId,
                    session_id: row.session_id ?? undefined,
                    meta: { ...commonMeta, command: cmd },
                  });
                }
              }
            }
          }
        }

        // URL artifacts
        if (passesTypeFilter("url", artifactTypes)) {
          const urls = extractUrls(toolOut);
          for (const u of Array.from(urls)) {
            const key = uniqKey({
              project_id: projectId,
              session_id: row.session_id ?? undefined,
              task_id: taskId,
              type: "url",
              value: u,
            });
            if (dedupe.has(key)) continue;
            dedupe.add(key);
            rows.push({
              type: "url",
              value: u,
              created_at: createdAt,
              created_ms: createdMs,
              task_id: taskId,
              session_id: row.session_id ?? undefined,
              meta: commonMeta,
            });
          }
        }
      }

      // Prefer newest artifacts first.
      rows.sort((a, b) => (b.created_ms ?? 0) - (a.created_ms ?? 0));
      const artifacts = rows.slice(0, limit).map((r) => toShimArtifact(r));

      return JSON.stringify({
        success: true,
        artifacts,
        count: artifacts.length,
      } satisfies EpisodicArtifactsResponse);
    } finally {
      db?.close();
    }
  } catch (error) {
    return JSON.stringify({
      success: false,
      artifacts: [],
      count: 0,
      error: formatDbError(error),
    } satisfies EpisodicArtifactsResponse);
  }
}

// ============================================================================
// Tool Definition
// ============================================================================

// ============================================================================
// Mode: causal-chain (chronological tool-event timeline for a session/task)
// ============================================================================

type CausalChainEvent = {
  seq: number;
  timestamp: string | undefined;
  tool: string | undefined;
  status: "success" | "failure" | "unknown";
  summary: string;
};

type CausalChainResponse = {
  success: boolean;
  timeline: CausalChainEvent[];
  count: number;
  error?: string;
};

async function executeCausalChain(args: {
  session_id?: string;
  task_id?: string;
  agent_id?: string;
  tool_names?: string[];
  limit: number;
}): Promise<string> {
  const dbPath = getDbPath();
  const limit = clampLimit(args.limit, 500);

  try {
    if (!existsSync(dbPath)) {
      throw new Error(`SQLite database not found at ${dbPath}`);
    }

    let db: Database | null = null;
    try {
      db = new Database(dbPath, { readonly: true });

      const { sql, params } = buildToolPartsQuery(
        {
          session_id: args.session_id,
          task_id: args.task_id,
          agent_id: args.agent_id,
          tool_names: args.tool_names,
          limit,
        },
        "ASC",
      );

      const rows = db.query(sql).all(...params) as ToolPartRow[];
      const timeline: CausalChainEvent[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const partData = parseJson<ToolPartData>(row.part_data);
        if (!partData || partData.type !== "tool") continue;

        const state = partData.state ?? {};
        const toolName =
          typeof partData.tool === "string" ? partData.tool : undefined;
        const toolArgs = isRecord(state.input) ? state.input : {};
        const rawStatus = parseStatus(state.status);
        const status: CausalChainEvent["status"] =
          rawStatus === true
            ? "success"
            : rawStatus === false
              ? "failure"
              : "unknown";

        const start =
          typeof state.time?.start === "number" ? state.time.start : undefined;
        const end =
          typeof state.time?.end === "number" ? state.time.end : undefined;
        const timestamp = toIso(end ?? start ?? row.time_created ?? undefined);

        // Build a compact human-readable summary of the call.
        const argSnippets: string[] = [];
        for (const [k, v] of Object.entries(toolArgs)) {
          if (k === "task_id" || k === "agent_id") continue;
          const str = safeStringify(v) ?? "";
          argSnippets.push(`${k}=${str.slice(0, 60)}`);
          if (argSnippets.length >= 3) break;
        }
        const argsStr = argSnippets.length ? `(${argSnippets.join(", ")})` : "";
        const outputSnippet = sanitizeForPrompt(
          safeStringify(state.output),
        ).slice(0, 120);
        const summary = [
          toolName ? `${toolName}${argsStr}` : "(unknown tool)",
          status !== "unknown" ? `→ ${status}` : "",
          outputSnippet ? `| ${outputSnippet}` : "",
        ]
          .filter(Boolean)
          .join(" ");

        timeline.push({
          seq: i + 1,
          timestamp,
          tool: toolName,
          status,
          summary,
        });
      }

      return JSON.stringify({
        success: true,
        timeline,
        count: timeline.length,
      } satisfies CausalChainResponse);
    } finally {
      db?.close();
    }
  } catch (error) {
    return JSON.stringify({
      success: false,
      timeline: [],
      count: 0,
      error: formatDbError(error),
    } satisfies CausalChainResponse);
  }
}

// ============================================================================
// Tool Definition
// ============================================================================

export default tool({
  description:
    "Query episodic memory for recent tool events or artifacts. Use --mode recent for tool execution history, --mode artifacts for files/commits/URLs/PRs/issues, --mode causal-chain for chronological cause-effect timelines.",
  args: {
    mode: tool.schema
      .enum(["recent", "artifacts", "causal-chain"])
      .describe(
        "Query mode: 'recent' for tool events, 'artifacts' for files/commits/URLs, 'causal-chain' for chronological timeline",
      ),

    // Shared filters
    session_id: tool.schema
      .string()
      .optional()
      .describe("Filter by session ID"),
    task_id: tool.schema.string().optional().describe("Filter by task ID"),
    limit: tool.schema
      .number()
      .optional()
      .default(50)
      .describe("Maximum number of results"),

    // Mode: recent filters
    agent_id: tool.schema
      .string()
      .optional()
      .describe("[recent mode] Filter by agent ID"),
    tool_names: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "[recent mode] Filter by tool names (e.g., ['bash', 'write', 'edit'])",
      ),

    // Mode: artifacts filters
    artifact_types: tool.schema
      .array(tool.schema.string())
      .optional()
      .describe(
        "[artifacts mode] Filter by artifact types (file, git_commit, url, pr, issue)",
      ),
  },
  async execute(args): Promise<string> {
    const mode = args.mode ?? "recent";

    if (mode === "recent") {
      return executeRecent({
        session_id: args.session_id,
        task_id: args.task_id,
        agent_id: args.agent_id,
        tool_names: args.tool_names,
        limit: args.limit ?? 50,
      });
    }

    if (mode === "artifacts") {
      return executeArtifacts({
        session_id: args.session_id,
        task_id: args.task_id,
        artifact_types: args.artifact_types,
        limit: args.limit ?? 50,
      });
    }

    if (mode === "causal-chain") {
      return executeCausalChain({
        session_id: args.session_id,
        task_id: args.task_id,
        agent_id: args.agent_id,
        tool_names: args.tool_names,
        limit: args.limit ?? 50,
      });
    }

    return JSON.stringify({
      success: false,
      error: `Unknown mode: ${mode}. Use 'recent', 'artifacts', or 'causal-chain'.`,
    });
  },
});
