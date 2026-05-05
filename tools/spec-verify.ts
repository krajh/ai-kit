import { tool } from "@opencode-ai/plugin";

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { callLLM } from "./eval-harness/llm-client";

export type CriterionStatus = "pass" | "partial" | "fail";

export interface CriterionEvaluation {
  criterion: string;
  status: CriterionStatus;
  evidence: string;
}

export interface SpecValidationResult {
  sourcePath: string;
  criteria: string[];
  evaluations: CriterionEvaluation[];
  passCount: number;
  partialCount: number;
  failCount: number;
  gateStatus: "PASS" | "FAIL";
  summaryLine: string;
}

export interface RunSpecValidationArgs {
  specPath: string;
  implementationEvidence?: string;
  dryRun?: boolean;
}

const SPEC_CANDIDATES = ["spec.md", "plan.md", "SPEC.md", "PLAN.md"];
const HEADING_KEYWORDS = ["acceptance criteria", "done", "requirements"];

function stripMarkdown(text: string): string {
  return text
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function runGit(args: string[]): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const proc = Bun.spawnSync(["git", ...args], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

function normalizeHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[\s:]+/g, " ")
    .trim();
}

function isAcceptanceHeading(heading: string): boolean {
  const normalized = normalizeHeading(heading);
  return HEADING_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function extractListItem(line: string): string | null {
  const bulletMatch = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/);
  if (!bulletMatch?.[1]) return null;

  const withoutCheckbox = bulletMatch[1].replace(/^\[(?: |x|X)\]\s+/, "");
  const cleaned = stripMarkdown(withoutCheckbox);
  return cleaned.length > 0 ? cleaned : null;
}

