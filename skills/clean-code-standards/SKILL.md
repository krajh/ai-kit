---
name: clean-code-standards
description: Enforce minimal comments and maximum readability. Self-documenting code standards for professional teams.
---

# Clean Code Standards

**Purpose:** Enforce minimal comments and maximum readability through self-documenting code practices.

**When to load:** When implementing features, reviewing code, or refactoring.

---

## Core Policy

**Comments should only exist for difficult-to-understand code.**

Write readable, self-documenting code. Keep it simple; only branch into complexity when simplicity fails. Minimize inline comments except for critical constraints and non-obvious business rules.

---

## 1. Comment Discipline

### When comments ARE allowed

1. **Critical platform constraints:** `// MUST be called synchronously from user gesture (iOS Audio API requirement)`
2. **Non-obvious business rules:** `// Tax calculation rounds DOWN per IRS Publication 17 (2024), Section 3`
3. **Workarounds for library/framework bugs:** `// Workaround: React 18.2 bug #12345 — remove when upgrading to 18.3+`

### What NOT to comment

- ❌ Explaining what the code does (make it obvious instead)
- ❌ Restating variable names
- ❌ Documenting obvious flow (`// Check if user is authenticated` before `if (!user) return`)

---

## 2. Self-Documentation Patterns

### Descriptive function names — verb + noun, clear intent

```typescript
// Good
unlockFromGesture();
handleButtonClick();
loadDefaultWalletKeypair();

// Bad
process();
handle();
doStuff();
```

### Meaningful variable names — domain-specific

```typescript
// Good
masterGain;
selectedTransactionCurrency;
buffers: Map<string, AudioBuffer>;

// Bad
mg;
stc;
buf;
```

### Single responsibility — one clear job per function

### Early returns & guard clauses — fail fast, reduce nesting

```typescript
// Good
if (!user) return;
if (!input) return;
processValidInput(input);

// Bad — deep nesting
if (user) { if (input) { if (valid) { ... } } }
```

### Typed interfaces document structure

```typescript
export interface CurrencyDisplayOption {
  currency: string;
  display: string;
}
```

### Constants at top — no magic numbers inline

```typescript
const SOL_CLI_CONFIG_PATH = "~/.config/solana/cli/config.yml";
```

---

## 3. Readability Checklist (Pre-Submit)

- [ ] Minimal inline comments (or only allowed exceptions)
- [ ] Function names are verb+noun and obvious
- [ ] Variable names are domain-specific and clear
- [ ] Functions have single responsibility
- [ ] Early returns used instead of deep nesting
- [ ] Types/interfaces document structure
- [ ] Constants extracted for magic numbers
- [ ] Logic flow is obvious from structure
- [ ] No commented-out code (use git history)

---

## 4. Language Patterns

### TypeScript/JavaScript

Prefer: destructuring, async/await, template strings, `const`, `?.` optional chaining, `??` nullish coalescing.

```typescript
const { currency, amount } = transaction;
const result = await loadDefaultWalletKeypair();
const balance = user?.wallet?.balance ?? 0;
```

### React/TSX

Prefer: computed getters for derived state, early returns in render, obvious handler names.

```typescript
get badgeProps() { return this.props.badge ? { badge: this.props.badge } : {}; }
handleButtonClick(value: string) {
  if (value === 'C') { this.handleClear(); return; }
  this.handleInput(value);
}
```

---

## 5. Enforcement

**Code Reviewer flags:** unnecessary inline comments, vague function/variable names, god functions (>50 lines), deep nesting (>3 levels), magic numbers, commented-out code.

**Implementers:** run Readability Checklist (§3) before requesting review.

**When complexity IS necessary** (performance, platform constraints): isolate into small focused functions, name it clearly, comment the WHY not the WHAT.

```typescript
// Transaction size limit is 1232 bytes; batch to stay under limit
function batchTransactionsForBlockchain(txs: Transaction[]) {
  const MAX_TX_SIZE = 1200; // Leave 32-byte buffer
  // ... batching logic
}
```

---

## Quick Reference

**Comment policy:** Minimal by default. Allowed: platform constraints, non-obvious business rules, workarounds. Forbidden: explaining what code does, restating names, obvious flow.

**Self-doc patterns:** descriptive names (verb+noun) · single responsibility · early returns · typed interfaces · constants at top

**Quality gates:** Reviewer flags bloat · Implementers self-check · Coordinator spot-checks on handoffs

---

**Best Practice:** Study high-quality codebases in your organization — emulate their patterns, protect their standards.
