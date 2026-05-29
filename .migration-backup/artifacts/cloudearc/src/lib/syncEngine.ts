import { applyPatch } from "./patchEngine";
import { writeFile } from "./sandbox";

export class SyncEngine {
  constructor(private setFiles: (f: any) => void) {}

  async apply(action: any) {
    if (action.type === "create_file") {
      this.setFiles((prev: any) => ({
        ...prev,
        [action.path]: action.content,
      }));

      await writeFile(action.path, action.content);
    }

    if (action.type === "delete_file") {
      this.setFiles((prev: any) => {
        const copy = { ...prev };
        delete copy[action.path];
        return copy;
      });
    }

    if (action.type === "patch") {
      const updates: Record<string, string> = {};

      this.setFiles((prev: any) => {
        const updated = { ...prev };

        for (const file of action.files) {
          updated[file.path] = applyPatch(
            updated[file.path] || "",
            file.ops
          );

          updates[file.path] = updated[file.path];
        }

        return updated;
      });

      for (const path in updates) {
        await writeFile(path, updates[path]);
      }
    }
  }
}
