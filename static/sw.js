'use strict';

importScripts('/static/sw-toolbox.js');

toolbox.precache([
    "/",
    "/static/js/index.js",
    "/static/js/history.js",
    "/static/js/himitsu.js",
    "/static/fonts/yukiarimo.woff",
    "/static/img/yuna-ai.png",
    '/static/img/yuna-girl.webp'
]);

toolbox.router.get('/images/*', toolbox.cacheFirst);
toolbox.router.get('/*', toolbox.networkFirst, {
    networkTimeoutSeconds: 1
});

self.addEventListener('install', function (event) {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
    // Don't intercept external API calls (like Kagi)
    const url = new URL(event.request.url);
    if (url.hostname !== location.hostname) {
        // Let external requests pass through without caching
        return;
    }

    event.respondWith(
        fetch(event.request).catch(function () {
            return caches.match(event.request);
        })
    );
});