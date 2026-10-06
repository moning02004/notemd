import {apiToken, createNote, expect, login, test} from "./fixtures"

const unique = (name: string) => `${name} ${Date.now().toString(36)}`

test("노트를 골라 시리즈로 묶고, 다음 노트로 넘기다 뒤로 가면 시리즈로 돌아온다", async ({page}) => {
    const first = unique("1장 변수")
    const second = unique("2장 함수")
    const series = unique("파이썬 입문")
    await login(page)
    const token = await apiToken(page)
    await createNote(page, token, {title: first})
    await createNote(page, token, {title: second})
    await page.reload()

    // 선택 → 고른 순서대로 시리즈.
    await page.getByRole("button", {name: "선택", exact: true}).click()
    await page.locator("[data-note-id]", {hasText: first}).click()
    await page.locator("[data-note-id]", {hasText: second}).click()
    // 아래 액션 바의 '시리즈'(사이드바 메뉴의 같은 이름과 가른다).
    await page.locator(".fixed.bottom-0").getByRole("button", {name: "시리즈"}).click()
    await page.locator("#series-title").fill(series)
    await page.getByRole("button", {name: "시리즈 만들기"}).click()

    await expect(page).toHaveURL(/\/series\/[^/]+$/)
    await expect(page.getByText(series, {exact: true})).toBeVisible()
    const items = page.locator("ol > li")
    await expect(items.nth(0)).toContainText(first)
    await expect(items.nth(1)).toContainText(second)
    const seriesUrl = page.url()

    // 첫 노트로 들어가 다음 노트로 넘긴다.
    await items.nth(0).getByRole("button").click()
    await expect(page).toHaveURL(/\/s\//)
    await expect(page.getByPlaceholder("제목")).toHaveValue(first)
    await page.getByRole("button", {name: /다음 노트/}).click()
    await expect(page.getByPlaceholder("제목")).toHaveValue(second)

    // 뒤로가기는 방금 본 노트가 아니라 들어오기 전 화면(시리즈)으로.
    await page.getByRole("button", {name: "뒤로"}).click()
    await expect(page).toHaveURL(seriesUrl)

    // 목록의 카드에는 시리즈 표시가 붙는다.
    await page.goto("/")
    await expect(page.locator("[data-note-id]", {hasText: first}).getByText("시리즈", {exact: true})).toBeVisible()
})
