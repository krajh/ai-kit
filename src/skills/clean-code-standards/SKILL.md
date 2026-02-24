---
name: clean-code-standards
description: Enforce minimal comments and maximum readability. Self-documenting code standards for professional teams.
---

# Clean Code Standards

**Purpose:** Enforce minimal comments and maximum readability through self-documenting code practices.

**When to load:** When implementing features, reviewing code, or refactoring.

**Applies to:** All implementers (Implementer, Frontend Specialist, Backend Specialist, Integration Engineer, Build Doctor, Coordinator when coding)

---

## Core Policy

**Comments should only exist for difficult-to-understand code.**

All code must be written in a readable, self-documenting fashion. Keep it simple and elegant; only branch into complexity when simplicity fails.

**Goal:** Minimize inline comments across codebase except for critical constraints and non-obvious business rules.

---

## 1. Comment Discipline

### Default: Minimal inline comments

**Best practice:**

- Strive for zero inline comments in most files
- Only add comments when code alone cannot convey the intent
- Self-documenting code is always preferred over commented code

### When Comments ARE Allowed

**1. Critical platform constraints:**

```typescript
// MUST be called synchronously from user gesture (iOS Audio API requirement)
unlockFromGesture() { ... }
```

**2. Non-obvious business rules from external requirements:**

```typescript
// Tax calculation requires rounding DOWN per IRS Publication 17 (2024), Section 3
const taxAmount = Math.floor(income * rate);
```

**3. Workarounds for library/framework bugs:**

```typescript
// Workaround: React 18.2 bug #12345 - useEffect fires twice in dev mode
// Remove when upgrading to 18.3+
useEffect(() => { ... }, [])
```

### What NOT to Comment

❌ **Explaining what the code does** (make it obvious)

```typescript
// BAD
// Loop through users and filter active ones
const activeUsers = users.filter((u) => u.status === "active");

// GOOD (no comment needed)
const activeUsers = users.filter((u) => u.status === "active");
```

❌ **Restating variable names**

```typescript
// BAD
// The master gain node
const masterGain = ctx.createGain();

// GOOD (no comment)
const masterGain = ctx.createGain();
```

❌ **Documenting obvious flow**

```typescript
// BAD
// Check if user is authenticated
if (!user) return;

// Start processing
processUser(user);

// GOOD (no comments)
if (!user) return;
processUser(user);
```

---

## 2. Self-Documentation Patterns

### Descriptive Function Names

**Pattern:** Verb + noun, clear intent

```typescript
// Good examples
unlockFromGesture();
handleButtonClick();
loadDefaultWalletKeypair();
buildTokenBasePath();
mapEventFromTransaction();
readKeypairFromFile();
```

**Anti-pattern:**

```typescript
// Vague
process();
handle();
doStuff();
execute();
```

### Meaningful Variable Names

**Pattern:** Domain-specific, explicit purpose

```typescript
// Good examples
masterGain;
selectedTransactionCurrency;
inputString;
badgeProperties;
buffers: Map<string, AudioBuffer>;
```

**Anti-pattern:**

```typescript
// Too short/cryptic
mg;
stc;
str;
props;
buf;
```

### Single Responsibility Functions

**Pattern:** One clear job per function

```typescript
export function operationWrapper(config: OperationConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const span = trace.getSpan(context.active());

    try {
      const result = await config.operation(req, res);
      span?.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span?.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span?.end();
    }
  };
}
```

**Anti-pattern:** God functions doing 5+ things

### Early Returns & Guard Clauses

**Pattern:** Fail fast, reduce nesting

```typescript
// Clean pattern
if (!user) return;
if (!input) return;

processValidInput(input);
```

**Anti-pattern:**

```typescript
// Nested pyramids
if (user) {
  if (input) {
    if (valid) {
      // ... deep nesting
    }
  }
}
```

### Clear Structure IS Documentation

**Pattern:** Lifecycle/flow obvious from code organization

```typescript
// Span lifecycle is self-documenting:
const span = trace.getSpan(...)  // Setup
try {
  const result = await config.operation(...)  // Execute
  span?.setStatus({ code: SpanStatusCode.OK })  // Success
  return result
} catch (error) {
  span?.setStatus({ code: SpanStatusCode.ERROR })  // Error
  throw error
} finally {
  span?.end()  // Cleanup
}
```

### Typed Interfaces for Intent

**Pattern:** Type definitions document structure and purpose

```typescript
export interface CurrencyDisplayOption {
  currency: string;
  display: string;
}

export interface Numbers {
  currencyOptions: CurrencyDisplayOption[];
}
```

### Constants at Top

**Pattern:** Configuration/magic numbers as named constants

```typescript
const SOL_CLI_CONFIG_PATH = "~/.config/solana/cli/config.yml";
const KEYTYPE_DIR_HASH: Record<KeyType, string> = {
  wallet: "id.json",
  system: "system-keypair.json",
};
```

---

## 3. Readability Checklist (Pre-Submit)

Before marking work complete, verify:

