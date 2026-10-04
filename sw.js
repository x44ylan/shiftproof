const VERSION = 'shiftproof-2';
const SHELL = ['.', 'index.html', 'style.css', 'app.js', 'engine.js', 'manifest.webmanifest', 'icon.svg'];
const base = new URL('.', self.location.href);
const paths = new Set(SHELL.map(path => new URL(path, base).pathname));
self.addEventListener('install', event => event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('shiftproof-') && key !== VERSION) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== base.origin || !paths.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (event.request.mode === 'navigate') {
      try { const response = await fetch(event.request); if (response.ok) return response; } catch {}
      return await cache.match('index.html');
    }
    const cached = await cache.match(new URL(url.pathname, base));
    return cached || fetch(event.request);
  })());
});
