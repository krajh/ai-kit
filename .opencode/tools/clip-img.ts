import { tool } from "@opencode-ai/plugin";

export default tool({
  description:
    "Save image from Windows clipboard and prepare for analysis. Returns the saved image path.",
  args: {
    filename: tool.schema
      .string()
      .optional()
      .describe(
        "Optional filename for the saved image (defaults to screenshot_<timestamp>.png)",
      ),
  },
  async execute(args, context) {
    try {
      // Generate filename with timestamp if not provided
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const filename = args.filename || `screenshot_${timestamp}.png`;

      // Sanitize filename (prevent path traversal)
      const safeFilename = filename.split("/").pop() || filename;

      // Use context.directory for the working directory
      const fullPath = `${context.directory}/${safeFilename}`;

      // Convert WSL path to Windows path for PowerShell clipboard access
      const winPathResult = await Bun.$`wslpath -w ${fullPath}`.text();
      const winPath = winPathResult.trim();

      // Detect which PowerShell is available in WSL
      // Try pwsh.exe first (PowerShell 7+), then fall back to powershell.exe (5.1)
      let psCommand: string | undefined;

      // Define possible PowerShell paths in WSL - PowerShell 7 at standard location
      const pwshPaths = [
        "/mnt/c/Program Files/PowerShell/7/pwsh.exe",
        "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
      ];

      // Check each path in order
      for (const psPath of pwshPaths) {
        try {
          await Bun.$`test -f ${psPath}`.quiet();
          psCommand = psPath;
          break;
        } catch {
          // Path doesn't exist, try next
        }
      }

      if (!psCommand) {
        // Try using wsl-aware command detection
        try {
          const whichPwsh = await Bun.$`which pwsh.exe`.text();
          if (whichPwsh.trim()) {
            psCommand = "pwsh.exe";
          }
        } catch {
          // Not in PATH either
        }
      }

      if (!psCommand) {
        return `[X] Error: No PowerShell found. Install PowerShell 7+ or ensure Windows PowerShell is accessible.`;
      }

      // Use PowerShell to save clipboard image
      // Write script to temp file to avoid shell escaping issues
      const tmpScript = `/tmp/clip-img-${Date.now()}.ps1`;
      const psScriptContent = `Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$img = [Windows.Forms.Clipboard]::GetImage()
if ($img) {
  $img.Save('${winPath}', [Drawing.Imaging.ImageFormat]::Png)
  exit 0
} else {
  exit 1
}`;

      await Bun.write(tmpScript, psScriptContent);

      try {
        const winScriptPath = await Bun.$`wslpath -w ${tmpScript}`.text();
        const psResult =
          await Bun.$`${psCommand} -NoProfile -ExecutionPolicy Bypass -File ${winScriptPath.trim()}`.quiet();

        await Bun.$`rm -f ${tmpScript}`.quiet();

        if (psResult.exitCode === 0) {
          return `[OK] Image saved: ${fullPath}\n\nTo analyze this image, you can now reference it in your messages.`;
        } else {
          return `[X] Failed to save image - no image found in clipboard`;
        }
      } catch (psError) {
        await Bun.$`rm -f ${tmpScript}`.quiet();
        throw psError;
      }
    } catch (error) {
      return `[X] Error saving clipboard image: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
