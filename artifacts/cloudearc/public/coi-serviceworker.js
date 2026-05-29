/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
// Injects Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers
// so that SharedArrayBuffer (required by WebContainers) works behind proxies
// that strip those headers.

let coepCredentialless = false;

function isPassthrough() {
  return self.registration && self.registration.scope &&
    new URL(self.registration.scope).searchParams.has("passthrough");
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("message", (ev) => {
  if (ev.data && ev.data.type === "deregister") {
    self.registration.unregister().then(() => {
      return self.clients.matchAll();
    }).then(clients => clients.forEach(client => client.navigate(client.url)));
  }
  if (ev.data && ev.data.type === "coepCredentialless") {
    coepCredentialless = ev.data.value;
  }
});

self.addEventListener("fetch", function(event) {
  const r = event.request;

  if (r.cache === "only-if-cached" && r.mode !== "same-origin") return;
  if (isPassthrough()) return;

  // Skip non-GET and browser internals
  if (r.method !== "GET") return;

  const url = new URL(r.url);

  // Skip chrome extensions and non-http
  if (!url.protocol.startsWith("http")) return;

  event.respondWith(
    fetch(r).then(response => {
      // Only add headers to same-origin responses (to avoid CORS issues)
      if (response.status === 0) return response;

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

      if (coepCredentialless) {
        newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");
      } else {
        newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
      }

      newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }).catch(() => fetch(r))
  );
});
