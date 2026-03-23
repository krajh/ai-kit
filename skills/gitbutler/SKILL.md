---
name: gitbutler
description: Master GitButler virtual branches for parallel work, stacked changes, and fearless experimentation. Use when working on multiple features simultaneously, managing complex branch dependencies, or needing unlimited undo for git operations. Triggers on "virtual branches", "parallel work", "stacked branches", "gitbutler", or "work on multiple things at once".
---

# GitButler - Virtual Branch Workflow

**Purpose:** Enable parallel feature development, stacked changes, and fearless git experimentation through virtual branches.

**Core Philosophy:** Work on multiple features simultaneously without branch switching. Every operation is reversible. Conflicts are first-class citizens.

---

## Installation Status

**CLI Binary:** `but` (built from source, installed in `~/.local/bin/`)  
**Version:** Latest from main branch  
**Data Directory:** `~/.local/share/com.gitbutler.app/`

**Prerequisites:**

- Rust toolchain (for building from source)
- `libdbus-1-dev` and `pkg-config` (Linux only)

---

## Core Concepts

### Virtual Branches

**Unlike traditional Git branches:**

- Work on multiple branches simultaneously without switching
- Changes automatically organized by branch
- Apply/unapply branches to workspace instantly
- Create commits on specific branches while working on others

### Stacked Branches (Series)

**Build changes on top of each other:**

- Create dependent feature branches
- Auto-restack when base changes
- Push individual series as PRs
- Manage complex dependency chains easily

### First-Class Conflicts

**Conflicts don't block you:**

- Rebases always succeed
- Conflicts marked inline
- Resolve in any order
- Continue working on other branches while conflicts exist

### Unlimited Undo

**Every operation is reversible:**

- Full operation history timeline
- Time-travel to any previous state
- Undo rebases, commits, branch operations
- No fear of destructive operations

---

## Command Reference

### Project Management

**Add repository as GitButler project:**

```bash
but project add <path>
```

**List all GitButler projects:**

```bash
but project
# or
but projects
```

**Options:**

- `--app-data-dir <PATH>` - Override data directory (env: GITBUTLER_CLI_DATA_DIR)
- `--app-suffix <SUFFIX>` - Version suffix (e.g., 'dev')

---

### Virtual Branch Operations

**List virtual branches:**

```bash
but branch
# or
but branches
```

**Create new virtual branch:**

```bash
but branch create <NAME>

# Make it default (owner of new edits)
but branch create <NAME> --set-default
but branch create <NAME> -d
```

**Apply branch to workspace:**

```bash
but branch apply <NAME>
```

**Commit changes to specific branch:**

```bash
but branch commit <NAME> -m "commit message"
```

**Create stacked series:**

```bash
but branch series <NAME> --series-name <SERIES_NAME>
but branch series <NAME> -s <SERIES_NAME>
```

---

### Global Options

**Debug tracing:**

```bash
but -d <command>
but --trace <command>
```

**Override working directory:**

```bash
but -C /path/to/repo <command>
but --current-dir /path/to/repo <command>
```

---

## Workflow Patterns

### Pattern 1: Parallel Feature Development

**Scenario:** Working on authentication + UI redesign + bug fix simultaneously

```bash
# Navigate to repo
cd /path/to/project

# Add as GitButler project (first time only)
but project add .

# Create virtual branches
but branch create auth-feature -d
but branch create ui-redesign
but branch create hotfix-login-bug

# Work on auth, make changes, commit to auth branch
# (edit files related to auth)
but branch commit auth-feature -m "Add JWT authentication"

# Work on UI, make changes, commit to UI branch
# (edit UI files)
but branch commit ui-redesign -m "Redesign login page"

# Work on bug fix, commit to hotfix branch
# (fix bug)
but branch commit hotfix-login-bug -m "Fix login validation edge case"

# All branches developed in parallel, no switching!
```

### Pattern 2: Stacked Feature Branches

