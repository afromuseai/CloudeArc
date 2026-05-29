export type FilePatch = {
  path: string;
  ops: {
    type: "replace" | "insert" | "delete";
    start: number;
    end: number;
    value?: string;
  }[];
};

export function applyPatch(file: string, ops: FilePatch["ops"]) {
  let result = file;

  for (const op of ops) {
    if (op.type === "replace") {
      result =
        result.slice(0, op.start) +
        (op.value || "") +
        result.slice(op.end);
    }
  }

  return result;
}
