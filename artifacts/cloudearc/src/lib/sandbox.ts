import { WebContainer } from "@webcontainer/api";

let containerPromise: Promise<WebContainer> | null = null;
let container: WebContainer | null = null;
let serverUrl: string | null = null;

/** Reset all module state so bootSandbox() will attempt a fresh boot. */
export function resetSandbox() {
  containerPromise = null;
  container = null;
  serverUrl = null;
}

export async function bootSandbox() {
  if (!containerPromise) {
    containerPromise = (async () => {
      // Cross-origin isolation is required by WebContainer (for SharedArrayBuffer).
      // The coi-serviceworker.js handles this for Replit's proxy, but it needs
      // one reload cycle to activate. Throw a clear error so the UI can offer
      // a reload button rather than showing a confusing internal error.
      if (typeof crossOriginIsolated !== "undefined" && !crossOriginIsolated) {
        throw new Error(
          "SharedArrayBuffer is unavailable: page is not cross-origin isolated. " +
          "Please reload the page — the security policy will be applied automatically."
        );
      }

      const c = await WebContainer.boot();

      container = c;

      await c.mount({
        "package.json": {
          file: {
            contents: JSON.stringify({
              name: "cloudearc-app",
              private: true,
              version: "0.0.0",
              type: "module",
              scripts: {
                dev: "vite --host 0.0.0.0 --port 5173",
              },
              dependencies: {
                react: "^18.2.0",
                "react-dom": "^18.2.0",
              },
              devDependencies: {
                vite: "^5.0.0",
                "@vitejs/plugin-react": "^4.2.0",
              },
            }),
          },
        },

        "vite.config.js": {
          file: {
            contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`,
          },
        },

        "index.html": {
          file: {
            contents: `<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
          },
        },

        src: {
          directory: {
            "main.jsx": {
              file: {
                contents: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
              },
            },

            "App.jsx": {
              file: {
                contents: `export default function App() {
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>CloudeArc Ready 🚀</h1>
    </div>
  );
}
`,
              },
            },
          },
        },
      });

      const installProcess = await c.spawn("npm", ["install"]);

      // Pipe install output for debugging
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log("[sandbox:install]", data);
          },
        })
      );

      const installExitCode = await installProcess.exit;

      if (installExitCode !== 0) {
        throw new Error(`npm install failed with exit code ${installExitCode}`);
      }

      const serverReady = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Dev server did not start within 60s")),
          60_000
        );

        c.on("server-ready", (_port, url) => {
          clearTimeout(timeout);
          resolve(url);
        });
      });

      const devProcess = await c.spawn("npm", ["run", "dev"]);

      devProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log("[sandbox:dev]", data);
          },
        })
      );

      c.on("error", (err) => {
        console.error("[sandbox] WebContainer error:", err);
      });

      serverUrl = await serverReady;

      console.log("[sandbox] Server ready:", serverUrl);

      return c;
    })().catch((err) => {
      // Reset so next call can retry the boot from scratch
      console.error("[sandbox] Boot failed, resetting:", err);
      containerPromise = null;
      container = null;
      serverUrl = null;
      throw err;
    });
  }

  return containerPromise;
}

export async function getPreviewUrl() {
  await bootSandbox();
  return serverUrl;
}

export async function deleteFile(path: string): Promise<void> {
  await bootSandbox();
  if (!container) return;
  try {
    await container.fs.rm(path);
  } catch {
    // File may not exist — not an error
  }
}

export async function writeFile(path: string, content: string): Promise<void> {
  await bootSandbox();

  if (!container) {
    throw new Error(`[sandbox] writeFile called but container is not ready (path: ${path})`);
  }

  // Ensure parent directories exist
  const parts = path.split("/").filter(Boolean);
  let current = "";

  for (let i = 0; i < parts.length - 1; i++) {
    current += "/" + parts[i];
    try {
      await container.fs.mkdir(current, { recursive: true });
    } catch {
      // Directory may already exist — ignore
    }
  }

  // Passing encoding as a string (not options object) matches the
  // @webcontainer/api v1.x overload for string data.
  await container.fs.writeFile(path, content, "utf-8");
}
