import { writeFile } from "./sandbox";


export async function applyAction(action: any, setFiles: any, setActiveFile: any) {
  if (!action?.type) return;

  switch (action.type) {
    case "write_file": {
      setFiles((prev: any) => ({
        ...prev,
        [action.path]: action.content,
      }));

      await writeFile(action.path, action.content);
      setActiveFile(action.path);
      break;
    }

    case "multi_file": {
      for (const file of action.files) {
        setFiles((prev: any) => ({
          ...prev,
          [file.path]: file.content,
        }));

        await writeFile(file.path, file.content);
      }
      break;
    }

    case "terminal": {
      console.log("RUN COMMAND:", action.command);
      break;
    }

    case "read_file": {
      console.log("READ FILE:", action.path);
      break;
    }

    default:
      console.warn("Unknown action:", action);
  }
}
