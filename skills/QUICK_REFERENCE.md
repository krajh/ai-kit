# Skills - Quick Reference

## Core skills
- **context-checkpoint** (Mai): save state across sessions
- **agent-status** (Rias): status snapshot + blockers + health
- **monitor-heartbeat** (Rias): detect silent agents
- **protocol-verify** (Rias): confirm Delegation Protocols v1.2 compliance
- **peerage-assemble** (Rias): choose the right agent(s)

## Typical workflow
1. `peerage-assemble` (pick agent(s))
2. Delegate with **Delegation Protocols v1.2**
3. During execution: `agent-status` + `monitor-heartbeat`
4. Before accepting completion: `protocol-verify`
5. At milestone/session end: `context-checkpoint`