**Scenario:** Building dependent features (base → enhancement → polish)

```bash
# Create base feature branch
but branch create api-base -d

# Make changes, commit
but branch commit api-base -m "Add basic API endpoint"

# Stack next feature on top
but branch series api-base -s api-auth
but branch commit api-auth -m "Add authentication to API"

# Stack polish layer
but branch series api-auth -s api-rate-limit
but branch commit api-rate-limit -m "Add rate limiting"

# When api-base changes, api-auth and api-rate-limit auto-restack!
```

### Pattern 3: Fearless Experimentation

**Scenario:** Try risky refactoring without fear

```bash
# Create experimental branch
but branch create experimental-refactor

# Make aggressive changes
# (refactor entire module)
but branch commit experimental-refactor -m "Refactor module architecture"

# If it works: keep it
# If it breaks: unapply branch, workspace reverts instantly
but branch apply experimental-refactor  # or unapply to revert

# Unlimited undo: can always time-travel back
# (Use GUI for timeline navigation)
```

### Pattern 4: Multi-Agent Parallel Work

**Scenario:** Coordinator orchestrating implementer (backend) + implementer (frontend) + strategist (infra)

```bash
# Initialize project
but project add /path/to/project

# Create branches for each agent's work
but branch create backend-api -d        # Backend implementer's domain
but branch create frontend-ui           # Frontend implementer's domain
but branch create infrastructure        # Strategist's domain

# Each agent commits to their own branch
# (Backend implementer works on API)
but branch commit backend-api -m "Add user service endpoints"

# (Frontend implementer works on UI, parallel)
but branch commit frontend-ui -m "Build user management UI"

# (Strategist sets up deployment, parallel to both)
but branch commit infrastructure -m "Configure k8s deployment"

# All work happens simultaneously without conflicts
# Integration testing: apply all branches at once
```

### Pattern 5: Conflict-Driven Development

**Scenario:** Multiple features touching same files

```bash
# Create branches that will conflict
but branch create feature-a -d
but branch create feature-b

# Make conflicting changes
but branch commit feature-a -m "Modify shared module method A"
but branch commit feature-b -m "Modify shared module method B"

# Rebase succeeds, conflicts marked inline
# Resolve conflicts in any order, anytime
# Continue working on other branches while conflicts exist

# GitButler handles conflict markers, resolution, and restacking
```

---

## Integration with Multi-Agent Workflow

### For Coordinator

**Use GitButler for:**

- Orchestrating parallel agent work (each agent = virtual branch)
- Managing stacked deliverables (base → enhancement → polish)
- Fearless experimentation with rollback safety
- Continuous integration testing (apply all branches, run tests)

**Workflow:**

```bash
# Setup project for multi-agent work
but project add /path/to/project

# Create branches for each specialist
but branch create implementer-backend
but branch create implementer-frontend
but branch create strategist-infra
but branch create reviewer-review

# Agents commit to their branches independently
# Coordinator tests integration by applying all branches
# Coordinator creates stacked series for dependent work
```

### For Specialists (implementer, strategist, reviewer, etc.)

**Use GitButler for:**

- Working on assigned feature without branch switching overhead
- Building stacked changes (refactor → implement → optimize)
- Experimental approaches with instant rollback
- Keeping work isolated while testing integration

**Workflow:**

```bash
# Work on assigned branch
but branch commit <your-branch> -m "Implement feature"

# Create stacked enhancement
but branch series <your-branch> -s <enhancement-name>

# Experiment freely (unlimited undo via timeline)
# Commit incremental progress frequently
```

### For Frieren (Context Manager)

**Use GitButler for:**

- Preserving experimental branch states across sessions
- Tracking which branches contain which decisions
- Managing long-lived feature branches that span sessions
- Time-travel to previous project states for context recovery

**Integration with Frieren:**

