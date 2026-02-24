# Skills - Quick Reference

## Core skills

- **context-checkpoint**: save state across sessions
- **agent-selection**: pick the right agent(s)
- **protocol-verify**: confirm Delegation Protocols compliance

## Typical workflow

1. `agent-selection` (pick agent(s))
2. Delegate with **Delegation Protocols**
3. During execution: enforce checkpoint-driven STATUS UPDATEs
4. Before accepting completion: `protocol-verify`
5. At milestone/session end: `context-checkpoint`
