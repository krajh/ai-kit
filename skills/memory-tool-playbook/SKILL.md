---
name: memory-tool-playbook
description: Practical patterns for using opencode-mem to capture session insights, check user preferences, and identify patterns worth promoting to Mai Context DB.
---

# OpenCode-Mem — Practical Usage Playbook

**Purpose:** Use ephemeral semantic memory to maintain continuity across sessions, avoid duplicate work, and identify patterns worth documenting permanently.

## When to use

- Before starting a task: search for similar past work
- When making design decisions: check Master's learned preferences
- During work: identify patterns worth promoting to Mai
- When resuming work: find context from previous sessions
- When uncertain: search before asking Rias

## What belongs in memory (and what doesn't)

**Do store (via auto-capture or manual add):**

- Session insights and learnings
- Master's observed preferences
- Recurring patterns and approaches
- Solutions to problems you've solved before
- Design decisions and their rationale
- Implementation strategies that worked

**Don't store:**

- Durable architectural decisions (use Mai instead)
- Permanent constraints (use Mai instead)
- Long logs or dumps
- One-time observations
- Information that contradicts Mai entries

## Memory vs Mai vs Episodic — Quick decision tree

```
Need permanent guidance?
├─ YES → Use Mai Context DB (decisions, constraints, patterns)
└─ NO → Continue...

Need recent session context?
├─ YES → Use opencode-mem (memories, preferences)
└─ NO → Continue...

Need tool execution history?
├─ YES → Use episodic memory (tool events, artifacts)
└─ NO → Ask Rias
```

## Query patterns (TypeScript examples)

### 1) Search for relevant past work

```ts
const memories = memory({
  mode: "search",
  query: "API response caching implementation",
});
```

### 2) Check Master's learned preferences

```ts
const profile = memory({ mode: "profile" });
```

### 3) List recent memories (debugging/review)

```ts
const recent = memory({ mode: "list", limit: 20 });
```

### 4) Add memory manually (rarely needed)

```ts
memory({
  mode: "add",
  content: "Master prefers minimal-diff fixes for build errors",
});
```

## Recommended usage patterns

### Pattern 1: Context Retrieval at Task Start

**Scenario:** You're starting a new feature implementation.

**What you do:**

```ts
// Search for similar past work
const memories = memory({
  mode: "search",
  query: "API endpoint implementation for user data",
});

// Check Master's preferences
const profile = memory({ mode: "profile" });

// Adjust your approach based on findings
```

**Expected outcome:**

```
Found memories:
- "Master prefers stateless API design"
- "Use async/await for all I/O operations"
- "Include comprehensive error handling"

Master preferences:
- Prefers minimal-diff implementations
- Values test coverage >80%
- Likes clear error messages
```

**How to report in STATUS UPDATE:**

```
STATUS UPDATE:
- COMPLETED: N/A (just starting)
- STARTING: Implement user profile API endpoint
- MEMORY SEARCH: Found 3 relevant memories; using stateless design + async/await
- BLOCKERS: None
- ETA: tracking
```

---

### Pattern 2: User Preference Alignment

**Scenario:** You're deciding between two implementation approaches.

**What you do:**

```ts
// Check Master's preferences for this type of work
const profile = memory({ mode: "profile" });

// Search for past decisions on similar choices
const decisions = memory({
  mode: "search",
  query: "authentication approach JWT sessions",
});
```

**Expected outcome:**

```
Master preferences:
- "Prefers stateless approaches (JWT) for APIs"
- "Prefers session-based auth for web UIs"
- "Values simplicity over feature richness"

Past decisions:
- "Used JWT for REST API, sessions for web UI"
- "JWT reduces server state, scales better"
```

**How to proceed:**

```
Based on memories:
- This is a REST API → use JWT (stateless, scales)
- Master prefers this approach → confidence is high
- No need to escalate; proceed with JWT implementation
```

---

### Pattern 3: Memory → Mai Promotion

**Scenario:** You discover a pattern that appears in multiple sessions.

**What you do:**

```ts
// During work, you notice a recurring pattern
// "Master always wants minimal-diff fixes for build errors"
// This has appeared in 5+ sessions

// Escalate to Rias for promotion to Mai
```

**Escalation message:**

```
ESCALATION TO RIAS - MEMORY PROMOTION:
- MEMORY: "Master prefers minimal-diff fixes over large refactors for build errors"
- CONTEXT: Observed pattern across 5 recent sessions (build fixes, test failures, linting)
- RECOMMENDATION: Create constraint entry in Mai
- RATIONALE: This is a permanent preference that should guide all build-fix work
- IMPACT: Will help future agents make better decisions on scope/approach
```

