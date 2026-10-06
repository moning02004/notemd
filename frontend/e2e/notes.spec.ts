import {apiToken, createNote, expect, login, test} from "./fixtures"

const unique = (name: string) => `${name} ${Date.now().toString(36)}`

test("로그인하면 개인 노트 목록이 열린다", async ({page}) => {
    await login(page)

    await expect(page.getByRole("button", {name: "새 노트"})).toBeVisible()
    await expect(page.getByRole("button", {name: "선택", exact: true})).toBeVisible()
})

test("노트를 쓰고 곧바로 뒤로 가면 목록에 방금 쓴 내용이 보인다", async ({page}) => {
    const title = unique("회의록")
    await login(page)

    await page.getByRole("button", {name: "새 노트"}).click()
    await expect(page).toHaveURL(/\/s\//)
    const body = page.locator('.ProseMirror[contenteditable="true"]')
    await expect(body).toBeVisible()
    await page.getByPlaceholder("제목").fill(title)
    await body.click()
    await page.keyboard.type("방금 쓴 본문입니다")
    // 저장(마지막 편집 2초 뒤)을 기다리지 않고 곧바로 나간다.
    await page.getByRole("button", {name: "뒤로"}).click()

    await expect(page).toHaveURL(/\/$|\/\?/)
    const card = page.locator("[data-note-id]", {hasText: title})
    await expect(card).toBeVisible()
    await expect(card).toContainText("방금 쓴 본문입니다")
})

test("노트를 폴더로 옮기면 개인 노트에서 사라지고, 하위 포함을 켜면 다시 보인다", async ({page}) => {
    const folder = unique("업무")
    const title = unique("옮길 노트")
    await login(page)
    await createNote(page, await apiToken(page), {title})
    await page.reload()

    // 사이드바에서 폴더를 만든다.
    await page.getByRole("button", {name: "새 폴더"}).click()
    await page.locator("#new-folder-name").fill(folder)
    await page.keyboard.press("Enter")
    await expect(page.getByRole("button", {name: folder, exact: true})).toBeVisible()

    // 카드 메뉴 → 폴더 이동.
    const card = page.locator("[data-note-id]", {hasText: title})
    await card.hover()
    await card.locator(".drawer-menu").click()
    await page.getByRole("button", {name: "폴더 이동"}).click()
    await page.getByRole("dialog", {name: "폴더로 이동"}).getByRole("button", {name: folder}).click()

    await expect(card).toBeHidden()
    await page.getByRole("button", {name: "하위 포함"}).click()
    await expect(card).toBeVisible()
    await page.getByRole("button", {name: "하위 포함"}).click()
    await expect(card).toBeHidden()

    // 폴더 안에서는 보인다.
    await page.getByRole("button", {name: folder, exact: true}).click()
    await expect(page).toHaveURL(/folder=/)
    await expect(card).toBeVisible()
})
