import {defineConfig} from "@playwright/test"

/**
 * 화면 E2E 테스트. 떠 있는 개발 스택(make up)에 붙어서 돈다.
 *
 *   make e2e                       (저장소 루트에서)
 *   npx playwright test --ui       (frontend 에서, 하나씩 눌러 보며)
 *
 * 시작할 때 일회용 계정을 만들고 끝나면 그 계정과 노트를 지운다(e2e/global-setup.ts).
 * 테스트끼리 같은 계정의 목록을 보므로 한 번에 하나씩 돌린다.
 */
export default defineConfig({
    testDir: "./e2e",
    globalSetup: "./e2e/global-setup.ts",
    globalTeardown: "./e2e/global-teardown.ts",
    workers: 1,
    fullyParallel: false,
    // 개발 서버(next dev)는 처음 여는 화면을 그때 컴파일한다. 첫 방문이 느리다.
    timeout: 60_000,
    expect: {timeout: 15_000},
    reporter: [["list"]],
    use: {
        baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
        viewport: {width: 1280, height: 800},
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    outputDir: "./e2e/.results",
})