**Rias's response:**

```
Acknowledged. Creating Mai constraint entry now:
- Table: constraints
- Title: "Minimal-diff policy for build/test fixes"
- Status: active

Memory will auto-expire in 30 days. Future agents will reference the Mai entry.
```

---

### Pattern 4: Cross-Session Continuity

**Scenario:** You're resuming work from a previous session.

**What you do:**

```ts
// Start new session, search for context
const memories = memory({
  mode: "search",
  query: "feature name implementation progress",
});

// List recent memories to see what was done
const recent = memory({ mode: "list", limit: 20 });

// Check Master's preferences for this feature
const profile = memory({ mode: "profile" });
```

**Expected outcome:**

```
Found memories:
- "Completed: Database schema design, API endpoints drafted"
- "Blocked: Need AWS credentials for S3 integration testing"
- "Decision: Use async/await for all I/O operations"
- "Master feedback: Prefers comprehensive error handling"

Recent work:
- [Session 1] Schema design completed
- [Session 2] API endpoints drafted, blocked on AWS creds
- [Session 3] (current) Resume with S3 integration

Master preferences:
- Comprehensive error handling
- Clear logging for debugging
- Test coverage >80%
```

**How to report:**

```
STATUS UPDATE:
- COMPLETED: N/A (resuming from previous session)
- STARTING: S3 integration testing (blocked on AWS credentials)
- MEMORY SEARCH: Found 5 relevant memories; resuming from where we left off
- BLOCKERS: Waiting on AWS credentials from Grayfia
- ETA: tracking
```

---

## Memory hygiene best practices

### What makes a memory valuable for promotion?

| Characteristic | Good Example                             | Bad Example              |
| -------------- | ---------------------------------------- | ------------------------ |
| **Durable**    | "Master prefers JWT for APIs"            | "I used JWT today"       |
| **Actionable** | "Use Redis for distributed caching"      | "Caching is important"   |
| **Specific**   | "5-minute TTL for user data"             | "Set appropriate TTL"    |
| **Recurring**  | "Seen in 3+ sessions"                    | "Happened once"          |
| **Clear**      | "Explicit error types improve debugging" | "Error handling matters" |

### Promotion checklist

- [ ] Will this guide work >30 days from now?
- [ ] Is this project-wide or session-specific?
- [ ] Have we seen this pattern multiple times?
- [ ] Is the insight clear and actionable?
- [ ] Does it belong in Mai (not just opencode-mem)?

### How to write good escalation messages

**Template:**

```
ESCALATION TO RIAS - MEMORY PROMOTION:
- MEMORY: [One-sentence summary of the insight]
- CONTEXT: [Why this matters, where you saw it]
- RECOMMENDATION: [Which Mai table: decisions/patterns/constraints/issues]
- RATIONALE: [Why this should be permanent]
- IMPACT: [How this will guide future work]
```

**Good example:**

```
ESCALATION TO RIAS - MEMORY PROMOTION:
- MEMORY: "Master prefers minimal-diff fixes for build errors"
- CONTEXT: Observed in 5+ sessions (build failures, test fixes, linting)
- RECOMMENDATION: Create constraint entry in Mai
- RATIONALE: This is a permanent preference that affects scope/approach decisions
- IMPACT: Future agents will make better decisions on fix scope
```

**Bad example:**

```
ESCALATION TO RIAS - MEMORY PROMOTION:
- MEMORY: "We used JWT today"
- CONTEXT: Implemented authentication
- RECOMMENDATION: Add to patterns
- RATIONALE: It's important
```

---

## Common pitfalls & solutions

### Pitfall 1: Using memory for durable decisions

**Problem:**

```typescript
// WRONG: Storing architectural decision in memory
memory({
  mode: "add",
  content: "We decided to use microservices architecture",
});
```

**Why it's wrong:**

- Memories expire after 30 days
- Architectural decisions are permanent
- Future agents won't find this decision

**Solution:**

```typescript
// RIGHT: Create Mai entry for durable decision
mai_context_db_create_context_entry({
  table: "decisions",
  data: {
    title: "Use microservices architecture",
    decision_type: "architecture",
    rationale: "Enables independent scaling and deployment",
    status: "active",
  },
});
```

---

### Pitfall 2: Not searching before starting similar work

**Problem:**

```typescript
// WRONG: Start work without checking memories
// Spend 2 hours researching authentication
// Discover you solved this 3 sessions ago
```

**Why it's wrong:**

- Duplicate work
- Wasted time
- Missed learning from past work

**Solution:**

