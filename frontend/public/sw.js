/**
 * notemd Service Worker
 *
 * 캐싱 정책
 *   - 정적 자산(JS/CSS/이미지/폰트) : stale-while-revalidate
 *   - 내비게이션(HTML)             : network-first, 실패 시 앱 셸
 *   - API 응답                    : 캐싱하지 않음 (노트 본문이 평문으로 남는 것 방지)
 */

const VERSION = "v2";
const STATIC_CACHE = `notemd-static-${VERSION}`;
const SHELL_URL = "/index.html";

// 오프라인 첫 진입을 위해 미리 받아두는 최소 자산
const PRECACHE_URLS = [SHELL_URL, "/", "/manifest.webmanifest", "/offline.html"];

// 절대 캐싱하지 않을 경로
const NEVER_CACHE = [/^\/api\//, /^\/auth\//, /^\/admin\//];

const isNeverCache = (pathname) => NEVER_CACHE.some((re) => re.test(pathname));

// ── install ────────────────────────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            // 하나라도 404면 전체가 실패하므로 개별 처리
            .then((cache) =>
                Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
            )
            .then(() => self.skipWaiting())
    );
});

// ── activate ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== STATIC_CACHE)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

// ── fetch ──────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // 외부 도메인, chrome-extension:// 등은 건드리지 않는다
    if (url.origin !== self.location.origin) return;
    if (!url.protocol.startsWith("http")) return;

    // API/인증 응답은 가로채지 않고 그대로 통과 (캐시에 남기지 않음)
    if (isNeverCache(url.pathname)) return;

    // 페이지 이동 → 네트워크 우선, 실패하면 앱 셸
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(
                async () =>
                    (await caches.match(SHELL_URL)) ??
                    (await caches.match("/offline.html")) ??
                    new Response("오프라인입니다.", {
                        status: 503,
                        headers: { "Content-Type": "text/plain; charset=utf-8" },
                    })
            )
        );
        return;
    }

    // 정적 자산 → 캐시를 먼저 주고 백그라운드에서 갱신
    event.respondWith(
        caches.open(STATIC_CACHE).then(async (cache) => {
            const cached = await cache.match(request);

            const network = fetch(request)
                .then((response) => {
                    // 정상 응답만 저장. opaque(type: "opaque")나 4xx/5xx는 제외
                    if (response.ok && response.type === "basic") {
                        cache.put(request, response.clone()).catch(() => {});
                    }
                    return response;
                })
                .catch(() => null);

            return (
                cached ??
                (await network) ??
                new Response("", { status: 504, statusText: "Offline" })
            );
        })
    );
});

// ── 로그아웃 시 캐시 비우기 ──────────────────────────────────
// 앱에서: navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_CACHE" })
self.addEventListener("message", (event) => {
    if (event.data?.type === "CLEAR_CACHE") {
        event.waitUntil(
            caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        );
    }
});