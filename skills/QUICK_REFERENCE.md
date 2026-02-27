# Skills - Quick Reference

## Core skills

- **context-checkpoint**: save state across sessions
- **agent-routing**: pick the right agent(s)
- **delegation-protocols**: confirm Delegation Protocols compliance

## Typical workflow

1. `agent-routing` (pick agent(s))
2. Delegate with **Delegation Protocols**
3. During execution: enforce checkpoint-driven STATUS UPDATEs
4. Before accepting completion: `delegation-protocols`
5. At milestone/session end: `context-checkpoint`