```typescript
// RIGHT: Search first
const memories = memory({
  mode: "search",
  query: "authentication implementation",
});
// Found: "Implemented JWT with refresh tokens, tested with 100+ concurrent users"
// Reuse approach, save 2 hours
```

---

### Pitfall 3: Ignoring user profile preferences

**Problem:**

```typescript
// WRONG: Implement feature without checking Master's preferences
// Spend 3 hours on comprehensive error handling
// Master says: "I prefer minimal error handling for this feature"
```

**Why it's wrong:**

- Wasted effort
- Misaligned with Master's preferences
- Rework required

**Solution:**

```typescript
// RIGHT: Check profile first
const profile = memory({ mode: "profile" });
// Found: "Master prefers minimal error handling for internal tools"
// Adjust approach, save 2 hours
```

---

### Pitfall 4: Poor search queries (too broad/narrow)

**Problem:**

```typescript
// TOO BROAD: Returns 10 unrelated memories
memory({ mode: "search", query: "code" });

// TOO NARROW: Returns 0 memories
memory({ mode: "search", query: "specific-variable-name-from-session-3" });
```

**Why it's wrong:**

- Broad queries: Noise, hard to find relevant memories
- Narrow queries: Miss relevant memories

**Solution:**

```typescript
// GOOD: Specific but not too narrow
memory({ mode: "search", query: "API response caching strategy" });
memory({ mode: "search", query: "Master preferences for error handling" });
memory({ mode: "search", query: "authentication implementation approach" });

// Tips:
// - Include context: "API response caching" > "caching"
// - Be specific: "Redis" > "database"
// - Search by pattern: "Master prefers X" > "X"
// - Search by decision: "architectural decision" > "decision"
```

---

### Pitfall 5: Over-escalating low-value memories

**Problem:**

```
ESCALATION TO RIAS - MEMORY PROMOTION:
- MEMORY: "I used console.log for debugging today"
- CONTEXT: Debugging a feature
- RECOMMENDATION: Add to patterns
- RATIONALE: It's useful
```

**Why it's wrong:**

- Not a pattern (one-time observation)
- Not durable (debugging approach changes)
- Wastes Rias's time

**Solution:**

```
Only escalate memories that:
- Appear in 3+ sessions
- Guide future work
- Are specific and actionable
- Belong in Mai (not just opencode-mem)
```

---

### Pitfall 6: Context injection conflicts

**Problem:**

```
Memory says: "Use JWT for authentication"
Mai says: "Use session-based authentication"
Agent is confused about which to follow
```

**Why it's wrong:**

- Conflicting guidance
- Agent doesn't know which is correct
- Leads to wrong decisions

**Solution:**

```
Context injection priority (ALWAYS follow this order):
1. Mai decisions/constraints (permanent, authoritative)
2. opencode-mem memories (recent, contextual)
3. Episodic memory (tool history, optional)

If conflict:
- Mai wins (it's the source of truth)
- Escalate memory conflict to Rias
- Update memory to align with Mai
```

---

### Pitfall 7: Assuming memories are permanent

**Problem:**

```typescript
// WRONG: Assume memory will exist in 60 days
// Session 1: Create memory about caching strategy
// Session 60: Try to find memory, it's gone (expired after 30 days)
```

**Why it's wrong:**

- Memories auto-expire after 30 days
- No guarantee of persistence
- Can't rely on memories for long-term guidance

**Solution:**

```
For permanent knowledge:
- Use Mai Context DB (no expiration)
- Escalate valuable memories for promotion
- Document patterns in README.md

For session-scoped context:
- Use opencode-mem (30-day window)
- Search before starting work
- Don't assume persistence
```

---

## Integration with Mai Context DB

### Complementary architecture

**opencode-mem (ephemeral):**

- Captures session insights automatically
- Provides quick context retrieval
- Expires after 30 days
- Zero cost for searches
- ~$0.02-0.07/session for auto-capture

**Mai Context DB (durable):**

- Stores permanent decisions and constraints
- Requires manual entry
- No expiration
- Free (MCP-based)
- Source of truth for architectural guidance

### Memory → Mai promotion workflow

```
1. opencode-mem captures session insights automatically
2. You identify valuable patterns during work
3. You escalate to Rias if something should be permanent
4. Rias creates Mai entry; memory auto-expires after 30 days
5. Mai entry becomes durable reference for future work
```

### Context injection priority

1. **Priority 1:** Mai decisions/constraints (durable, critical)
2. **Priority 2:** opencode-mem memories (recent, relevant)
3. **Priority 3:** Episodic memory (tool history, optional)

