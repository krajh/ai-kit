---
name: claims-and-citations
description: |
  Enforces citation policy for quantitative claims (cost, performance, improvement percentages).
  Use when making quantitative claims, writing reports, creating documentation with metrics, or reviewing agent outputs for uncited numbers.
  Trigger phrases: "cite that", "based on what", "claims and citations", "quantitative claim", "report metrics", "cost estimate", "performance target".
  Do NOT use for purely qualitative statements or technical config specs.
tier: always
---

# Claims and Citations

**No unsubstantiated quantitative claims.** Every number requires a source or a disclaimer.

## Rule 1: Citation Required For These Claim Types

| Claim Type  | Examples                                                       |
| ----------- | -------------------------------------------------------------- |
| Cost        | "$0.02/session", "API costs $Y", "infrastructure costs"        |
| Performance | "<100ms latency", "1000 req/sec", "~500MB memory"              |
| Improvement | "30% faster", "50% reduction", "2x better", "saves 20% tokens" |

## Rule 2: Mandatory Citation Format

Use footnote markers with inline explanations:

```
Claim¹

¹ [Basis: measured/observed/target/estimate] + [Date/timeframe] + [Caveats]
```

**Examples:**

Cost:

```
~$0.02-0.07 per session¹

¹ Based on OpenAI pricing (Jan 2026): gpt-4o-mini $0.150/1M input, $0.600/1M output. Session extraction ~10-20K tokens.
```

Performance target:

```
Target: <500ms latency¹

¹ UX goal. Not currently measured. Typical observed: 200-800ms.
```

## Rule 3: Acceptable WITHOUT Citations

- **Technical specs (verifiable):** "30-day retention" (config setting), "gpt-4o-mini model", "0.65 similarity threshold"
- **Qualitative statements:** "significantly faster", "reduced rework", "improved quality", "minimal overhead"
- **Logical/mathematical:** "O(n log n) complexity", "50% of requests" (when you have the count)

## Rule 4: LLM-Generated Claims Are Unverified

- Never present LLM output as ground truth without verification
- Cross-reference against documentation, source code, or authoritative sources
- Flag confidence: "verified", "cross-referenced", or "unverified LLM output"

## Rule 5: Default to Qualitative Language

When data is unavailable:

- ❌ "This reduces cost by 30%"
- ✓ "This significantly reduces cost"

## Pre-Report Citation Checklist

Before reporting quantitative results, verify:

- [ ] Review every quantitative claim in the report
- [ ] Add citations OR change to qualitative language
- [ ] Mark unverified claims as targets/estimates
- [ ] For each percentage: ask "based on what data?"
- [ ] For each dollar amount: ask "from what pricing?"
- [ ] For each latency: ask "measured or target?"

## Anti-Patterns to Reject

| ❌ Wrong                       | ✓ Correct                                            |
| ------------------------------ | ---------------------------------------------------- |
| "30% faster" (no source)       | "significantly faster" OR "30% faster in benchmark¹" |
| "$0.05/session" (no basis)     | "~$0.02-0.07/session¹ (OpenAI Jan 2026 pricing)"     |
| "under 100ms" (no measurement) | "target: <100ms¹ (UX goal, not measured)"            |
