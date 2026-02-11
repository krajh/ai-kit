import { tool } from "@opencode-ai/plugin";

import { createReadStream } from "node:fs";
import * as readline from "node:readline";

import { deriveProjectIdSync } from "./project-id";

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
  source: "jsonl";
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

type JsonlToolEvent = {
  session_id?: string;
  agent_id?: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  tool_output?: string;
  success?: boolean;
  duration_ms?: number;
  task_id?: string;
  timestamp?: number;
  project_id?: string;
};

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LOG_PATH =
  "/home/kailashr/.config/opencode/logs/episodic-memory.jsonl";

// ============================================================================
// Utilities
// ============================================================================

function toIso(ms: number | undefined): string | undefined {
  if (!ms || !Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

function passesToolNameFilter(
  toolName: string | undefined,
  allowed: string[] | null | undefined,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(toolName ?? "");
}

function passesTypeFilter(
  type: string,
  allowed: string[] | null | undefined,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(type);
}

function uniqKey(
  event: JsonlToolEvent,
  type: ArtifactType,
  value: string,
): string {
  return [
    type,
    value,
    event.project_id ?? "",
    event.session_id ?? "",
    event.task_id ?? "",
  ].join("::");
}

function extractFilesFromPatchText(patchText: string): string[] {
  const out: string[] = [];
  // OpenCode patch format headers:
  // *** Add File: path
  // *** Update File: path
  // *** Delete File: path
  const re = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm;
  for (const match of patchText.matchAll(re)) {
    const p = match[1]?.trim();
    if (p) out.push(p);
  }
  return out;
}

function firstCommitHashFromGitCommitOutput(out: string): string | null {
  // Typical output: "[branch abc1234] message" or a full hash sometimes.
  const m = out.match(/\b[0-9a-f]{7,40}\b/i);
  return m ? m[0] : null;
}

function extractUrls(text: string): string[] {
  const urls = new Set<string>();
  const re = /https?:\/\/[^\s)\]}>\"']+/g;
  for (const m of text.matchAll(re)) {
    urls.add(m[0]);
  }
  return [...urls];
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

async function readJsonl(
  path: string,
  onLine: (line: string) => void | Promise<void>,
): Promise<void> {
  const stream = createReadStream(path, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    await onLine(line);
  }
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
  const logPath = process.env.OPENCODE_EPISODIC_LOG_PATH ?? DEFAULT_LOG_PATH;
  const projectId = deriveProjectIdSync();
  const toolNames = args.tool_names ?? null;
  const limit = args.limit ?? 50;

  try {
    const events: EpisodicRecentEvent[] = [];

    await readJsonl(logPath, (line) => {
      let ev: JsonlToolEvent | null = null;
      try {
        ev = JSON.parse(line) as JsonlToolEvent;
      } catch {
        // Gracefully skip malformed JSON lines
        return;
      }

      // Repo scoping: only return events written for this repo
      if (ev.project_id && ev.project_id !== projectId) return;

      // Apply filters
      if (args.session_id && ev.session_id !== args.session_id) return;
      if (args.task_id && ev.task_id !== args.task_id) return;
      if (args.agent_id && ev.agent_id !== args.agent_id) return;
      if (!passesToolNameFilter(ev.tool_name, toolNames)) return;

      const createdAt = toIso(ev.timestamp);

      events.push({
        session_id: ev.session_id,
        task_id: ev.task_id,
        agent_id: ev.agent_id,
        tool_name: ev.tool_name,
        tool_args: ev.tool_args,
        tool_output: ev.tool_output,
        success: ev.success,
        duration_ms: ev.duration_ms,
        timestamp: ev.timestamp,
        created_at: createdAt,
      });
    });

    // Sort by timestamp DESC (newest first)
    events.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

    // Apply limit
    const result = events.slice(0, limit);

    return JSON.stringify({
      success: true,
      events: result,
      count: result.length,
      source: "jsonl",
    } satisfies EpisodicRecentResponse);
  } catch (error) {
    return JSON.stringify({
      success: false,
      events: [],
      count: 0,
      source: "jsonl",
      error: error instanceof Error ? error.message : String(error),
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
  const logPath = process.env.OPENCODE_EPISODIC_LOG_PATH ?? DEFAULT_LOG_PATH;
  const projectId = deriveProjectIdSync();
  const artifactTypes = args.artifact_types ?? null;
  const limit = args.limit ?? 50;

  try {
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

    await readJsonl(logPath, (line) => {
      let ev: JsonlToolEvent | null = null;
      try {
        ev = JSON.parse(line) as JsonlToolEvent;
      } catch {
        return;
      }

      // Repo scoping: only return events written for this repo.
      if (ev.project_id && ev.project_id !== projectId) return;
      if (args.session_id && ev.session_id !== args.session_id) return;
      if (args.task_id && ev.task_id !== args.task_id) return;

      const createdAt = toIso(ev.timestamp);
      const commonMeta: Record<string, unknown> = {
        source_tool_name: ev.tool_name,
        source_agent_id: ev.agent_id,
      };

      const toolName = String(ev.tool_name ?? "");
      const toolArgs = ev.tool_args ?? {};
      const toolOut = typeof ev.tool_output === "string" ? ev.tool_output : "";

      // FILE artifacts
      if (passesTypeFilter("file", artifactTypes)) {
        if (toolName === "write" || toolName === "edit") {
          const fp =
            toolArgs["filePath"] ??
            toolArgs["relative_path"] ??
            toolArgs["path"];
          if (typeof fp === "string" && fp.trim()) {
            const key = uniqKey(ev, "file", fp);
            if (!dedupe.has(key)) {
              dedupe.add(key);
              rows.push({
                type: "file",
                value: fp,
                created_at: createdAt,
                created_ms: ev.timestamp,
                task_id: ev.task_id,
                session_id: ev.session_id,
                meta: commonMeta,
              });
            }
          }
        }

        if (toolName === "apply_patch") {
          const patchText = toolArgs["patchText"];
          if (typeof patchText === "string") {
            for (const fp of extractFilesFromPatchText(patchText)) {
              const key = uniqKey(ev, "file", fp);
              if (dedupe.has(key)) continue;
              dedupe.add(key);
              rows.push({
                type: "file",
                value: fp,
                created_at: createdAt,
                created_ms: ev.timestamp,
                task_id: ev.task_id,
                session_id: ev.session_id,
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
            typeof toolArgs["command"] === "string" ? toolArgs["command"] : "";
          if (cmd.includes("git commit")) {
            const commit = firstCommitHashFromGitCommitOutput(toolOut);
            if (commit) {
              const key = uniqKey(ev, "git_commit", commit);
              if (!dedupe.has(key)) {
                dedupe.add(key);
                rows.push({
                  type: "git_commit",
                  value: commit,
                  created_at: createdAt,
                  created_ms: ev.timestamp,
                  task_id: ev.task_id,
                  session_id: ev.session_id,
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
        for (const u of urls) {
          const key = uniqKey(ev, "url", u);
          if (dedupe.has(key)) continue;
          dedupe.add(key);
          rows.push({
            type: "url",
            value: u,
            created_at: createdAt,
            created_ms: ev.timestamp,
            task_id: ev.task_id,
            session_id: ev.session_id,
            meta: commonMeta,
          });
        }
      }
    });

    // Prefer newest artifacts first.
    rows.sort((a, b) => (b.created_ms ?? 0) - (a.created_ms ?? 0));
    const artifacts = rows.slice(0, limit).map((r) => toShimArtifact(r));

    return JSON.stringify({
      success: true,
      artifacts,
      count: artifacts.length,
    } satisfies EpisodicArtifactsResponse);
  } catch (error) {
    return JSON.stringify({
      success: false,
      artifacts: [],
      count: 0,
      error: error instanceof Error ? error.message : String(error),
    } satisfies EpisodicArtifactsResponse);
  }
}

// ============================================================================
// Tool Definition
// ============================================================================

export default tool({
  description:
    "Query episodic memory for recent tool events or artifacts. Use --mode recent for tool execution history, --mode artifacts for files/commits/URLs/PRs/issues.",
  args: {
    mode: tool.schema
      .enum(["recent", "artifacts"])
      .describe(
        "Query mode: 'recent' for tool events, 'artifacts' for files/commits/URLs",
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

    return JSON.stringify({
      success: false,
      error: `Unknown mode: ${mode}. Use 'recent' or 'artifacts'.`,
    });
  },
});
