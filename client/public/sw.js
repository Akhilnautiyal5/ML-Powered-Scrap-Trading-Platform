const CACHE_NAME = "tradesmart-v3";
const ASSETS_TO_CACHE = ["/", "/index.html", "/manifest.json", "/icon-512.png"];

self.addEventListener("install", (event) => {
	self.skipWaiting();
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(ASSETS_TO_CACHE).catch(() => Promise.resolve());
		}),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		Promise.all([
			caches.keys().then((cacheNames) =>
				Promise.all(
					cacheNames.map((cacheName) => {
						if (cacheName !== CACHE_NAME) {
							return caches.delete(cacheName);
						}
						return Promise.resolve();
					}),
				),
			),
			self.clients.claim(),
		]),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;

	if (request.method !== "GET") {
		return;
	}

	const url = new URL(request.url);
	const isSameOrigin = url.origin === self.location.origin;
	const isNavigation = request.mode === "navigate";
	const isApiRequest =
		(isSameOrigin && url.pathname.startsWith("/api/")) ||
		url.origin.includes("localhost:5000");

	if (!isSameOrigin && !url.origin.includes("localhost:5000")) {
		event.respondWith(fetch(request));
		return;
	}

	if (isNavigation) {
		event.respondWith(
			fetch(request).catch(() =>
				caches
					.match("/index.html")
					.then((cached) => cached || Response.error()),
			),
		);
		return;
	}

	if (isApiRequest) {
		event.respondWith(
			fetch(request).catch(
				() =>
					new Response(
						JSON.stringify({ success: false, error: "Network unavailable" }),
						{
							status: 503,
							headers: { "Content-Type": "application/json" },
						},
					),
			),
		);
		return;
	}

	event.respondWith(
		caches
			.match(request)
			.then((response) => response || fetch(request))
			.catch(() => Response.error()),
	);
});