```typescript
// When creating an important virtual branch
but branch create <feature> -d

// Record the branch decision in Frieren wisdom plane
await frieren_wisdom_write({
  type: "decision",
  content: "Created virtual branch: <feature> — parallel work using GitButler",
  tags: ["gitbutler", "branch", "<feature>"],
  evidence: ["GitButler branch: <feature>"],
  confidence: 0.9,
});
```

---

## Best Practices

### DO:

- ✓ Create virtual branches liberally (they're cheap and reversible)
- ✓ Use stacked series for dependent features
- ✓ Commit frequently to virtual branches (undo is free)
- ✓ Apply/unapply branches to test integration
- ✓ Use descriptive branch names (they're your workspace organization)
- ✓ Leverage unlimited undo for fearless experimentation

### DON'T:

- ✗ Force yourself to finish one feature before starting another
- ✗ Fear making commits (they're all reversible)
- ✗ Avoid rebasing (GitButler makes it safe)
- ✗ Hesitate to experiment (undo is always available)
- ✗ Manually manage complex branch dependencies (use stacked series)

---

## Troubleshooting

### Data directory doesn't exist

```bash
mkdir -p ~/.local/share/com.gitbutler.app
```

### Project not found

```bash
# Re-add project
cd /path/to/repo
but project add .
```

### Branch operations fail

```bash
# Enable debug tracing
but -d branch <command>

# Check current branches
but branch
```

### Need to rebuild CLI

```bash
cd /tmp/gitbutler
git pull
cargo build --release -p gitbutler-cli
cp target/release/gitbutler-cli ~/.local/bin/but
```

---

## Advanced Usage

### Environment Variables

**Override data directory:**

```bash
export GITBUTLER_CLI_DATA_DIR=/custom/path
but project add .
```

**Debug mode:**

```bash
but --trace branch  # Sends debug info to stderr
```

### Multi-Repo Management

**List all projects:**

```bash
but project
```

**Work across repos:**

```bash
but -C /path/to/repo1 branch
but -C /path/to/repo2 branch
```

---

## Comparison to Traditional Git

| Operation          | Traditional Git                                             | GitButler                                   |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------- |
| Work on 2 features | `git checkout feat-a` → work → `git checkout feat-b` → work | Work on both simultaneously, commit to each |
| Stacked branches   | Manual `git rebase` chain                                   | Auto-restacking series                      |
| Undo commit        | `git reset --hard` (destructive)                            | Time-travel in timeline (non-destructive)   |
| Resolve conflicts  | Block progress until resolved                               | Mark and continue, resolve anytime          |
| Experiment         | Fear of breaking things                                     | Unlimited undo, fearless experimentation    |

---

## Integration Points

### With Git

- GitButler operates on standard Git repos
- Virtual branches map to real Git branches
- Can use Git and GitButler simultaneously
- Commits are standard Git commits

### With GitHub/GitLab

- Push virtual branches as regular branches
- Create PRs from stacked series
- CI/CD works normally
- Forge integration in GUI (not CLI yet)

### With Delegation Protocols

- Each virtual branch = one delegated task
- Stacked series = dependent task chain
- Branch commits = checkpoints for STATUS UPDATE
- Apply/unapply = activation/deactivation of work

---

## Skill Triggers

Load this skill when:

- User says "virtual branches", "gitbutler", "parallel work"
- Orchestrating multi-agent parallel development
- Managing complex branch dependencies
- Need unlimited undo for git operations
- Working on multiple features simultaneously
- Building stacked feature branches
- Experimenting with risky changes

---

## Resources

**Repository:** https://github.com/gitbutlerapp/gitbutler  
**Documentation:** https://docs.gitbutler.com  
**CLI Binary:** `but` (installed in `~/.local/bin/`)  
**Data Directory:** `~/.local/share/com.gitbutler.app/`

**Built from source:** See AGENTS.md for rebuild instructions

---

**Last Updated:** February 9, 2026  
**Maintained by:** Coordinator
