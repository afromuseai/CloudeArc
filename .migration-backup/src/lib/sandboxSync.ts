let syncTimer: NodeJS.Timeout | null = null;

export function syncToSandbox(files: Record<string, string>, writeFile: any) {
  if (syncTimer) clearTimeout(syncTimer);

  syncTimer = setTimeout(async () => {
    for (const [path, content] of Object.entries(files)) {
      await writeFile(path, content);
    }
  }, 150); // debounce = key for performance
}

window.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_UPDATE") {
    // hot reload trigger inside sandbox
    window.dispatchEvent(new Event("resize")); 
    // OR your bundler HMR hook
  }
});

window.parent.postMessage(
  { type: "PREVIEW_READY" },
  "*"
)