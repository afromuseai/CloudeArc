// ProjectMemoryStore — persists per-project design language and established
// patterns to disk so the AI can reference prior work across sessions.
// Storage is best-effort; failures are silently swallowed.

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

// Written relative to process.cwd() which is the api-server root
const DATA_DIR = join(process.cwd(), "data", "memory");

export interface PersistedDesignLanguage {
  cornerStyle: string | null;
  shadowDensity: string | null;
  spacingPhilosophy: string | null;
  colorApproach: string | null;
  typographyStyle: string | null;
  animationPhilosophy: string | null;
}

export interface ProjectMemoryRecord {
  projectId: string;
  lastUpdated: number;
  buildCount: number;
  templateType: string | null;
  styleMode: string | null;
  designLanguage: PersistedDesignLanguage;
  establishedPatterns: string[];
}

// Sanitize project IDs to safe filenames — prevents path traversal
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9\-_]/g, "_").slice(0, 64);
}

export class ProjectMemoryStore {
  async read(projectId: string): Promise<ProjectMemoryRecord | null> {
    try {
      const filePath = join(DATA_DIR, `${sanitizeId(projectId)}.json`);
      const raw = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      // Basic shape validation
      if (typeof parsed?.projectId !== "string") return null;
      return parsed as ProjectMemoryRecord;
    } catch {
      return null;
    }
  }

  async write(record: ProjectMemoryRecord): Promise<void> {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      const filePath = join(DATA_DIR, `${sanitizeId(record.projectId)}.json`);
      await writeFile(filePath, JSON.stringify(record, null, 2), "utf-8");
    } catch {
      // Non-fatal — persistence is best-effort
    }
  }
}
