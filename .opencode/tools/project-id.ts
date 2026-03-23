/**
 * Project ID Derivation Utility
 *
 * Provides deterministic project_id generation based on git remote URL.
 * Ensures Frieren context writes are scoped to the correct repository.
 *
 * Strategy:
 * - Primary: Use normalized git remote URL (stable across machines)
 * - Fallback: Use repo root path (machine-specific, but better than nothing)
 * - Hash: UUIDv5 with DNS namespace for deterministic, stable IDs
 */

import { createHash } from "node:crypto";

/**
 * Normalize git remote URL for consistent hashing
 * Removes .git suffix, normalizes protocol, removes trailing slashes
 */
export function normalizeRemoteUrl(url: string): string {
  let normalized = url.trim();

  // Normalize protocol first (https:// preferred)
  // Handle git@host:path format -> https://host/path
  normalized = normalized.replace(/^git@([^:]+):/, "https://$1/");

  // Remove trailing slashes (before .git check so .git/ is handled)
  normalized = normalized.replace(/\/$/, "");

  // Remove .git suffix if present
  if (normalized.endsWith(".git")) {
    normalized = normalized.slice(0, -4);
  }

  return normalized.toLowerCase();
}

/**
 * Generate UUIDv5-like deterministic UUID from a string
 * Uses SHA-1 hash with version 5 and RFC 4122 variant bits set
 * Deterministic: same input always produces same UUID
 */
export function stringToUuidV5(input: string): string {
  // Create SHA-1 hash of input
  const hash = createHash("sha1").update(input).digest();

  // Convert to UUID v5 format
  // Set version to 5 (bits 12-15 of time_hi_and_version)
  hash[6] = (hash[6] & 0x0f) | 0x50;

  // Set variant to RFC 4122 (bits 6-7 of clock_seq_hi_and_reserved)
  hash[8] = (hash[8] & 0x3f) | 0x80;

  // Format as UUID string
  const parts = [
    hash.slice(0, 4).toString("hex"),
    hash.slice(4, 6).toString("hex"),
    hash.slice(6, 8).toString("hex"),
    hash.slice(8, 10).toString("hex"),
    hash.slice(10, 16).toString("hex"),
  ];

  return parts.join("-");
}

/**
 * Get git remote URL from current repo
 */
export async function getGitRemoteUrl(): Promise<string | null> {
  try {
    const output = await Bun.$`git config --get remote.origin.url`.text();
    return output.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Get git repo root path
 */
export async function getGitRepoRoot(): Promise<string | null> {
  try {
    const output = await Bun.$`git rev-parse --show-toplevel`.text();
    return output.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Derive project_id for current repository
 *
 * Strategy:
 * 1. Check if already cached in environment variable
 * 2. Try to get git remote URL (stable across machines)
 * 3. Fallback to repo root path (machine-specific)
 * 4. Generate UUIDv5 from normalized input
 * 5. Cache result to environment for consistency
 *
 * Returns: UUID v5 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export async function deriveProjectId(): Promise<string> {
  // Check if already cached in environment (for consistency with sync version)
  if (process.env.OPENCODE_PROJECT_ID) {
    return process.env.OPENCODE_PROJECT_ID;
  }

  // Try remote URL first (preferred - stable across machines)
  const remoteUrl = await getGitRemoteUrl();
  if (remoteUrl) {
    const normalized = normalizeRemoteUrl(remoteUrl);
    const projectId = stringToUuidV5(normalized);
    // Cache for future use
    process.env.OPENCODE_PROJECT_ID = projectId;
    return projectId;
  }

  // Fallback to repo root path (machine-specific)
  const repoRoot = await getGitRepoRoot();
  if (repoRoot) {
    const projectId = stringToUuidV5(repoRoot);
    // Cache for future use
    process.env.OPENCODE_PROJECT_ID = projectId;
    return projectId;
  }

  // Last resort: use current working directory
  const projectId = stringToUuidV5(process.cwd());
  // Cache for future use
  process.env.OPENCODE_PROJECT_ID = projectId;
  return projectId;
}

/**
 * Derive project_id synchronously (for use in plugins where async is not available)
 * Uses environment variable or falls back to sync git command
 */
export function deriveProjectIdSync(): string {
  // Check if already cached in environment
  if (process.env.OPENCODE_PROJECT_ID) {
    return process.env.OPENCODE_PROJECT_ID;
  }

  // Try to get remote URL synchronously
  try {
    const { execSync } = require("node:child_process");
    const remoteUrl = execSync("git config --get remote.origin.url", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    if (remoteUrl) {
      const normalized = normalizeRemoteUrl(remoteUrl);
      const projectId = stringToUuidV5(normalized);
      // Cache for future use
      process.env.OPENCODE_PROJECT_ID = projectId;
      return projectId;
    }
  } catch {
    // Ignore errors, try fallback
  }

  // Fallback to repo root
  try {
    const { execSync } = require("node:child_process");
    const repoRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    if (repoRoot) {
      const projectId = stringToUuidV5(repoRoot);
      process.env.OPENCODE_PROJECT_ID = projectId;
      return projectId;
    }
  } catch {
    // Ignore errors, use cwd
  }

  // Last resort: use current working directory
  const projectId = stringToUuidV5(process.cwd());
  process.env.OPENCODE_PROJECT_ID = projectId;
  return projectId;
}