export function resolveSpecArtifactPath(
  inputPath: string,
  cwd: string = process.cwd(),
): string {
  const absPath = resolve(cwd, inputPath);

  if (!existsSync(absPath)) {
    throw new Error(`Spec path not found: ${inputPath}`);
  }

  const stat = statSync(absPath);
  if (stat.isFile()) {
    return absPath;
  }

  if (!stat.isDirectory()) {
    throw new Error(`Spec path is not a file or directory: ${inputPath}`);
  }

  for (const candidate of SPEC_CANDIDATES) {
    const candidatePath = join(absPath, candidate);
    if (existsSync(candidatePath) && statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  throw new Error(
    `No spec.md or plan.md found in directory: ${inputPath} (checked: ${SPEC_CANDIDATES.join(", ")})`,
  );
}

export function extractAcceptanceCriteriaFromMarkdown(markdown: string): string[] {
  const lines = markdown.split("\n");
  const criteria: string[] = [];

  let insideTargetSection = false;

  for (const line of lines) {
    const heading = line.match(/^\s{0,3}#{2,6}\s+(.+)$/);
    if (heading?.[1]) {
      insideTargetSection = isAcceptanceHeading(heading[1]);
      continue;
    }

    if (!insideTargetSection) continue;

    const item = extractListItem(line);
    if (item) criteria.push(item);
  }

  return Array.from(new Set(criteria));
}

function buildImplementationEvidence(maxChars = 16_000): string {
  const changedFiles = runGit(["diff", "--name-only", "HEAD"]);
  const diff = runGit(["diff", "--unified=0", "HEAD"]);

  const changedSummary = changedFiles.stdout.trim() || "(none)";
  const diffText = diff.stdout.trim();
  const clippedDiff =
    diffText.length > maxChars
      ? `${diffText.slice(0, maxChars)}\n\n[...diff truncated...]`
      : diffText || "(no diff content)";

  return `Changed files:\n${changedSummary}\n\nUnified diff:\n${clippedDiff}`;
}

function parseLLMJson(raw: string): {
  results: Array<{ criterion?: string; status?: string; evidence?: string }>;
} {
  const trimmed = raw.trim();
  const direct = (() => {
    try {
      return JSON.parse(trimmed) as {
        results?: Array<{ criterion?: string; status?: string; evidence?: string }>;
      };
    } catch {
      return null;
    }
  })();

  if (direct?.results && Array.isArray(direct.results)) {
    return { results: direct.results };
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch?.[0]) {
    throw new Error("LLM response did not contain JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    results?: Array<{ criterion?: string; status?: string; evidence?: string }>;
  };
  if (!parsed.results || !Array.isArray(parsed.results)) {
    throw new Error("LLM JSON missing results[]");
  }

  return { results: parsed.results };
}

function toCriterionStatus(value: string | undefined): CriterionStatus {
  const normalized = (value ?? "").toLowerCase().trim();
  if (normalized === "pass") return "pass";
  if (normalized === "partial") return "partial";
  return "fail";
}

async function evaluateCriteriaWithLLM(
  criteria: string[],
  implementationEvidence: string,
): Promise<CriterionEvaluation[]> {
  const systemPrompt =
    "You evaluate software implementation against acceptance criteria. Output strict JSON only.";
  const userPrompt = [
    "Evaluate each acceptance criterion against the implementation evidence.",
    "Return JSON with shape:",
    '{"results":[{"criterion":"...","status":"pass|partial|fail","evidence":"..."}]}',
    "Use concise evidence tied to changed files/diff details.",
    "",
    "Acceptance criteria:",
    ...criteria.map((criterion, index) => `${index + 1}. ${criterion}`),
    "",
    "Implementation evidence:",
    implementationEvidence,
  ].join("\n");

  const raw = await callLLM(systemPrompt, [{ role: "user", content: userPrompt }], {
    temperature: 0,
    maxTokens: 1800,
  });

  const parsed = parseLLMJson(raw);

  return criteria.map((criterion, index) => {
    const fromLLM = parsed.results[index] ?? {};
    return {
      criterion,
      status: toCriterionStatus(fromLLM.status),
      evidence: stripMarkdown(fromLLM.evidence ?? "No evidence provided by model."),
    };
  });
}

export function formatSemanticGateOutput(result: SpecValidationResult): string {
  const lines = [
    `[semantic] ${result.gateStatus} — ${result.passCount}/${result.criteria.length} criteria met`,
  ];

  for (const evaluation of result.evaluations) {
    if (evaluation.status === "pass") {
      lines.push(`- ✓ ${evaluation.criterion}`);
      continue;
    }

    if (evaluation.status === "partial") {
      lines.push(
        `- ✗ ${evaluation.criterion} (PARTIAL — ${evaluation.evidence || "Insufficient enforcement evidence"})`,
      );
      continue;
    }

    lines.push(
      `- ✗ ${evaluation.criterion} (${evaluation.evidence || "No satisfying evidence found"})`,
    );
  }

  return lines.join("\n");
}

export async function runSpecSemanticValidation(
  args: RunSpecValidationArgs,
): Promise<SpecValidationResult> {
  const sourcePath = resolveSpecArtifactPath(args.specPath);
  const markdown = readFileSync(sourcePath, "utf8");
  const criteria = extractAcceptanceCriteriaFromMarkdown(markdown);

  if (criteria.length === 0) {
    throw new Error(
      "No acceptance criteria found. Add bullet/numbered lists under headings like '## Acceptance Criteria', '## Done', or '## Requirements'.",
    );
  }

  if (args.dryRun) {
    return {
      sourcePath,
      criteria,
      evaluations: criteria.map((criterion) => ({
        criterion,
        status: "partial",
        evidence: "Dry-run mode: semantic LLM validation skipped.",
      })),
      passCount: 0,
      partialCount: criteria.length,
      failCount: 0,
      gateStatus: "PASS",
      summaryLine: `[semantic] PASS — 0/${criteria.length} criteria met (dry-run only)`,
    };
  }

  const implementationEvidence =
    args.implementationEvidence?.trim() || buildImplementationEvidence();
  const evaluations = await evaluateCriteriaWithLLM(criteria, implementationEvidence);

  const passCount = evaluations.filter((item) => item.status === "pass").length;
  const partialCount = evaluations.filter(
    (item) => item.status === "partial",
  ).length;
  const failCount = evaluations.filter((item) => item.status === "fail").length;

  const gateStatus: "PASS" | "FAIL" = failCount === 0 ? "PASS" : "FAIL";

  return {
    sourcePath,
    criteria,
    evaluations,
    passCount,
    partialCount,
    failCount,
    gateStatus,
    summaryLine: `[semantic] ${gateStatus} — ${passCount}/${criteria.length} criteria met`,
  };
}

export const searchHint =
  "spec verify acceptance criteria semantic validation plan markdown";

export default tool({
  description:
    "Validate implementation against acceptance criteria extracted from spec.md/plan.md.",
  args: {
    specPath: tool.schema
      .string()
      .describe("Path to spec.md/plan.md, or a directory containing one of them."),
    dryRun: tool.schema
      .boolean()
      .optional()
      .default(false)
      .describe("Extract criteria only; skip LLM semantic evaluation."),
  },
  async execute(args): Promise<string> {
    const result = await runSpecSemanticValidation({
      specPath: args.specPath,
      dryRun: args.dryRun,
    });

    return [
      `[OK] source: ${result.sourcePath}`,
      formatSemanticGateOutput(result),
    ].join("\n");
  },
});

if (import.meta.main) {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const specPath = get("--spec") || get("-s");
  const dryRun = args.includes("--dry-run") || args.includes("-d");

  if (!specPath || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(
      "Usage: bun tools/spec-verify.ts --spec <path> [--dry-run]\n\n" +
        "Options:\n" +
        "  --spec, -s <path>   Path to spec.md/plan.md or directory\n" +
        "  --dry-run, -d       Extract criteria only; skip LLM semantic validation\n" +
        "  --help, -h          Show help\n",
    );
    process.exit(specPath ? 0 : 1);
  }

  try {
    const result = await runSpecSemanticValidation({ specPath, dryRun });
    process.stdout.write(
      `[OK] source: ${result.sourcePath}\n${formatSemanticGateOutput(result)}\n`,
    );
    process.exit(result.failCount > 0 ? 1 : 0);
  } catch (error) {
    process.stderr.write(
      `[X] Error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}
