# Mai Context DB (MCP) - Quick Start

## Preconditions
- MCP server running (Docker)
- OpenCode restarted after MCP registration

## Key tools (exact names)
- `mai-context-db_query_context`
- `mai-context-db_search_context`
- `mai-context-db_semantic_search`
- `mai-context-db_create_context_entry`
- `mai-context-db_update_context`
- `mai-context-db_delete_context`
- `mai-context-db_get_vector_stats`
- `mai-context-db_vector_search_health_check`

## Example: query recent decisions
```ts
mai_context_db_query_context({
  table: "decisions",
  filters: { status: "active" },
  limit: 5,
  order_by: "created_at DESC"
})
```

## Example: full-text search
```ts
mai_context_db_search_context({ query: "authentication", limit: 20 })
```

## Example: semantic search
```ts
mai_context_db_semantic_search({ query: "how do we handle authentication?", limit: 5 })
```

## Troubleshooting
- If tools missing: restart OpenCode.
- If server down: restart the MCP container and re-check health.
