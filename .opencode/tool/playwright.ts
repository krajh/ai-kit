import { tool } from "@opencode-ai/plugin";

/**
 * Playwright CLI wrapper tool for OpenCode
 *
 * Provides token-efficient browser automation via playwright-cli
 * See: https://github.com/microsoft/playwright-cli
 */

type SessionMode = "default" | "named" | "persistent";

export default tool({
  description:
    "Execute Playwright CLI commands for browser automation, testing, and web scraping. Token-efficient alternative to MCP-based browser automation.",
  args: {
    command: tool.schema
      .string()
      .describe(
        "Playwright CLI command to execute (e.g., 'open https://example.com', 'goto https://example.com', 'click button', 'snapshot')",
      ),
    session: tool.schema
      .string()
      .optional()
      .describe(
        "Session name for persistent browser state (default: 'opencode-default')",
      ),
    browser: tool.schema
      .enum(["chromium", "firefox", "webkit"])
      .optional()
      .default("chromium")
      .describe("Browser to use"),
    headless: tool.schema
      .boolean()
      .optional()
      .default(true)
      .describe("Run in headless mode"),
    timeout: tool.schema
      .number()
      .optional()
      .default(30000)
      .describe("Command timeout in milliseconds"),
  },
  async execute(args) {
    try {
      // Build playwright-cli command
      const sessionFlag = args.session
        ? `-s=${args.session}`
        : "-s=opencode-default";
      const browserFlag =
        args.browser !== "chromium" ? `--browser=${args.browser}` : "";
      const headlessFlag = args.headless ? "" : "--headed";

      // Construct full command
      const flags = [sessionFlag, browserFlag, headlessFlag]
        .filter(Boolean)
        .join(" ");
      const fullCommand = `playwright-cli ${flags} ${args.command}`;

      // Execute with timeout
      const proc = Bun.spawn(fullCommand.split(" "), {
        stdout: "pipe",
        stderr: "pipe",
      });

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          proc.kill();
          reject(new Error(`Command timed out after ${args.timeout}ms`));
        }, args.timeout);
      });

      // Wait for completion or timeout
      const result = await Promise.race([
        proc.exited.then(async (code) => {
          const stdout = await new Response(proc.stdout).text();
          const stderr = await new Response(proc.stderr).text();
          return { code, stdout, stderr };
        }),
        timeoutPromise,
      ]);

      if (result.code !== 0) {
        return `[X] Playwright CLI command failed (exit code ${result.code})
Command: ${fullCommand}

STDERR:
${result.stderr}

STDOUT:
${result.stdout}`;
      }

      return `[OK] Playwright CLI command executed successfully

Command: ${fullCommand}
Session: ${args.session || "opencode-default"}
Browser: ${args.browser}

Output:
${result.stdout}${result.stderr ? `\n\nWarnings/Info:\n${result.stderr}` : ""}`;
    } catch (error) {
      return `[X] Error executing Playwright CLI command
Error: ${error instanceof Error ? error.message : String(error)}

Command: ${args.command}
Session: ${args.session || "opencode-default"}

Troubleshooting:
- Ensure playwright-cli is installed: bun add -g @playwright/cli@latest
- Check if browser is installed: playwright-cli install
- Verify command syntax: playwright-cli --help`;
    }
  },
});