- [ ] **Minimal inline comments** (or only allowed exceptions)
- [ ] **Function names** are verb+noun and obvious
- [ ] **Variable names** are domain-specific and clear
- [ ] **Functions** have single responsibility
- [ ] **Early returns** used instead of deep nesting
- [ ] **Types/interfaces** document structure
- [ ] **Constants** extracted for magic numbers
- [ ] **Logic flow** is obvious from structure
- [ ] **No commented-out code** (use git history)

---

## 4. Language-Specific Patterns

### TypeScript/JavaScript (Primary)

**Prefer:**

- Destructuring for clarity
- Async/await over promises
- Template strings over concatenation
- `const` over `let`
- `?.` optional chaining
- `??` nullish coalescing

**Examples:**

```typescript
// Destructuring
const { currency, amount } = transaction;

// Clear async/await
const result = await loadDefaultWalletKeypair();

// Optional chaining
const balance = user?.wallet?.balance ?? 0;
```

### React/TSX

**Prefer:**

- Computed getters for derived state
- Early returns in render logic
- Obvious handler names (`handleClick`, not `onClick`)

**Example:**

```typescript
get badgeProps() {
  return this.props.badge ? { badge: this.props.badge } : {}
}

handleButtonClick(value: string) {
  if (value === 'C') {
    this.handleClear()
    return
  }
  this.handleInput(value)
}
```

---

## 5. Enforcement

### Code Review Gate

Code Reviewer will flag:

- Unnecessary inline comments
- Vague function/variable names
- God functions (>50 lines, multiple responsibilities)
- Deep nesting (>3 levels)
- Magic numbers without constants
- Commented-out code

### Self-Check (Implementers)

Before requesting review:

1. Run through Readability Checklist (§3)
2. Read your code aloud—does it make sense without comments?
3. Would you understand this in 6 months?

### Coordinator Check (Handoffs)

When receiving completed work:

- Spot-check for comment bloat
- Verify function/variable naming clarity
- Escalate to Code Reviewer if quality concerns

---

## 6. Examples: Before/After

### Example 1: Over-Commented → Clean

**Before:**

```typescript
// Get the user's wallet balance
function getUserBalance(userId: string) {
  // Find the user in the database
  const user = db.users.find(userId);

  // Check if user exists
  if (!user) {
    // Return null if not found
    return null;
  }

  // Return the balance
  return user.wallet.balance;
}
```

**After (clean code style):**

```typescript
function getUserWalletBalance(userId: string) {
  const user = db.users.find(userId);
  if (!user) return null;
  return user.wallet.balance;
}
```

### Example 2: Cryptic → Self-Documenting

**Before:**

```typescript
function proc(u: User, amt: number) {
  const r = u.bal - amt;
  if (r < 0) throw new Error("Insufficient");
  u.bal = r;
  return r;
}
```

**After (clean code style):**

```typescript
function deductFromUserBalance(user: User, amount: number) {
  const remainingBalance = user.balance - amount;
  if (remainingBalance < 0) {
    throw new Error("Insufficient balance");
  }
  user.balance = remainingBalance;
  return remainingBalance;
}
```

### Example 3: Allowed Comment (Platform Constraint)

```typescript
// MUST be called synchronously from user gesture (iOS Audio API requirement)
unlockFromGesture() {
  if (this.ctx.state === 'suspended') {
    this.ctx.resume()
  }
}
```

---

## 7. When Complexity IS Necessary

Sometimes elegance isn't possible (performance, platform constraints, complex algorithms).

**In those cases:**

1. **Isolate complexity** into small, focused functions
2. **Name it clearly** so intent is obvious
3. **Comment the WHY, not the WHAT**

**Example:**

```typescript
// Transaction size limit is 1232 bytes; batch to stay under limit
function batchTransactionsForBlockchain(txs: Transaction[]) {
  const MAX_TX_SIZE = 1200; // Leave 32-byte buffer
  const batches: Transaction[][] = [];
  let currentBatch: Transaction[] = [];
  let currentSize = 0;

  for (const tx of txs) {
    const txSize = tx.serialize().length;
    if (currentSize + txSize > MAX_TX_SIZE) {
      batches.push(currentBatch);
      currentBatch = [tx];
      currentSize = txSize;
    } else {
      currentBatch.push(tx);
      currentSize += txSize;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}
```

**Why this works:**

- Comment explains the platform constraint (1232-byte limit)
- Constant `MAX_TX_SIZE` documents the magic number
- Variable names are self-documenting (`currentBatch`, `currentSize`)
- Logic flow is clear from structure

---

## Quick Reference

**Comment policy:**

- Default: Minimal inline comments
- Allowed: Platform constraints, non-obvious business rules, workarounds
- Forbidden: Explaining what code does, restating names, documenting obvious flow

**Self-doc patterns:**

- Descriptive function names (verb+noun)
- Meaningful variable names (domain-specific)
- Single responsibility functions
- Early returns & guard clauses
- Clear structure = documentation
- Typed interfaces for intent
- Constants at top

**Quality gates:**

- Code Reviewer flags unnecessary comments
- Implementers self-check before review
- Coordinator spot-checks on handoffs

---

**Best Practice:** Study high-quality codebases in your organization—emulate their patterns, protect their standards.
