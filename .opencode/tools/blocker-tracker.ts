import { tool } from "@opencode-ai/plugin";

type Status = "pending" | "in_progress" | "blocked" | "completed" | "cancelled";

type StatusItem = {
  id: string;
  status: Status;
  title: string;
  owner?: string;
  note?: string;
  updated_at: string;
};

type StatusFile = {
  version: 1;
  items: StatusItem[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeStatus(s: string): Status {
  const v = s.toLowerCase();
  if (
    v === "pending" ||
    v === "in_progress" ||
    v === "blocked" ||
    v === "completed" ||
    v === "cancelled"
  )
    return v;
  throw new Error(`Invalid status '${s}'`);
}

async function readStatusFile(path: string): Promise<StatusFile> {
  try {
    const txt = await Bun.file(path).text();
    const parsed = JSON.parse(txt) as StatusFile;
    if (parsed?.version !== 1 || !Array.isArray(parsed.items))
      throw new Error("Invalid status file");
    return parsed;
  } catch {
    return { version: 1, items: [] };
  }
}

async function writeStatusFile(path: string, data: StatusFile): Promise<void> {
  // Ensure directory exists
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
  await Bun.write(path, JSON.stringify(data, null, 2) + "\n");
}

export default tool({
  description:
    "Track blockers/tasks in a local status file (.opencode/status.json)",
  args: {
    op: tool.schema
      .enum(["upsert", "set", "remove", "list"])
      .describe("Operation"),
    path: tool.schema.string().optional().default(".opencode/status.json"),
    id: tool.schema
      .string()
      .optional()
      .describe("Item id (e.g. BLK-1, TASK-2)"),
    status: tool.schema
      .string()
      .optional()
      .describe("pending | in_progress | blocked | completed | cancelled"),
    title: tool.schema
      .string()
      .optional()
      .describe("Title (required for upsert if new)"),
    owner: tool.schema.string().optional().describe("Owner tag"),
    note: tool.schema.string().optional().describe("Short note"),
  },
  async execute(args) {
    try {
      const data = await readStatusFile(args.path);

      if (args.op === "list") {
        const lines: string[] = [];
        lines.push(`[OK] blocker-tracker list (${nowIso()})`);
        lines.push(`File: ${args.path}`);
        for (const it of data.items.sort((a, b) =>
          a.updated_at < b.updated_at ? 1 : -1,
        )) {
          const owner = it.owner ? ` @${it.owner}` : "";
          const note = it.note ? ` — ${it.note}` : "";
          lines.push(`- [${it.status}] ${it.id}: ${it.title}${owner}${note}`);
        }
        if (data.items.length === 0) lines.push("(none)");
        return lines.join("\n");
      }

      if (!args.id) throw new Error("id is required");

      const idx = data.items.findIndex((i) => i.id === args.id);

      if (args.op === "remove") {
        if (idx >= 0) data.items.splice(idx, 1);
        await writeStatusFile(args.path, data);
        return `[OK] Removed ${args.id} from ${args.path}`;
      }

      if (args.op === "set") {
        if (idx < 0) throw new Error(`Item not found: ${args.id}`);
        if (!args.status) throw new Error("status is required for set");
        const s = normalizeStatus(args.status);
        const it = data.items[idx];
        data.items[idx] = {
          ...it,
          status: s,
          owner: args.owner ?? it.owner,
          note: args.note ?? it.note,
          updated_at: nowIso(),
        };
        await writeStatusFile(args.path, data);
        return `[OK] Updated ${args.id} -> ${s}`;
      }

      // upsert
      const status = args.status
        ? normalizeStatus(args.status)
        : ("pending" as Status);
      if (idx >= 0) {
        const it = data.items[idx];
        data.items[idx] = {
          ...it,
          status,
          title: args.title ?? it.title,
          owner: args.owner ?? it.owner,
          note: args.note ?? it.note,
          updated_at: nowIso(),
        };
      } else {
        if (!args.title)
          throw new Error("title is required when creating a new item");
        data.items.push({
          id: args.id,
          status,
          title: args.title,
          owner: args.owner,
          note: args.note,
          updated_at: nowIso(),
        });
      }

      await writeStatusFile(args.path, data);
      return `[OK] Upserted ${args.id} (${status}) in ${args.path}`;
    } catch (error) {
      return `[X] Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
