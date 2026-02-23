export interface FileEntry {
  category: "managed" | "merged" | "generated";
  installedHash: string;
  sourceHash: string;
}

export interface AiKitManifest {
  version: string;
  installedAt: string;
  installedVia: "npm";
  files: Record<string, FileEntry>;
}
