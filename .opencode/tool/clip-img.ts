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

      // Detect which PowerShell is available (prefer pwsh.exe for speed)
      let psCommand = "powershell.exe";
      try {
        await Bun.$`command -v pwsh.exe`.quiet();
        psCommand = "pwsh.exe"; // ~50-100ms startup vs 200-500ms for powershell.exe
      } catch {
        // Check full paths for PowerShell in WSL
        const pwshPath = "/mnt/c/Program Files/PowerShell/7/pwsh.exe";
        const ps5Path = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
        
        try {
          await Bun.$`test -f ${pwshPath}`.quiet();
          psCommand = pwshPath;
        } catch {
          try {
            await Bun.$`test -f ${ps5Path}`.quiet();
            psCommand = ps5Path;
          } catch {
            return `[X] Error: No PowerShell found. Install PowerShell or ensure it's in PATH.`;
          }
        }
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
        const psResult = await Bun.$`${psCommand} -NoProfile -ExecutionPolicy Bypass -File ${winScriptPath.trim()}`.quiet();
        
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
