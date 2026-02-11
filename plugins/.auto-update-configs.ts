/**
 * Auto-Update Configs Plugin (EXPERIMENTAL)
 *
 * Automatically checks for and pulls updates from configured git repositories.
 * Disabled by default (leading dot) - rename to auto-update-configs.ts to enable.
 *
 * Configuration via environment variables:
 * - AUTO_UPDATE_REPOS: Comma-separated list of repo paths (default: ~/.config/opencode,~/ai-kit)
 * - AUTO_UPDATE_INTERVAL_HOURS: Hours between checks (default: 24)
 *
 * Safety features:
 * - Only updates repos with clean working directories
 * - Fast-forward only (never force)
 * - Silent unless updates occur or errors happen
 */

import { readFile, writeFile, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"
import { $ } from "bun"

const STATE_DIR = join(homedir(), ".config/opencode/.state")
const STATE_FILE = join(STATE_DIR, "auto-update-last-check.json")

const DEFAULT_REPOS = ["~/.config/opencode", "~/ai-kit"]
const DEFAULT_INTERVAL_HOURS = 24

interface UpdateState {
  lastCheck: number
}

async function getState(): Promise<UpdateState> {
  try {
    if (existsSync(STATE_FILE)) {
      const content = await readFile(STATE_FILE, "utf-8")
      return JSON.parse(content)
    }
  } catch (error) {
    // State file doesn't exist or is corrupted, use defaults
  }
  return { lastCheck: 0 }
}

async function saveState(state: UpdateState): Promise<void> {
  try {
    await mkdir(STATE_DIR, { recursive: true })
    await writeFile(STATE_FILE, JSON.stringify(state, null, 2))
  } catch (error) {
    console.error("[auto-update-configs] Failed to save state:", error)
  }
}

function expandPath(path: string): string {
  return path.replace(/^~/, homedir())
}

async function isRepoClean(repoPath: string): Promise<boolean> {
  try {
    const result = await $`git -C ${repoPath} status --porcelain`.text()
    return result.trim() === ""
  } catch {
    return false
  }
}

async function updateRepo(repoPath: string): Promise<string | null> {
  try {
    // Check if repo is valid and clean
    if (!(await isRepoClean(repoPath))) {
      return `[SKIP] ${repoPath}: uncommitted changes`
    }

    // Fetch latest
    await $`git -C ${repoPath} fetch --quiet origin`

    // Check if behind
    const localCommit =
      await $`git -C ${repoPath} rev-parse HEAD`.text().then((s) => s.trim())
    const remoteCommit =
      await $`git -C ${repoPath} rev-parse @{u}`.text().then((s) => s.trim())

    if (localCommit === remoteCommit) {
      return null // Already up to date, no message
    }

    // Pull (fast-forward only)
    await $`git -C ${repoPath} pull --ff-only --quiet`

    return `[UPDATE] ${repoPath}: pulled latest changes`
  } catch (error) {
    return `[ERROR] ${repoPath}: ${error instanceof Error ? error.message : String(error)}`
  }
}

async function checkAndUpdate(): Promise<void> {
  const state = await getState()
  const now = Date.now()
  const intervalMs =
    (Number(process.env.AUTO_UPDATE_INTERVAL_HOURS) || DEFAULT_INTERVAL_HOURS) *
    60 *
    60 *
    1000

  // Skip if checked recently
  if (now - state.lastCheck < intervalMs) {
    return
  }

  // Get repos to update
  const reposEnv = process.env.AUTO_UPDATE_REPOS
  const repos = reposEnv
    ? reposEnv.split(",").map((r) => r.trim())
    : DEFAULT_REPOS
  const expandedRepos = repos.map(expandPath)

  // Update each repo
  const results: string[] = []
  for (const repo of expandedRepos) {
    const result = await updateRepo(repo)
    if (result) results.push(result)
  }

  // Report if anything happened
  if (results.length > 0) {
    console.log("[auto-update-configs]\n" + results.join("\n"))
  }

  // Save last check time
  await saveState({ lastCheck: now })
}

export default function () {
  let hasChecked = false

  return {
    "chat.message": async () => {
      // Only check once per session (on first message)
      if (!hasChecked) {
        hasChecked = true
        await checkAndUpdate()
      }
    },
  }
}
