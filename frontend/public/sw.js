/**
 * 서비스 워커 제거용 묘비(tombstone) 워커
 *
 * 이전에 설치된 notemd 서비스 워커가 아직 남아있는 브라우저를 정리한다.
 *   1. 남아있는 캐시를 전부 삭제
 *   2. 자기 자신의 등록을 해제
 *   3. 제어 중이던 탭을 새로고침해 네트워크에서 최신 문서를 받도록 함
 *
 * fetch 핸들러가 없으므로 요청을 가로채지 않는다.
 *
 * 모든 사용자가 한 번씩 접속해 정리될 때까지 유지한 뒤(수개월 권장) 삭제할 것.
 */

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));

            await self.registration.unregister();

            const clients = await self.clients.matchAll({type: "window"});
            for (const client of clients) {
                client.navigate(client.url);
            }
        })()
    );
});