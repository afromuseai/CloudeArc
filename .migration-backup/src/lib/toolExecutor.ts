type ToolPayload = {
  tool: string;
  path?: string;
  content?: string;
  command?: string;
};

export async function executeTool(payload: ToolPayload) {
  switch (payload.tool) {
    case "write_file":
      return {
        type: "write_file",
        path: payload.path,
        content: payload.content,
      };

    case "read_file":
      return {
        type: "read_file",
        path: payload.path,
      };

    case "delete_file":
      return {
        type: "delete_file",
        path: payload.path,
      };

    case "terminal":
      return {
        type: "terminal",
        command: payload.command,
      };

    default:
      return {
        type: "error",
        message: "Unknown tool",
      };
  }
}