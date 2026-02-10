# Claims and Citations Policy

**Purpose:** Ensure all quantitative claims about cost, performance, and improvement are either cited or explicitly marked as unverified.

**Scope:** All agents (Rias and specialists), all documentation, all reports to Master Kai.

**Effective Date:** February 4, 2026

---

## Core Principle

**No unsubstantiated quantitative claims.**

If you make a claim about numbers—cost, performance, improvement, reduction—you must either:

1. Cite the source, OR
2. Mark it as a target/estimate/projection

---

## What Requires Citations

### Cost Claims

**Requires citation:**

- API costs (e.g., "$0.02-0.07/session")
- Token costs (e.g., "$0.150/1M tokens")
- Infrastructure costs
- Any dollar amount or pricing comparison

**Citation format:**

```
$0.02-0.07/session¹

¹ Based on OpenAI pricing (Jan 2026): gpt-4o-mini $0.150/1M input, $0.600/1M output.
Session extraction ~10-20K tokens.
```

### Performance Claims

**Requires citation:**

- Latency (e.g., "<100ms", "200-500ms")
- Throughput (e.g., "1000 req/sec")
- Memory usage (e.g., "~500MB")
- Storage size (e.g., "~10KB per record")

**Citation format for targets:**

```
Target: <500ms latency¹

¹ Based on session initialization UX goals. Not currently measured. Typical observed: 200-800ms.
```

**Citation format for measurements:**

```
Search latency: <100ms for 10K memories¹

¹ Based on local Xenova/nomic-embed-text-v1 embedding search (Jan 2026 testing). No formal benchmark.
```

### Improvement Claims

**Requires citation:**

- Percentage improvements (e.g., "30% faster", "50% reduction")
- Quantitative comparisons (e.g., "2x better", "half the cost")
- Efficiency gains (e.g., "saves 20% tokens")

**If you don't have data, use qualitative language:**

❌ **WRONG (uncited claim):**

```
This approach reduces rework by 30-40%.
```

✓ **RIGHT (qualitative):**

```
This approach is expected to reduce rework significantly.
```

✓ **RIGHT (cited):**

```
This approach reduced rework by 35% in initial testing¹.

¹ Based on 10-session pilot (Jan 2026). Sample size small; results may vary.
```

---

## Acceptable Without Citations

**Technical specs (verifiable):**

- "30-day retention" (config setting)
- "0.65 similarity threshold" (config setting)
- "gpt-4o-mini model" (model name)

**Qualitative statements:**

- "significantly faster"
- "reduced rework"
- "improved quality"
- "minimal overhead"

**Logical/mathematical claims:**

- "O(n log n) complexity" (algorithmic analysis)
- "50% of requests" (when you have the count)

---

## Citation Format

**Use footnote markers (¹ ² ³) with inline explanations:**

```markdown
Performance: <100ms latency¹, ~500MB memory²

¹ Target based on UX requirements. Not measured in production.
² Observed during local testing (Jan 2026). No formal profiling.
```

**Include in citations:**

- Basis (measured/observed/target/estimate)
- Date/timeframe (when data collected)
- Caveats (sample size, conditions, limitations)

---

## Enforcement

### For All Agents

**Before reporting to Rias or Master Kai:**

- [ ] Review all quantitative claims in your report
- [ ] Add citations or change to qualitative language
- [ ] Mark unverified claims as targets/estimates

**Red flags to avoid:**

- "X% faster" without data
- "$Y cost" without pricing source
- "Z ms latency" without measurement basis
- "reduces [metric] by [percentage]" without testing

### For Rias (Coordinator)

**Before updating Master Kai:**

- [ ] Verify agent reports don't contain uncited claims
- [ ] Request citations if claims are unsubstantiated
- [ ] Convert uncited claims to qualitative language

**Review checklist:**

- If you see a percentage → ask "based on what data?"
- If you see a dollar amount → ask "from what pricing?"
- If you see a latency → ask "measured or target?"

---

## Examples

### Cost Claims

❌ **WRONG:**

```
Memory plugin costs ~$0.05 per session.
```

✓ **RIGHT:**

```
Memory plugin costs ~$0.02-0.07 per session¹.

¹ Based on OpenAI pricing (Jan 2026): gpt-4o-mini $0.150/1M input, $0.600/1M output.
```

### Performance Claims

❌ **WRONG:**

```
Search is very fast, under 100ms.
```

✓ **RIGHT (target):**

```
Search target: <100ms¹

¹ UX goal. Not measured. Local testing shows ~50-150ms typical.
```

✓ **RIGHT (qualitative):**

```
Search is fast enough for interactive use.
```

### Improvement Claims

❌ **WRONG:**

```
This reduces token usage by 30%.
```

✓ **RIGHT (cited):**

```
This reduced token usage by 28-32% in pilot testing¹.

¹ Based on 15-session comparison (Jan 2026). Sample: medium-complexity tasks.
```

✓ **RIGHT (qualitative):**

```
This significantly reduces token usage.
```

---

## When in Doubt

**Ask these questions:**

1. **Do I have data?** → If no, use qualitative language
2. **Is this verifiable?** → If no, mark as estimate/target
3. **Would Master ask "based on what?"** → If yes, add citation

**Default to qualitative language.** It's better to be vague than wrong.

---

## Related Policies

- **Output Discipline** (`protocols/rulesets/OUTPUT_DISCIPLINE.md`) - Skimmability and structure
- **Performance** (`protocols/rulesets/PERFORMANCE.md`) - Baselines and profiling triggers

---

**Last Updated:** February 4, 2026  
**Next Review:** As needed
