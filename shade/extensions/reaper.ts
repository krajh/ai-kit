import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync, mkdirSync } from "node:fs";

const QUEUE_DB_PATH = join(homedir(), ".frieren", "queue.db");

function getDb(): DatabaseSync {
  const dir = join(homedir(), ".frieren");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(QUEUE_DB_PATH);
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA busy_timeout=5000");
  return db;
}

export default function (pi: ExtensionAPI) {
  let currentTaskId: string | null = null;

  // ── reaper_dequeue ──────────────────────────────────────────────────
  pi.registerTool({
    name: "reaper_dequeue",
    label: "Reaper Dequeue",
    description:
      "Claim the next pending task from the Reaper Realm queue. Runs stale recovery first. Returns task payload or queue_empty.",
    promptSnippet: "Claim next background task from the Reaper Realm queue",
    parameters: Type.Object({
      target_vessel: Type.Optional(
        Type.String({ description: "Target vessel (default: shade)" }),
      ),
    }),
    async execute(_toolCallId, params) {
      const db = getDb();
      const vessel = params.target_vessel ?? "shade";

      try {
        // Stale recovery
        db.prepare(
          `UPDATE reaper_realm_queue
           SET status = 'pending', heartbeat_at = NULL,
               retry_count = retry_count + 1, updated_at = datetime('now')
           WHERE status = 'manifesting'
             AND CAST((julianday('now') - julianday(heartbeat_at)) * 86400 AS INTEGER) > timeout_seconds
             AND retry_count < max_retries`,
        ).run();

        db.prepare(
          `UPDATE reaper_realm_queue
           SET status = 'dead', error = 'heartbeat timeout after max retries',
               updated_at = datetime('now')
           WHERE status = 'manifesting'
             AND CAST((julianday('now') - julianday(heartbeat_at)) * 86400 AS INTEGER) > timeout_seconds
             AND retry_count >= max_retries`,
        ).run();

        // Atomic claim
        const row = db
          .prepare(
            `UPDATE reaper_realm_queue
             SET status = 'manifesting', heartbeat_at = datetime('now'), updated_at = datetime('now')
             WHERE task_id = (
               SELECT task_id FROM reaper_realm_queue
               WHERE status = 'pending' AND target_vessel = ?
               ORDER BY priority ASC, created_at ASC LIMIT 1
             )
             RETURNING task_id, coordinator_origin, target_vessel, priority,
                       payload, timeout_seconds, retry_count, max_retries, created_at`,
          )
          .get(vessel) as Record<string, unknown> | undefined;

        if (!row) {
          return {
            content: [{ type: "text", text: "QUEUE_EMPTY: No pending tasks." }],
            details: { claimed: false },
          };
        }

        currentTaskId = row.task_id as string;
        const payload = JSON.parse(row.payload as string);

        return {
          content: [
            {
              type: "text",
              text: `TASK_CLAIMED: ${row.task_id}\nPriority: ${row.priority}\nRetry: ${row.retry_count}/${row.max_retries}\nFrom: ${row.coordinator_origin}\n\nInstruction:\n${payload.instruction}\n\nTarget files: ${JSON.stringify(payload.target_files ?? [])}`,
            },
          ],
          details: {
            claimed: true,
            task_id: row.task_id,
            payload,
            timeout_seconds: row.timeout_seconds,
          },
        };
      } finally {
        db.close();
      }
    },
  });

  // ── reaper_heartbeat ────────────────────────────────────────────────
  pi.registerTool({
    name: "reaper_heartbeat",
    label: "Reaper Heartbeat",
    description:
      "Update heartbeat for the current manifesting task. Call this periodically while working.",
    promptSnippet: "Send heartbeat for current task",
    parameters: Type.Object({
      task_id: Type.Optional(
        Type.String({ description: "Task ID (defaults to current)" }),
      ),
    }),
    async execute(_toolCallId, params) {
      const taskId = params.task_id ?? currentTaskId;
      if (!taskId) throw new Error("No active task. Dequeue a task first.");

      const db = getDb();
      try {
        const result = db.prepare(
          `UPDATE reaper_realm_queue
           SET heartbeat_at = datetime('now'), updated_at = datetime('now')
           WHERE task_id = ? AND status = 'manifesting'`,
        ).run(taskId);

        if (result.changes === 0) {
          throw new Error(`Task ${taskId} not found or not manifesting.`);
        }
        return {
          content: [{ type: "text", text: `Heartbeat OK: ${taskId}` }],
          details: { ok: true },
        };
      } finally {
        db.close();
      }
    },
  });

  // ── reaper_complete ─────────────────────────────────────────────────
  pi.registerTool({
    name: "reaper_complete",
    label: "Reaper Complete",
    description: "Mark the current task as completed with a result summary.",
    promptSnippet: "Complete current task with results",
    parameters: Type.Object({
      task_id: Type.Optional(
        Type.String({ description: "Task ID (defaults to current)" }),
      ),
      result: Type.String({ description: "Result/summary from execution" }),
    }),
    async execute(_toolCallId, params) {
      const taskId = params.task_id ?? currentTaskId;
      if (!taskId) throw new Error("No active task. Dequeue a task first.");

      const db = getDb();
      try {
        const result = db.prepare(
          `UPDATE reaper_realm_queue
           SET status = 'completed', result = ?, completed_at = datetime('now'), updated_at = datetime('now')
           WHERE task_id = ? AND status = 'manifesting'`,
        ).run(params.result, taskId);

        if (result.changes === 0) {
          throw new Error(`Task ${taskId} not found or not manifesting.`);
        }
        currentTaskId = null;
        return {
          content: [{ type: "text", text: `TASK_COMPLETED: ${taskId}` }],
          details: { ok: true, task_id: taskId },
        };
      } finally {
        db.close();
      }
    },
  });

  // ── reaper_fail ─────────────────────────────────────────────────────
  pi.registerTool({
    name: "reaper_fail",
    label: "Reaper Fail",
    description:
      "Mark the current task as failed. Auto-retries if under max_retries, otherwise marks dead.",
    promptSnippet: "Fail current task with error reason",
    parameters: Type.Object({
      task_id: Type.Optional(
        Type.String({ description: "Task ID (defaults to current)" }),
      ),
      error: Type.String({ description: "Failure reason" }),
    }),
    async execute(_toolCallId, params) {
      const taskId = params.task_id ?? currentTaskId;
      if (!taskId) throw new Error("No active task. Dequeue a task first.");

      const db = getDb();
      try {
        const row = db
          .prepare(
            `SELECT retry_count, max_retries FROM reaper_realm_queue WHERE task_id = ? AND status = 'manifesting'`,
          )
          .get(taskId) as Record<string, unknown> | undefined;

        if (!row) throw new Error(`Task ${taskId} not found or not manifesting.`);

        const retryCount = row.retry_count as number;
        const maxRetries = row.max_retries as number;

        if (retryCount < maxRetries) {
          db.prepare(
            `UPDATE reaper_realm_queue
             SET status = 'pending', retry_count = retry_count + 1,
                 error = ?, heartbeat_at = NULL, updated_at = datetime('now')
             WHERE task_id = ?`,
          ).run(params.error, taskId);
          currentTaskId = null;
          return {
            content: [{ type: "text", text: `TASK_REQUEUED: ${taskId} (retry ${retryCount + 1}/${maxRetries})` }],
            details: { will_retry: true },
          };
        }

        db.prepare(
          `UPDATE reaper_realm_queue
           SET status = 'dead', error = ?, updated_at = datetime('now')
           WHERE task_id = ?`,
        ).run(params.error, taskId);
        currentTaskId = null;
        return {
          content: [{ type: "text", text: `TASK_DEAD: ${taskId} — ${params.error}` }],
          details: { will_retry: false },
        };
      } finally {
        db.close();
      }
    },
  });

  // ── reaper_status ───────────────────────────────────────────────────
  pi.registerTool({
    name: "reaper_status",
    label: "Reaper Status",
    description: "Query Reaper Realm queue state.",
    promptSnippet: "Check Reaper Realm queue status",
    parameters: Type.Object({
      task_id: Type.Optional(Type.String({ description: "Specific task ID" })),
      status_filter: Type.Optional(Type.String({ description: "Filter by status" })),
    }),
    async execute(_toolCallId, params) {
      const db = getDb();
      try {
        const counts = db
          .prepare(`SELECT status, COUNT(*) as count FROM reaper_realm_queue GROUP BY status`)
          .all() as Array<{ status: string; count: number }>;

        const summary: Record<string, number> = {};
        for (const row of counts) summary[row.status] = row.count;

        if (params.task_id) {
          const task = db
            .prepare(`SELECT * FROM reaper_realm_queue WHERE task_id = ?`)
            .get(params.task_id);
          return {
            content: [{ type: "text", text: JSON.stringify({ summary, task }, null, 2) }],
            details: { summary, task },
          };
        }

        let query = `SELECT task_id, status, priority, created_at FROM reaper_realm_queue`;
        const queryParams: string[] = [];
        if (params.status_filter) {
          query += ` WHERE status = ?`;
          queryParams.push(params.status_filter);
        }
        query += ` ORDER BY priority ASC, created_at ASC LIMIT 20`;

        const tasks = db.prepare(query).all(...queryParams);
        return {
          content: [{ type: "text", text: JSON.stringify({ summary, tasks }, null, 2) }],
          details: { summary, tasks },
        };
      } finally {
        db.close();
      }
    },
  });

  // ── Auto-notify on session start ──────────────────────────────────
  pi.on("session_start", async (_event, ctx) => {
    try {
      const db = getDb();
      const row = db
        .prepare(`SELECT COUNT(*) as count FROM reaper_realm_queue WHERE status = 'pending'`)
        .get() as { count: number } | undefined;
      db.close();
      if (row && row.count > 0) {
        ctx.ui.notify(`Reaper Realm: ${row.count} pending task(s) available`, "info");
      }
    } catch {
      // Queue DB doesn't exist yet
    }
  });

  // ── /queue command ──────────────────────────────────────────────────
  pi.registerCommand("queue", {
    description: "Show Reaper Realm queue status",
    handler: async (_args, ctx) => {
      try {
        const db = getDb();
        const counts = db
          .prepare(`SELECT status, COUNT(*) as count FROM reaper_realm_queue GROUP BY status`)
          .all() as Array<{ status: string; count: number }>;
        db.close();
        const lines = counts.map((r) => `  ${r.status}: ${r.count}`);
        ctx.ui.notify(`Reaper Realm Queue:\n${lines.join("\n") || "  (empty)"}`, "info");
      } catch {
        ctx.ui.notify("Reaper Realm: queue.db not found", "error");
      }
    },
  });
}
