import { tool } from "@opencode-ai/plugin";

import { Database } from "bun:sqlite";

import { existsSync } from "node:fs";

type Mode = "summary" | "tokens" | "tools" | "sessions";

type SessionRow = {
  id: string;
  project_id: string | null;
  title: string | null;
  directory: string | null;
  time_created: number | null;
};

type MessageRow = {
  session_id: string | null;
  time_created: number | null;
  data: string | null;
};

type PartRow = {
  session_id: string | null;
  time_created: number | null;
  data: string | null;
};

type MessageData = {
  model?: string;
  tokens?: {
    total?: number;
    input?: number;
    output?: number;
    reasoning?: number;
    cache?: { read?: number; write?: number };
  };
};

type ToolPartData = {
  type?: string;
  tool?: string;
  state?: {
    status?: unknown;
    time?: { start?: number; end?: number };
  };
};

const DEFAULT_DB_PATH = `${process.env.HOME ?? "/tmp"}/.local/share/opencode/opencode.db`;
const QUERY_LIMIT = 1000;

function resolveProjectId(db: Database): string | undefined {
  const cwd = process.cwd();
  const projects = db
    .query("SELECT id, worktree FROM project ORDER BY length(worktree) DESC")
    .all() as Array<{ id: string; worktree: string }>;
  for (const p of projects) {
    if (cwd === p.worktree || cwd.startsWith(p.worktree + "/")) {
      return p.id;
    }
  }
  return undefined;
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

function toIso(ms: number | undefined): string | undefined {
  if (!ms || !Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

function normalizeTimestamp(value: number | null): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < 1_000_000_000_000) return value * 1000;
  return value;
}

function parseJson<T>(input: string | null): T | null {
  if (!input) return null;
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function ratio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function formatPercent(value: number | null): string {
  if (value == null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatTable(
  headers: string[],
  rows: Array<Array<string | number>>,
): string {
  const headerRow = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${row.map((cell) => String(cell)).join(" | ")} |`)
    .join("\n");
  return [headerRow, divider, body].filter(Boolean).join("\n");
}

function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function getLastNDays(count: number): string[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

type LoadContext = {
  sessions: SessionRow[];
  messages: MessageRow[];
  parts: PartRow[];
};

function loadSessions(
  db: Database,
  args: {
    projectId?: string;
    lastNSessions: number;
  },
): SessionRow[] {
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (args.projectId) {
    where.push("project_id = ?");
    params.push(args.projectId);
  }

  const sql = `
    SELECT id, project_id, title, directory, time_created
    FROM session
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY time_created DESC
    LIMIT ?
  `;

  params.push(args.lastNSessions);
  return db.query(sql).all(...params) as SessionRow[];
}

function loadMessages(db: Database, sessionIds: string[]): MessageRow[] {
  const results: MessageRow[] = [];
  const chunks = chunk(sessionIds, 200);
  for (const ids of chunks) {
    let offset = 0;
    while (true) {
      const placeholders = ids.map(() => "?").join(", ");
      const sql = `
        SELECT session_id, time_created, data
        FROM message
        WHERE session_id IN (${placeholders})
        ORDER BY time_created DESC
        LIMIT ? OFFSET ?
      `;
      const rows = db
        .query(sql)
        .all(...ids, QUERY_LIMIT, offset) as MessageRow[];
      if (rows.length === 0) break;
      results.push(...rows);
      if (rows.length < QUERY_LIMIT) break;
      offset += QUERY_LIMIT;
    }
  }
  return results;
}

function loadParts(db: Database, sessionIds: string[]): PartRow[] {
  const results: PartRow[] = [];
  const chunks = chunk(sessionIds, 200);
  for (const ids of chunks) {
    let offset = 0;
    while (true) {
      const placeholders = ids.map(() => "?").join(", ");
      const sql = `
        SELECT session_id, time_created, data
        FROM part
        WHERE session_id IN (${placeholders})
        ORDER BY time_created DESC
        LIMIT ? OFFSET ?
      `;
      const rows = db.query(sql).all(...ids, QUERY_LIMIT, offset) as PartRow[];
      if (rows.length === 0) break;
      results.push(...rows);
      if (rows.length < QUERY_LIMIT) break;
      offset += QUERY_LIMIT;
    }
  }
  return results;
}

function loadContext(
  db: Database,
  args: {
    projectId?: string;
    lastNSessions: number;
    includeParts: boolean;
    includeMessages: boolean;
  },
): LoadContext {
  const sessions = loadSessions(db, args);
  const sessionIds = sessions.map((s) => s.id).filter(Boolean);
  const messages = args.includeMessages ? loadMessages(db, sessionIds) : [];
  const parts = args.includeParts ? loadParts(db, sessionIds) : [];
  return { sessions, messages, parts };
}

function summarizeTokens(messages: MessageRow[]) {
  const totals = {
    total: 0,
    input: 0,
    output: 0,
    reasoning: 0,
    cacheRead: 0,
    cacheWrite: 0,
  };

  const perModel = new Map<
    string,
    {
      total: number;
      input: number;
      output: number;
      reasoning: number;
      cacheRead: number;
      cacheWrite: number;
    }
  >();

  const perSession = new Map<
    string,
    {
      total: number;
      input: number;
      output: number;
      reasoning: number;
      cacheRead: number;
      cacheWrite: number;
    }
  >();

  for (const row of messages) {
    const parsed = parseJson<MessageData>(row.data);
    if (!parsed) continue;
    const model = parsed.model ?? "unknown";
    const tokens = parsed.tokens ?? {};
    const cache = tokens.cache ?? {};

    const total = numberOrZero(tokens.total);
    const input = numberOrZero(tokens.input);
    const output = numberOrZero(tokens.output);
    const reasoning = numberOrZero(tokens.reasoning);
    const cacheRead = numberOrZero(cache.read);
    const cacheWrite = numberOrZero(cache.write);

    totals.total += total;
    totals.input += input;
    totals.output += output;
    totals.reasoning += reasoning;
    totals.cacheRead += cacheRead;
    totals.cacheWrite += cacheWrite;

    const modelEntry = perModel.get(model) ?? {
      total: 0,
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
    };
    modelEntry.total += total;
    modelEntry.input += input;
    modelEntry.output += output;
    modelEntry.reasoning += reasoning;
    modelEntry.cacheRead += cacheRead;
    modelEntry.cacheWrite += cacheWrite;
    perModel.set(model, modelEntry);

    const sessionId = row.session_id ?? "unknown";
    const sessionEntry = perSession.get(sessionId) ?? {
      total: 0,
      input: 0,
      output: 0,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
    };
    sessionEntry.total += total;
    sessionEntry.input += input;
    sessionEntry.output += output;
    sessionEntry.reasoning += reasoning;
    sessionEntry.cacheRead += cacheRead;
    sessionEntry.cacheWrite += cacheWrite;
    perSession.set(sessionId, sessionEntry);
  }

  return { totals, perModel, perSession };
}

function summarizeTools(parts: PartRow[]) {
  const perTool = new Map<
    string,
    {
      calls: number;
      success: number;
      error: number;
      unknown: number;
      totalDurationMs: number;
      durationCount: number;
    }
  >();

  for (const row of parts) {
    const parsed = parseJson<ToolPartData>(row.data);
    if (!parsed || parsed.type !== "tool") continue;
    const toolName = parsed.tool ?? "unknown";
    const entry = perTool.get(toolName) ?? {
      calls: 0,
      success: 0,
      error: 0,
      unknown: 0,
      totalDurationMs: 0,
      durationCount: 0,
    };

    entry.calls += 1;
    const status = parseStatus(parsed.state?.status);
    if (status === true) entry.success += 1;
    else if (status === false) entry.error += 1;
    else entry.unknown += 1;

    const start = parsed.state?.time?.start;
    const end = parsed.state?.time?.end;
    if (
      typeof start === "number" &&
      typeof end === "number" &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      end >= start
    ) {
      entry.totalDurationMs += end - start;
      entry.durationCount += 1;
    }

    perTool.set(toolName, entry);
  }

  return perTool;
}

function summarizeSessions(sessions: SessionRow[]) {
  const timestamps = sessions
    .map((s) => normalizeTimestamp(s.time_created))
    .filter((v): v is number => typeof v === "number");

  const min = timestamps.length > 0 ? Math.min(...timestamps) : undefined;
  const max = timestamps.length > 0 ? Math.max(...timestamps) : undefined;

  const byDay = new Map<string, number>();
  for (const ts of timestamps) {
    const day = formatDay(ts);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  return { min, max, byDay };
}

function buildSummaryOutput(ctx: LoadContext): string {
  const { totals } = summarizeTokens(ctx.messages);
  const toolStats = summarizeTools(ctx.parts);
  const sessionStats = summarizeSessions(ctx.sessions);
  const toolCalls = [...toolStats.values()].reduce(
    (acc, it) => acc + it.calls,
    0,
  );

  const summaryRows = [
    ["Sessions", ctx.sessions.length],
    ["Messages", ctx.messages.length],
    ["Tool calls", toolCalls],
    ["Tokens (input)", totals.input],
    ["Tokens (output)", totals.output],
    ["Tokens (cache read)", totals.cacheRead],
    ["Tokens (cache write)", totals.cacheWrite],
  ];

  const rangeRows = [
    ["Start", toIso(sessionStats.min) ?? "-"],
    ["End", toIso(sessionStats.max) ?? "-"],
  ];

  return [
    "[OK] session-analytics summary",
    "",
    formatTable(["Metric", "Value"], summaryRows),
    "",
    formatTable(["Date range", "Value"], rangeRows),
  ].join("\n");
}

function buildTokensOutput(ctx: LoadContext): string {
  const { totals, perModel, perSession } = summarizeTokens(ctx.messages);
  const cacheRatio = ratio(
    totals.cacheRead,
    totals.cacheRead + totals.cacheWrite,
  );

  const modelRows = [...perModel.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([model, data]) => [
      model,
      data.total,
      data.input,
      data.output,
      data.reasoning,
      data.cacheRead,
      data.cacheWrite,
    ]);

  const sessionRows = [...perSession.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([sessionId, data]) => [
      sessionId,
      data.total,
      data.input,
      data.output,
      data.cacheRead,
      data.cacheWrite,
    ]);

  const summaryRows = [
    ["Total tokens", totals.total],
    ["Input", totals.input],
    ["Output", totals.output],
    ["Reasoning", totals.reasoning],
    ["Cache read", totals.cacheRead],
    ["Cache write", totals.cacheWrite],
    ["Cache hit ratio", formatPercent(cacheRatio)],
  ];

  return [
    "[OK] session-analytics tokens",
    "",
    formatTable(["Metric", "Value"], summaryRows),
    "",
    formatTable(
      [
        "Model",
        "Total",
        "Input",
        "Output",
        "Reasoning",
        "Cache read",
        "Cache write",
      ],
      modelRows.length > 0 ? modelRows : [["-", 0, 0, 0, 0, 0, 0]],
    ),
    "",
    formatTable(
      [
        "Session (top 10)",
        "Total",
        "Input",
        "Output",
        "Cache read",
        "Cache write",
      ],
      sessionRows.length > 0 ? sessionRows : [["-", 0, 0, 0, 0, 0]],
    ),
  ].join("\n");
}

function buildToolsOutput(ctx: LoadContext): string {
  const perTool = summarizeTools(ctx.parts);
  const rows = [...perTool.entries()]
    .sort((a, b) => b[1].calls - a[1].calls)
    .map(([toolName, data]) => {
      const successRate = ratio(data.success, data.success + data.error);
      const avgMs =
        data.durationCount > 0
          ? Math.round(data.totalDurationMs / data.durationCount)
          : null;
      return [
        toolName,
        data.calls,
        data.success,
        data.error,
        data.unknown,
        formatPercent(successRate),
        avgMs == null ? "-" : `${avgMs} ms`,
      ];
    });

  return [
    "[OK] session-analytics tools",
    "",
    formatTable(
      [
        "Tool",
        "Calls",
        "Success",
        "Error",
        "Unknown",
        "Success rate",
        "Avg duration",
      ],
      rows.length > 0 ? rows : [["-", 0, 0, 0, 0, "-", "-"]],
    ),
  ].join("\n");
}

function buildSessionsOutput(ctx: LoadContext): string {
  const sessionStats = summarizeSessions(ctx.sessions);
  const messagesPerSession =
    ctx.sessions.length > 0 ? ctx.messages.length / ctx.sessions.length : 0;
  const toolCalls = summarizeTools(ctx.parts);
  const toolCount = [...toolCalls.values()].reduce(
    (acc, it) => acc + it.calls,
    0,
  );
  const toolsPerSession =
    ctx.sessions.length > 0 ? toolCount / ctx.sessions.length : 0;

  const days = getLastNDays(14);
  const dayRows = days.map((day) => [day, sessionStats.byDay.get(day) ?? 0]);

  const summaryRows = [
    ["Sessions", ctx.sessions.length],
    ["Avg messages per session", messagesPerSession.toFixed(2)],
    ["Avg tools per session", toolsPerSession.toFixed(2)],
  ];

  return [
    "[OK] session-analytics sessions",
    "",
    formatTable(["Metric", "Value"], summaryRows),
    "",
    formatTable(["Day (UTC)", "Sessions"], dayRows),
  ].join("\n");
}

function buildOutput(mode: Mode, ctx: LoadContext): string {
  if (mode === "summary") return buildSummaryOutput(ctx);
  if (mode === "tokens") return buildTokensOutput(ctx);
  if (mode === "tools") return buildToolsOutput(ctx);
  return buildSessionsOutput(ctx);
}

export default tool({
  description:
    "Query OpenCode SQLite for session usage analytics (summary, tokens, tools, sessions).",
  args: {
    mode: tool.schema
      .enum(["summary", "tokens", "tools", "sessions"])
      .optional()
      .default("summary")
      .describe("Analytics mode"),
    last_n_sessions: tool.schema
      .number()
      .optional()
      .default(50)
      .describe("Limit to last N sessions (sorted by time_created, max 1000)"),
    project_id: tool.schema
      .string()
      .optional()
      .describe("Filter by project_id (defaults to current repo)"),
  },
  async execute(args): Promise<string> {
    try {
      const dbPath = getDbPath();
      if (!existsSync(dbPath)) {
        return `[X] session-analytics error: SQLite database not found at ${dbPath}`;
      }

      let db: Database | null = null;
      try {
        db = new Database(dbPath, { readonly: true });

        const projectId = args.project_id ?? resolveProjectId(db);
        const lastNSessions = Math.max(
          1,
          Math.min(args.last_n_sessions ?? 50, 1000),
        );
        const mode = (args.mode ?? "summary") as Mode;
        const includeMessages =
          mode === "summary" || mode === "tokens" || mode === "sessions";
        const includeParts =
          mode === "summary" || mode === "tools" || mode === "sessions";

        const ctx = loadContext(db, {
          projectId,
          lastNSessions,
          includeMessages,
          includeParts,
        });

        if (ctx.sessions.length === 0) {
          return `[OK] session-analytics ${mode}\n\nNo sessions found for current project.\nProject ID: ${projectId ?? "(none — showing all projects)"}\nCWD: ${process.cwd()}`;
        }

        return buildOutput(mode, ctx);
      } finally {
        db?.close();
      }
    } catch (error) {
      return `[X] session-analytics error: ${formatDbError(error)}`;
    }
  },
});
