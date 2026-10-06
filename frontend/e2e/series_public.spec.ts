import {API_URL, apiToken, createNote, expect, login, test} from "./fixtures"

const unique = (name: string) => `${name} ${Date.now().toString(36)}`

test("시리즈를 링크로 공개하면 로그인 없이 넘겨 읽고, 노트의 주소만으로는 열리지 않는다", async ({page, browser}) => {
    const first = unique("1장 시작")
    const second = unique("2장 다음")
    const title = unique("공개 시리즈")
    await login(page)
    const token = await apiToken(page)
    const firstId = await createNote(page, token, {title: first, content: "<p>첫 장의 본문</p>"})
    const secondId = await createNote(page, token, {title: second, content: "<p>둘째 장의 본문</p>"})
    const created = await page.request.post(`${API_URL}/series`, {
        headers: {Authorization: `Bearer ${token}`},
        data: {title, note_hashes: [firstId, secondId]},
    })
    const seriesId: string = (await created.json()).hash_id

    // 주인: 시리즈 화면의 ⋯ 메뉴에서 공개한다(무엇이 읽히게 되는지 묻는 창에 답한다).
    await page.goto(`/series/${seriesId}`)
    page.once("dialog", dialog => dialog.accept())
    await page.getByRole("button", {name: "시리즈 메뉴"}).click()
    await page.getByRole("menuitem", {name: /링크로 공개/}).click()
    await expect(page.getByRole("button", {name: /공개 중/})).toBeVisible()

    // 남: 로그인하지 않은 새 창.
    const visitor = await (await browser.newContext()).newPage()
    await visitor.goto(`/p/${seriesId}`)
    await expect(visitor.getByRole("heading", {name: title})).toBeVisible()
    await visitor.getByRole("button", {name: new RegExp(first)}).click()
    await expect(visitor).toHaveURL(new RegExp(`/s/${firstId}\\?series=${seriesId}`))
    await expect(visitor.locator(".ProseMirror")).toContainText("첫 장의 본문")
    await expect(visitor.locator(".ProseMirror")).toHaveAttribute("contenteditable", "false")

    // 다음 노트로 넘겨도 시리즈 표시가 주소에 이어진다.
    await visitor.getByRole("button", {name: /다음 노트/}).click()
    await expect(visitor).toHaveURL(new RegExp(`/s/${secondId}\\?series=${seriesId}`))
    await expect(visitor.locator(".ProseMirror")).toContainText("둘째 장의 본문")

    // 노트의 주소만으로는 열리지 않는다(노트 자체는 비공개 그대로다).
    const direct = await visitor.request.get(`${API_URL}/notes/${firstId}`)
    expect(direct.status()).toBe(404)
    await visitor.goto(`/s/${firstId}`)
    await expect(visitor.locator(".ProseMirror")).toHaveCount(0)

    // 주인이 공개를 끄면 곧바로 닫힌다.
    await page.getByRole("button", {name: "시리즈 메뉴"}).click()
    await page.getByRole("menuitem", {name: /공개 끄기/}).click()
    await expect(page.getByRole("button", {name: /공개 중/})).toHaveCount(0)
    await visitor.goto(`/p/${seriesId}`)
    await expect(visitor.getByText("볼 수 없는 시리즈입니다.")).toBeVisible()
    await visitor.context().close()
})
