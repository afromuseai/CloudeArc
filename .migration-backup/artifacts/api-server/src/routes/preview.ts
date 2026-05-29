import { Router, type IRouter } from "express";
import * as esbuild from "esbuild";
import { tmpdir } from "os";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join, dirname, posix } from "path";

const router: IRouter = Router();

const REACT_PINS: Record<string, string> = {
  "react": "https://esm.sh/react@18",
  "react-dom": "https://esm.sh/react-dom@18",
  "react-dom/client": "https://esm.sh/react-dom@18/client",
  "react/jsx-runtime": "https://esm.sh/react@18/jsx-runtime",
  "react/jsx-dev-runtime": "https://esm.sh/react@18/jsx-dev-runtime",
};

function autoExternalPlugin(collected: Set<string>): esbuild.Plugin {
  return {
    name: "auto-external",
    setup(build) {
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        collected.add(args.path);
        return { path: args.path, external: true };
      });
    },
  };
}

function toEsmShUrl(specifier: string): string {
  if (REACT_PINS[specifier]) return REACT_PINS[specifier];
  return `https://esm.sh/${specifier}`;
}

// ── Stub helpers ──────────────────────────────────────────────────────────────

function stubContent(filePath: string): string {
  const name =
    (filePath.split("/").pop() ?? "Component")
      .replace(/\.[jt]sx?$/, "")
      .replace(/[^a-zA-Z0-9_$]/g, "_") || "Component";
  if (filePath.endsWith(".css")) return "";
  return `export default function ${name}() { return null; }\n`;
}

function writeStub(tmpDir: string, virtualPath: string): void {
  const relative = virtualPath.startsWith("/") ? virtualPath.slice(1) : virtualPath;
  const fullPath = join(tmpDir, relative);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, stubContent(virtualPath), "utf-8");
}

// ── Scan all JS/JSX/TS/TSX files for relative imports and create stubs in
// tmpDir for any files that are missing (e.g. App.jsx when LLM truncated early)
function stubMissingImports(files: Record<string, string>, tmpDir: string): void {
  const IMPORT_RE = /(?:from|import)\s+['"](\.\.?\/[^'"]+)['"]/g;
  const JS_EXTS = [".jsx", ".tsx", ".js", ".ts"];

  const knownPaths = new Set(
    Object.keys(files).map((p) => (p.startsWith("/") ? p : "/" + p)),
  );

  function resolveVirtual(fromFile: string, importPath: string): string {
    return posix.resolve(posix.dirname(fromFile), importPath);
  }

  function tryStub(virtualPath: string): void {
    if (knownPaths.has(virtualPath)) return;
    const hasExt = JS_EXTS.some((e) => virtualPath.endsWith(e));
    if (!hasExt) {
      for (const ext of JS_EXTS) {
        if (knownPaths.has(virtualPath + ext)) return;
      }
    }
    if (!existsSync(join(tmpDir, virtualPath.startsWith("/") ? virtualPath.slice(1) : virtualPath))) {
      writeStub(tmpDir, virtualPath);
      knownPaths.add(virtualPath);
    }
  }

  for (const [rawPath, content] of Object.entries(files)) {
    const filePath = rawPath.startsWith("/") ? rawPath : "/" + rawPath;
    if (!JS_EXTS.some((e) => filePath.endsWith(e))) continue;
    IMPORT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IMPORT_RE.exec(content)) !== null) {
      tryStub(resolveVirtual(filePath, m[1]));
    }
  }
}

// ── Parse esbuild error messages to extract the file paths that are broken
// e.g. ".../tmp/cloudearc-xxx/src/components/Navbar.jsx:33:125: ERROR: ..."
function extractBrokenFiles(errors: esbuild.Message[], tmpDir: string): string[] {
  const broken = new Set<string>();
  for (const err of errors) {
    const file = err.location?.file;
    if (!file) continue;
    // esbuild returns absolute paths inside tmpDir
    const abs = posix.isAbsolute(file) ? file : join(tmpDir, file);
    if (abs.startsWith(tmpDir)) {
      broken.add(abs);
    }
  }
  return [...broken];
}

// ── Run esbuild. On failure, stub out any syntactically broken files and retry
// once. This recovers from LLM truncation mid-JSX.
async function buildWithFallback(
  entryFile: string,
  tmpDir: string,
  collected: Set<string>,
  logger: any,
): Promise<esbuild.BuildResult> {
  const opts: esbuild.BuildOptions = {
    entryPoints: [entryFile],
    bundle: true,
    write: false,
    outdir: tmpDir,
    jsx: "automatic",
    jsxImportSource: "react",
    loader: { ".jsx": "tsx", ".js": "tsx", ".tsx": "tsx", ".ts": "ts", ".css": "css" },
    format: "esm",
    platform: "browser",
    target: "es2020",
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [autoExternalPlugin(collected)],
  };

  try {
    return await esbuild.build(opts);
  } catch (firstErr: any) {
    // Extract which files have syntax errors
    const brokenFiles = extractBrokenFiles(firstErr.errors ?? [], tmpDir);
    if (brokenFiles.length === 0) throw firstErr;

    logger.warn(
      { brokenFiles: brokenFiles.map((f) => f.replace(tmpDir, "")) },
      "esbuild: syntax errors in generated files — stubbing and retrying",
    );

    // Replace each broken file with a null-returning stub
    for (const abs of brokenFiles) {
      const relative = abs.replace(tmpDir + "/", "");
      writeFileSync(abs, stubContent("/" + relative), "utf-8");
    }

    // Retry once with stubs in place
    return await esbuild.build(opts);
  }
}

