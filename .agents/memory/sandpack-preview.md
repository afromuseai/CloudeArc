---
name: Server-side esbuild preview replaces Sandpack/WebContainer
description: Why both WebContainer and Sandpack were removed and how server-side esbuild preview works
---

## Rule
Use server-side esbuild bundling (POST /api/preview) for the in-workspace live preview. Neither WebContainer nor Sandpack work in Replit's iframe environment.

**Why WebContainer failed:** Replit's preview iframe is nested inside the Replit UI frame which does NOT send `COOP: same-origin` + `COEP: require-corp` headers. `crossOriginIsolated` is always `false` — WebContainer hard-requires SharedArrayBuffer. No service-worker trick can fix this.

**Why Sandpack failed:** Sandpack's bundler runs in a hidden iframe that loads from `https://sandpack-bundler.codesandbox.io`. Replit's network blocks outbound access to this domain. Error: `ENV: create-react-app / ERROR: TIME_OUT`.

**Solution — server-side esbuild via POST /api/preview:**
1. Frontend accumulates all generated files in a local variable during SSE streaming
2. On "done" event, the async `buildPreview(localFiles)` is awaited — it POSTs files to `/api/preview`
3. API server writes files to a real temp directory, runs esbuild using an `autoExternalPlugin`
4. The plugin intercepts ALL bare specifier imports (non-relative, non-absolute), marks them external, and records them
5. After bundling, the server builds an import map: each collected specifier → `https://esm.sh/<pkg>` (with React pinned to `@18`)
6. Returns `{ html }` containing `<script type="importmap">` + `<script type="module">` bundle
7. Frontend sets `previewHtml` state and the iframe renders via `srcDoc`

**How to apply:**
- `buildPreview` in `workspace.tsx` must be `async` and call `POST /api/preview` — do NOT use the old client-side Babel approach
- The `autoExternalPlugin` is the key — it handles ANY package the AI might import, not just a hardcoded list
- `esbuild` must be in `devDependencies` of api-server and listed in the `external` array of `build.mjs`
- Do NOT use a virtual filesystem plugin or catch-all `/.*/` resolver — causes infinite resolve loops. Use a real temp directory
- Always clean up the temp dir in a `finally` block
- The iframe uses `sandbox="allow-scripts"` with `srcDoc` — `type="module"` + import maps work with this setting
- `esm.sh` supports CORS with `Access-Control-Allow-Origin: *`, so null-origin sandboxed iframes can load from it
- `sandbox.ts` / `syncEngine.ts` are vestigial WebContainer files — not imported by `workspace.tsx`
