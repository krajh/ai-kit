# Claims and Citations Policy

**Purpose:** All quantitative claims about cost, performance, and improvement must be cited or explicitly marked as unverified.

**Scope:** All agents, all documentation, all reports to user.

---

## Core Rule

**No unsubstantiated quantitative claims.**

For any claim about numbers — cost, performance, improvement — either cite the source, or mark it as a target/estimate/projection. If you don't have data, use qualitative language.

---

## What Requires Citations

| Claim type  | Examples                                                     |
| ----------- | ------------------------------------------------------------ |
| Cost        | API costs, token costs, infrastructure costs, dollar amounts |
| Performance | Latency, throughput, memory usage, storage size              |
| Improvement | Percentage improvements, "2x better", efficiency gains       |

**Citation format (footnote markers):**

```
$0.02-0.07/session¹

¹ Based on OpenAI pricing (Jan 2026): gpt-4o-mini $0.150/1M input, $0.600/1M output. Session extraction ~10-20K tokens.
```

**Include in citations:** basis (measured/observed/target/estimate) · date/timeframe · caveats.

---

## Acceptable Without Citations

- Technical specs (config settings): "30-day retention", "0.65 similarity threshold"
- Qualitative statements: "significantly faster", "reduced rework", "minimal overhead"
- Logical/mathematical: "O(n log n) complexity", "50% of requests" (when you have the count)

---

## ❌ / ✓ Patterns

**Cost:**

- ❌ `Memory plugin costs ~$0.05 per session.`
- ✓ `Memory plugin costs ~$0.02-0.07 per session¹.` + footnote

**Performance:**

- ❌ `Search is very fast, under 100ms.`
- ✓ `Search target: <100ms¹` + footnote, OR `Search is fast enough for interactive use.`

**Improvement:**

- ❌ `This reduces token usage by 30%.`
- ✓ `This significantly reduces token usage.` (qualitative) OR `reduced by 28-32% in pilot testing¹` + footnote

---

## Enforcement

**All agents — before reporting:**

- [ ] Review all quantitative claims
- [ ] Add citations or change to qualitative language
- [ ] Mark unverified claims as targets/estimates

**Coordinator — before updating user:**

- [ ] Verify agent reports don't contain uncited claims
- If you see a percentage → "based on what data?"; a dollar amount → "from what pricing?"; a latency → "measured or target?"

---

## LLM-Generated Claims

LLM outputs are predictions, not verified facts.

- ❌ Never present LLM output as ground truth without verification
- ✓ Cross-reference against documentation or source code
- ✓ Flag: "verified", "cross-referenced", or "unverified LLM output"

**Default to qualitative language.** It's better to be vague than wrong.

---

## Related Policies

- **Output Discipline** (`protocols/rulesets/OUTPUT_DISCIPLINE.md`)
- **Performance** (`protocols/rulesets/PERFORMANCE.md`)
