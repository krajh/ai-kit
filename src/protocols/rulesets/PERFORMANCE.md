# Performance ruleset

## Defaults

- Avoid unnecessary overhead (extra passes, deep copies, heavy logging).
- Avoid unbounded work: cap list sizes, recursion depth; page results.

## Profiling triggers

- If you touch hot paths, parsing loops, or anything invoked per-request, add a quick benchmark/profiling note.
- If complexity increases (e.g. `O(n)`  `O(n^2)`), call it out + propose mitigation.

## Baselines

- If there are established performance baselines, dont regress them without discussion.