router.post("/preview", async (req, res) => {
  const tmpDir = join(tmpdir(), `cloudearc-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  try {
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ error: `Invalid body: ${JSON.stringify(req.body)}` });
      return;
    }
    const { files } = req.body as { files: Record<string, string> };
    if (!files || typeof files !== "object") {
      res.status(400).json({ error: "files is required" });
      return;
    }

    const hasMain =
      "/src/main.jsx" in files ||
      "src/main.jsx" in files ||
      "/src/main.tsx" in files ||
      "src/main.tsx" in files;

    if (!hasMain) {
      const html = files["/index.html"] ?? files["index.html"] ?? "<h1>No app generated</h1>";
      res.json({ html });
      return;
    }

    // Write all generated files to temp dir
    mkdirSync(tmpDir, { recursive: true });
    for (const [path, content] of Object.entries(files)) {
      const relative = path.startsWith("/") ? path.slice(1) : path;
      const fullPath = join(tmpDir, relative);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, "utf-8");
    }

    // Stub any imported files that weren't generated at all
    stubMissingImports(files, tmpDir);

    const entryFile =
      "/src/main.jsx" in files || "src/main.jsx" in files
        ? join(tmpDir, "src/main.jsx")
        : join(tmpDir, "src/main.tsx");

    const collectedPackages = new Set<string>();

    // Build — with automatic stub-and-retry on syntax errors (truncated JSX)
    const buildResult = await buildWithFallback(entryFile, tmpDir, collectedPackages, req.log);

    const importMapEntries: Record<string, string> = {};
    for (const pkg of collectedPackages) {
      importMapEntries[pkg] = toEsmShUrl(pkg);
    }

    const bundledJs = buildResult.outputFiles?.find((f) => f.path.endsWith(".js"))?.text ?? "";
    const bundledCss = buildResult.outputFiles?.find((f) => f.path.endsWith(".css"))?.text ?? "";

    const htmlTemplate = files["/index.html"] ?? files["index.html"] ?? "";

    const importMapJson = JSON.stringify({ imports: importMapEntries }, null, 2);
    const importMapScript = `<script type="importmap">\n${importMapJson}\n</script>`;
    const styleBlock = bundledCss ? `<style>\n${bundledCss}\n</style>` : "";
    const scriptBlock = `<script type="module">\n${bundledJs}\n</script>`;

    // Tailwind Play CDN — compiles JIT utility classes (including arbitrary values
    // like bg-[#080C0A]) at runtime. Essential because esbuild does not run Tailwind.
    // The config block registers the font families used by all templates so that
    // both font-['Syne'] (arbitrary) and font-syne (named) work correctly.
    const tailwindCdn = `<script>
window.tailwind = {
  config: {
    theme: {
      extend: {
        fontFamily: {
          'Syne': ['Syne', 'sans-serif'],
          'Inter': ['Inter', 'system-ui', 'sans-serif'],
          'Playfair_Display': ['Playfair Display', 'Georgia', 'serif'],
          'DM_Sans': ['DM Sans', 'system-ui', 'sans-serif'],
        }
      }
    }
  }
};
</script>
<script src="https://cdn.tailwindcss.com"></script>`;

    // Small runtime error overlay so truncated/broken components show a message
    // instead of a silent black screen.
    const errorOverlay = `<script>
window.addEventListener('error', function(e) {
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;background:#0a0a0a;color:#ef4444;font:13px/1.6 monospace;padding:32px;z-index:9999;white-space:pre-wrap;overflow:auto;';
  d.textContent = 'Runtime error:\\n' + (e.message || String(e));
  document.body && document.body.appendChild(d);
});
window.addEventListener('unhandledrejection', function(e) {
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;background:#0a0a0a;color:#ef4444;font:13px/1.6 monospace;padding:32px;z-index:9999;white-space:pre-wrap;overflow:auto;';
  d.textContent = 'Unhandled rejection:\\n' + (e.reason || String(e));
  document.body && document.body.appendChild(d);
});
</script>`;

    let html: string;
    if (htmlTemplate && htmlTemplate.includes("<body")) {
      html = htmlTemplate
        .replace(/<script[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<script[^>]*src=[^>]*main\.[jt]sx?[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace("</head>", `${tailwindCdn}\n${importMapScript}\n${styleBlock}\n</head>`)
        .replace("</body>", `${errorOverlay}\n${scriptBlock}\n</body>`);
    } else {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  ${tailwindCdn}
  ${importMapScript}
  ${styleBlock}
</head>
<body>
  <div id="root"></div>
  ${errorOverlay}
  ${scriptBlock}
</body>
</html>`;
    }

    res.json({ html });
  } catch (err: any) {
    const message = err?.message ?? String(err);
    req.log.error({ previewErr: message }, "Preview build failed");
    res.status(500).json({ error: message });
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

export default router;
