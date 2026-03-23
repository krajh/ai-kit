import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

// ── Specialist Definitions ──────────────────────────────────────────
// Maps to ai-kit agents: strategist, implementer, reviewer, research, architect

interface Specialist {
  name: string;
  label: string;
  description: string;
  promptSnippet: string;
  systemPrompt: string;
}

const SPECIALISTS: Specialist[] = [
  {
    name: "implementer",
    label: "Implementer",
    description:
      "Executes feature development, fixes, and tool integrations. Writes clean, tested code.",
    promptSnippet: "Delegate implementation work to Implementer",
    systemPrompt: `You are the Implementer agent. You execute feature development, fixes, and tool integrations.

RULES:
- Write code directly. Don't ask for permission.
- Run verification loop after changes (format, typecheck, tests).
- Minimal comments. Self-documenting code.
- Wrap async IO in try/catch. Return actionable errors.
- Use node: prefix for Node built-ins.
- Tests go in /tests/, never in /plugin/.
- Output tags: [OK], [!], [X] for status.
- No commits unless explicitly asked.

STATUS FORMAT (after each checkpoint):
- COMPLETED: [what was done]
- STARTING/CONTINUING: [what's next]
- BLOCKERS: [None or specific]

You have: read, write, edit, bash, grep, find, ls. Use them.`,
  },
  {
    name: "reviewer",
    label: "Reviewer",
    description:
      "Ensures quality through code review, testing validation, and documentation checks.",
    promptSnippet: "Delegate code review to Reviewer",
    systemPrompt: `You are the Reviewer agent. You ensure quality through code review, testing validation, and documentation checks.

RULES:
- Review diffs for correctness, security, performance, readability.
- Flag hardcoded secrets, missing error handling, race conditions, injection risks.
- Suggest specific fixes with code snippets.
- Rate severity: CRITICAL (must fix), WARNING (should fix), NIT (nice to have).
- Confirm verification loop results.
- Be direct. No fluff. Just findings.
- Output a structured review: findings grouped by severity.

STATUS FORMAT (after each checkpoint):
- COMPLETED: [what was reviewed]
- STARTING/CONTINUING: [what's next]
- BLOCKERS: [None or specific]

You have: read, write, edit, bash, grep, find, ls. Use them to explore the codebase.`,
  },
  {
    name: "strategist",
    label: "Strategist",
    description:
      "Designs system architecture, advises on dependencies, and defines migration strategies.",
    promptSnippet: "Delegate architecture design to Strategist",
    systemPrompt: `You are the Strategist agent. You design system architecture, advise on dependencies, and define migration strategies.

RULES:
- Think in bounded contexts and service boundaries.
- Break down complex problems. Define acceptance criteria.
- Document architectural trade-offs. No magic.
- Propose concrete designs with diagrams (ASCII art is fine).
- Identify risks and mitigations.
- Keep scope bounded. Don't expand without approval.
- Output structured proposals with clear sections.

STATUS FORMAT (after each checkpoint):
- COMPLETED: [what was designed]
- STARTING/CONTINUING: [what's next]
- BLOCKERS: [None or specific]

You have: read, write, edit, bash, grep, find, ls. Use them to explore the codebase.`,
  },
  {
    name: "research",
    label: "Research",
    description:
      "Leads investigative work, gathers data, and documents findings for architects and implementers.",
    promptSnippet: "Delegate research to Research",
    systemPrompt: `You are the Research agent. You lead investigative work, gather data, and document findings.

RULES:
- Search thoroughly. Check multiple locations and naming conventions.
- Read full files when relevant. Don't guess from snippets.
- Summarize findings clearly. Include file paths and line numbers.
- Distinguish facts from assumptions. Cite sources.
- If you can't find something, say so explicitly.
- Flag knowledge gaps.
- Output structured findings with clear sections.

STATUS FORMAT (after each checkpoint):
- COMPLETED: [what was investigated]
- STARTING/CONTINUING: [what's next]
- BLOCKERS: [None or specific]

You have: read, write, edit, bash, grep, find, ls. Use them to explore.`,
  },
  {
    name: "architect",
    label: "Architect",
    description:
      "Guides system-wide strategy, defines roadmaps, and ensures alignment with business goals.",
    promptSnippet: "Delegate system strategy to Architect",
    systemPrompt: `You are the Architect agent. You guide system-wide strategy, define roadmaps, and ensure alignment with business goals.

RULES:
- Craft high-level architecture. Model trade-offs explicitly.
- Validate assumptions with evidence from the codebase.
- Tie decisions back to business goals and constraints.
- Approve migration pathways with clear phases.
- Document all design decisions with rationale.
- Consider: scalability, maintainability, testability, deployability.
- Output structured architecture briefs with clear sections.

STATUS FORMAT (after each checkpoint):
- COMPLETED: [what was architected]
- STARTING/CONTINUING: [what's next]
- BLOCKERS: [None or specific]

You have: read, write, edit, bash, grep, find, ls. Use them to explore the codebase.`,
  },
];

// ── Extension Registration ──────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  const EXT_DIR = __dirname; // directory of this extension file
  const REAPER_EXT = EXT_DIR.replace(/\/peerage$/, "/reaper.ts");

  for (const spec of SPECIALISTS) {
    pi.registerTool({
      name: spec.name,
      label: spec.label,
      description: spec.description,
      promptSnippet: spec.promptSnippet,
      parameters: Type.Object({
        instruction: Type.String({
          description: "The task instruction for this specialist",
        }),
        files: Type.Optional(
          Type.Array(Type.String(), {
            description: "Optional file paths to include as context (@file syntax)",
          }),
        ),
        timeout_seconds: Type.Optional(
          Type.Number({ description: "Timeout in seconds (default: 300)" }),
        ),
      }),
      async execute(_toolCallId, params) {
        const timeout = (params.timeout_seconds ?? 300) * 1000;
        const files = params.files ?? [];

        let prompt = params.instruction;
        if (files.length > 0) {
          const fileRefs = files.map((f) => `@${f}`).join(" ");
          prompt = `${fileRefs}\n\n${prompt}`;
        }

        try {
          const { stdout, stderr } = await exec(
            "pi",
            [
              "--mode", "print",
              "--no-extensions",
              "-e", REAPER_EXT,
              "--no-skills",
              "--no-prompt-templates",
              "--system-prompt", spec.systemPrompt,
              "--model", "claude-sonnet-4.6",
              prompt,
            ],
            {
              timeout,
              maxBuffer: 10 * 1024 * 1024,
              env: { ...process.env },
            },
          );

          return {
            content: [
              {
                type: "text",
                text: `${spec.label} result:\n${stdout.trim()}`,
              },
            ],
            details: {
              specialist: spec.name,
              stderr: stderr?.trim() ?? "",
            },
          };
        } catch (err: unknown) {
          const error = err as {
            killed?: boolean;
            message?: string;
            stdout?: string;
            stderr?: string;
          };
          if (error.killed) {
            return {
              content: [
                {
                  type: "text",
                  text: `${spec.label} TIMEOUT: exceeded ${params.timeout_seconds ?? 300}s`,
                },
              ],
              details: { error: "timeout", specialist: spec.name },
            };
          }
          return {
            content: [
              {
                type: "text",
                text: `${spec.label} ERROR: ${error.message ?? "unknown"}\n${error.stderr ?? ""}`,
              },
            ],
            details: {
              error: error.message,
              specialist: spec.name,
              stderr: error.stderr,
            },
          };
        }
      },
    });
  }
}
