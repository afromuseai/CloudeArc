type FileMap = Record<string, string>;

type ProjectMemory = {
  files: FileMap;
  history: {
    prompt: string;
    timestamp: number;
    diff: any;
  }[];
};

export const projectMemory: Record<string, ProjectMemory> = {};

export function getProject(id: string): ProjectMemory {
  if (!projectMemory[id]) {
    projectMemory[id] = {
      files: {
        "/main.js": "// start",
      },
      history: [],
    };
  }
  return projectMemory[id];
}