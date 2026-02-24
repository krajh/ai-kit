"""
MCP Client for Skills Integration

Provides a simple interface for Superpowers skills to interact with
Mai's Context Database via the MCP server.

Author: Rias Gremory (Coordination)
Date: December 3, 2025
"""

import asyncio
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add MCP server to path
mcp_path = Path.home() / ".config" / "opencode" / "external" / "context-db-mcp"
sys.path.insert(0, str(mcp_path))

from database.connection import get_pool, close_pool
from database.queries import QueryHelper


class MCPClient:
    """
    Client for interacting with Mai's Context Database.

    Provides high-level methods for skills to store and retrieve context.
    Handles connection pooling and error handling automatically.
    """

    def __init__(self):
        """Initialize MCP client"""
        self.pool = None
        self.helper = None
        self._initialized = False

    async def initialize(self):
        """Initialize database connection pool"""
        if self._initialized:
            return

        self.pool = await get_pool()
        self.helper = QueryHelper(self.pool)
        self._initialized = True

    async def close(self):
        """Close database connection pool"""
        if self._initialized:
            await close_pool()
            self._initialized = False

    # ========================================================================
    # CHECKPOINT OPERATIONS (for context-checkpoint skill)
    # ========================================================================

    async def create_checkpoint(
        self,
        project: str,
        milestone: str,
        accomplishments: List[str],
        decisions: List[Dict[str, Any]],
        blockers: List[Dict[str, Any]],
        next_steps: List[str],
        created_by: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Create a checkpoint in the database.

        Args:
            project: Project identifier
            milestone: Milestone name
            accomplishments: List of accomplishments
            decisions: List of decisions made
            blockers: List of blockers encountered
            next_steps: List of next steps
            created_by: Who created the checkpoint
            metadata: Optional additional metadata

        Returns:
            Checkpoint ID (UUID)
        """
        await self.initialize()

        # Store checkpoint as a session entry
        # Note: Using context_snapshot for checkpoint data
        checkpoint_snapshot = {
            "milestone": milestone,
            "accomplishments": accomplishments,
            "decisions": decisions,
            "blockers": blockers,
            "next_steps": next_steps,
            "metadata": metadata or {},
        }

        # Create session entry
        import json

        query = """
            INSERT INTO sessions (
                session_name, project_id, focus_area,
                work_completed, blockers_encountered, context_snapshot,
                created_by, status
            ) VALUES ($1, $2::uuid, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
            RETURNING id
        """
        result = await self.pool.fetchrow(
            query,
            f"Checkpoint: {milestone}",
            project,
            milestone,
            "\n".join(accomplishments),
            json.dumps({"blockers": blockers}),
            json.dumps(checkpoint_snapshot),
            created_by,
            "active",
        )

        return str(result["id"])

    async def get_checkpoint(self, checkpoint_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a checkpoint by ID.

        Args:
            checkpoint_id: Checkpoint UUID

        Returns:
            Checkpoint data or None if not found
        """
        await self.initialize()

        query = "SELECT * FROM sessions WHERE id = $1"
        result = await self.pool.fetchrow(query, checkpoint_id)

        return dict(result) if result else None

    async def query_checkpoints(
        self, project: Optional[str] = None, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Query checkpoints with optional filters.

        Args:
            project: Filter by project ID
            limit: Maximum results

        Returns:
            List of checkpoints
        """
        await self.initialize()

        query = "SELECT * FROM sessions WHERE 1=1"
        params = []
        param_count = 1

        if project:
            query += f" AND project_id::text = ${param_count}"
            params.append(project)
            param_count += 1

        query += f" ORDER BY started_at DESC LIMIT ${param_count}"
        params.append(limit)

        results = await self.pool.fetch(query, *params)
        return [dict(r) for r in results]

    # ========================================================================
    # AGENT STATUS OPERATIONS (for agent-status skill)
    # ========================================================================

    async def record_agent_interaction(
        self,
        agent_name: str,
        task_description: str,
        project_id: Optional[str] = None,
        session_id: Optional[str] = None,
        input_context: Optional[Dict[str, Any]] = None,
        task_completed: bool = False,
        effectiveness_rating: Optional[str] = None,
    ) -> str:
        """
        Record an agent interaction.

        Args:
            agent_name: Name of the agent
            task_description: Description of the task
            project_id: Optional project UUID
            session_id: Optional session UUID
            input_context: Optional input context data
            task_completed: Whether task is completed
            effectiveness_rating: Optional rating (excellent, good, fair, poor)

        Returns:
            Interaction ID (UUID)
        """
        await self.initialize()

        import json

        query = """
            INSERT INTO agent_interactions (
                agent_name, task_description, project_id, session_id,
                input_context, task_completed, effectiveness_rating
            ) VALUES ($1, $2, $3::uuid, $4::uuid, $5::jsonb, $6, $7)
            RETURNING id
        """
        result = await self.pool.fetchrow(
            query,
            agent_name,
            task_description,
            project_id,
            session_id,
            json.dumps(input_context or {}),
            task_completed,
            effectiveness_rating,
        )

        return str(result["id"])

    async def get_agent_status(
        self,
        agent_name: Optional[str] = None,
        project_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Get recent agent interactions (status).

        Args:
            agent_name: Filter by specific agent (None = all agents)
            project_id: Filter by project UUID
            limit: Maximum results

        Returns:
            List of agent interactions
        """
        await self.initialize()

        query = "SELECT * FROM agent_interactions WHERE 1=1"
        params = []
        param_count = 1

        if agent_name:
            query += f" AND agent_name = ${param_count}"
            params.append(agent_name)
            param_count += 1

        if project_id:
            query += f" AND project_id = ${param_count}::uuid"
            params.append(project_id)
            param_count += 1

        query += f" ORDER BY started_at DESC LIMIT ${param_count}"
        params.append(limit)

        results = await self.pool.fetch(query, *params)
        return [dict(r) for r in results]

    async def complete_agent_interaction(
        self,
        interaction_id: str,
        output_summary: Optional[str] = None,
        issues_encountered: Optional[Dict[str, Any]] = None,
        blockers: Optional[Dict[str, Any]] = None,
        effectiveness_rating: Optional[str] = None,
    ) -> bool:
        """
        Mark an agent interaction as complete.

        Args:
            interaction_id: Interaction UUID
            output_summary: Summary of output
            issues_encountered: Issues encountered during task
            blockers: Blockers encountered
            effectiveness_rating: Rating (excellent, good, fair, poor)

        Returns:
            True if successful
        """
        await self.initialize()

        import json
        from datetime import datetime

        query = """
            UPDATE agent_interactions
            SET completed_at = $1,
                duration_seconds = EXTRACT(EPOCH FROM ($1 - started_at))::integer,
                output_summary = $2,
                issues_encountered = $3::jsonb,
                blockers = $4::jsonb,
                task_completed = true,
                effectiveness_rating = $5
            WHERE id = $6::uuid
        """

        await self.pool.execute(
            query,
            datetime.now(),
            output_summary,
            json.dumps(issues_encountered or {}),
            json.dumps(blockers or {}),
            effectiveness_rating,
            interaction_id,
        )

        return True

    # ========================================================================
    # DECISION OPERATIONS
    # ========================================================================

    async def create_decision(
        self,
        title: str,
        description: str,
        decision_type: str,
        rationale: str,
        affected_components: List[str],
        impact_level: str,
        created_by: str,
        status: str = "active",
    ) -> str:
        """
        Create a decision record.

        Args:
            title: Decision title
            description: Detailed description
            decision_type: Type (architecture, technical, operational)
            rationale: Why this decision was made
            affected_components: Components affected
            impact_level: Impact level (low, medium, high, critical)
            created_by: Who made the decision
            status: Status (active, superseded, archived)

        Returns:
            Decision ID (UUID)
        """
        await self.initialize()

        result = await self.helper.create_decision(
            title=title,
            description=description,
            decision_type=decision_type,
            rationale=rationale,
            affected_components=affected_components,
            impact_level=impact_level,
            created_by=created_by,
            status=status,
        )

        return str(result["id"])

    async def query_decisions(
        self,
        status: Optional[str] = None,
        decision_type: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Query decisions with filters.

        Args:
            status: Filter by status
            decision_type: Filter by decision type
            limit: Maximum results

        Returns:
            List of decisions
        """
        await self.initialize()

        results = await self.helper.query_decisions(
            status=status, decision_type=decision_type, limit=limit
        )

        return [dict(r) for r in results]

    # ========================================================================
    # ISSUE OPERATIONS
    # ========================================================================

    async def create_issue(
        self,
        title: str,
        description: str,
        issue_type: str,
        severity: str,
        created_by: str,
        component_affected: Optional[str] = None,
    ) -> str:
        """
        Create an issue record.

        Args:
            title: Issue title
            description: Detailed description
            issue_type: Type (bug, performance, security, etc.)
            severity: Severity (low, medium, high, critical)
            created_by: Who reported the issue
            component_affected: Affected component

        Returns:
            Issue ID (UUID)
        """
        await self.initialize()

        result = await self.helper.create_issue(
            title=title,
            description=description,
            issue_type=issue_type,
            severity=severity,
            created_by=created_by,
            component_affected=component_affected,
        )

        return str(result["id"])

    async def query_issues(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Query issues with filters.

        Args:
            status: Filter by resolution status
            severity: Filter by severity
            limit: Maximum results

        Returns:
            List of issues
        """
        await self.initialize()

        results = await self.helper.query_issues(
            status=status, severity=severity, limit=limit
        )

        return [dict(r) for r in results]

    # ========================================================================
    # SEARCH OPERATIONS
    # ========================================================================

    async def search_all(
        self, query_text: str, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Full-text search across all tables.

        Args:
            query_text: Search query
            limit: Maximum results

        Returns:
            List of matching records
        """
        await self.initialize()

        results = await self.helper.search_all(query_text=query_text, limit=limit)

        return [dict(r) for r in results]


# ============================================================================
# CONVENIENCE FUNCTIONS (for skills that don't want to manage client lifecycle)
# ============================================================================

_global_client: Optional[MCPClient] = None


async def get_client() -> MCPClient:
    """Get or create global MCP client"""
    global _global_client
    if _global_client is None:
        _global_client = MCPClient()
        await _global_client.initialize()
    return _global_client


async def close_client():
    """Close global MCP client"""
    global _global_client
    if _global_client is not None:
        await _global_client.close()
        _global_client = None
