import { WebContainer } from "@webcontainer/api";

let containerPromise: Promise<WebContainer> | null = null;
let container: WebContainer | null = null;
let serverUrl: string | null = null;

export async function bootSandbox() {
  if (!containerPromise) {
    containerPromise = (async () => {
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
      contents: `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
      `,
    },
  },

  "index.html": {
    file: {
      contents: `
<!DOCTYPE html>
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
          contents: `
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
          `,
        },
      },

      "App.jsx": {
        file: {
          contents: `
export default function App() {
  return (
    <div
      style={{
        padding: 40,
        fontFamily: "sans-serif",
      }}
    >
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

      // INSTALL
     const installProcess = await c.spawn("npm", ["install"]);

await installProcess.exit;

      const installExitCode = await installProcess.exit;

      if (installExitCode !== 0) {
        throw new Error("npm install failed");
      }

      // WAIT FOR SERVER
      const serverReady = new Promise<string>((resolve) => {
        c.on("server-ready", (_port, url) => {
          resolve(url);
        });
      });

      // START DEV SERVER
      const devProcess = await c.spawn("npm", ["run", "dev"]);

devProcess.output.pipeTo(
  new WritableStream({
    write(data) {
      console.log("[sandbox]", data);
    },
  })
);

      c.on("error", (err) => {
  console.error("WEB CONTAINER ERROR:", err);
});

console.log("SPAWNING DEV SERVER");

      serverUrl = await serverReady;

      console.log("SERVER READY:", serverUrl);

      return c;
    })();
  }

  return containerPromise;
}

export async function getPreviewUrl() {
  await bootSandbox();

  return serverUrl;
}

export async function writeFile(
  path: string,
  content: string
) {
  await bootSandbox();

  if (!container) return;

  const parts = path.split("/").filter(Boolean);

  let current = "";

  for (let i = 0; i < parts.length - 1; i++) {
    current += "/" + parts[i];

    try {
      await container.fs.mkdir(current);
    } catch {}
  }

  await container.fs.writeFile(path, content);
}