**If conflict:** Mai wins (it's the source of truth)

---

## Quick reference

### Memory tool API

```typescript
// Search for relevant context
memory({ mode: "search", query: "your search query" });

// View Master's learned preferences
memory({ mode: "profile" });

// List recent memories
memory({ mode: "list", limit: 10 });

// Add memory manually (rarely needed)
memory({ mode: "add", content: "your insight" });

// Clear all memories (use with caution)
memory({ mode: "clear" });
```

### When to use what

| Need               | Tool                 | Example                             |
| ------------------ | -------------------- | ----------------------------------- |
| Quick context      | opencode-mem         | "Find past caching implementations" |
| Permanent decision | Mai Context DB       | "Record architectural decision"     |
| Tool history       | Episodic memory      | "Find what tools were used"         |
| User preferences   | opencode-mem profile | "Check Master's preferences"        |
| Uncertain          | Ask Rias             | "Should I use JWT or sessions?"     |

### Common search patterns

```typescript
// Search by task
memory({ mode: "search", query: "implement caching layer" });

// Search by pattern
memory({ mode: "search", query: "Master prefers minimal diffs" });

// Search by technology
memory({ mode: "search", query: "Redis implementation strategy" });

// Search by decision
memory({ mode: "search", query: "authentication approach JWT sessions" });

// Search by problem
memory({ mode: "search", query: "how to handle concurrent requests" });
```

### Configuration summary

| Setting                  | Value                                         |
| ------------------------ | --------------------------------------------- |
| **Embeddings**           | Xenova/nomic-embed-text-v1 (local, zero cost) |
| **Memory extraction**    | gpt-4o-mini (~$0.02-0.07/session)             |
| **Storage**              | ~/.opencode-mem/data                          |
| **Auto-cleanup**         | 30 days                                       |
| **Similarity threshold** | 0.65 (technical content)                      |
| **Max results**          | 10 memories per search                        |
| **Web UI**               | http://127.0.0.1:4747 (localhost-only)        |

---

## Self-test: Validate your understanding

### Question 1: When should you search memories?

**A)** Only when you're stuck  
**B)** Before starting any task  
**C)** Only if Rias asks you to  
**D)** Never, use Mai instead

**Answer:** **B**

**Rationale:** Always search before starting work. It takes <100ms and costs nothing. You might find relevant guidance that saves hours of work.

---

### Question 2: What should you do if memory and Mai conflict?

**A)** Follow memory (it's more recent)  
**B)** Follow Mai (it's authoritative)  
**C)** Ask Rias to resolve the conflict  
**D)** Use your best judgment

**Answer:** **B and C**

**Rationale:** Mai is the source of truth (permanent decisions). Follow Mai guidance and escalate the conflict to Rias for clarification.

---

### Question 3: When should you escalate a memory for promotion?

**A)** After every session  
**B)** Only if it appears in 10+ sessions  
**C)** When it's a durable pattern that appears in 3+ sessions  
**D)** Never, memories are temporary

**Answer:** **C**

**Rationale:** Escalate when a pattern is recurring (3+ sessions), durable (guides future work), and actionable (specific and clear).

---

### Question 4: What's the difference between memory and Mai?

**A)** Memory is permanent, Mai is temporary  
**B)** Memory is temporary (30 days), Mai is permanent  
**C)** They're the same thing  
**D)** Memory is for preferences, Mai is for decisions

**Answer:** **B**

**Rationale:** Memory expires after 30 days; Mai is permanent. Use memory for recent context, Mai for durable guidance.

---

### Question 5: Should you check Master's profile before starting work?

**A)** No, it's a waste of time  
**B)** Only if you're uncertain  
**C)** Yes, always check preferences first  
**D)** Only for complex features

**Answer:** **C**

**Rationale:** Checking profile takes <100ms and helps you align with Master's preferences from the start. Saves rework later.

---

## Closing notes

**opencode-mem is a tool for continuity, not replacement.** It helps you:

- Remember what you learned in past sessions
- Understand Master's preferences
- Identify patterns worth documenting
- Make better decisions faster

**Use it liberally.** Searching takes <100ms and costs nothing. The worst that happens is you find no relevant memories. The best that happens is you save hours of work.

**Promote valuable memories to Mai.** When you find a pattern that will guide work >30 days from now, escalate it to Rias. Mai is the permanent record; memories are the short-term context.

**Balance with Mai Context DB.** Memories are recent and contextual; Mai is permanent and authoritative. Use both together for the best results.

---

**Related skills:**

- `mai-context-db-playbook` — For durable decisions and permanent knowledge
- `protocol-verify` — For delegation protocol compliance
- `context-checkpoint` — For capturing project state

**Questions?** Escalate to Rias or contact Rossweisse (LLM Systems Specialist).
