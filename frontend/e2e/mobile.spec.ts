import {API_URL, apiToken, expect, login, test} from "./fixtures"

test.use({viewport: {width: 390, height: 844}, hasTouch: true})

test("휴대폰에서 폴더 이름을 바꾸고 지운다", async ({page}) => {
    const name = `여행 ${Date.now().toString(36)}`
    const renamed = `${name} 기록`
    await login(page)
    const created = await page.request.post(`${API_URL}/folders`,
        {headers: {Authorization: `Bearer ${await apiToken(page)}`}, data: {name}})
    expect(created.ok()).toBeTruthy()
    await page.reload()

    await page.getByRole("button", {name: `${name} 폴더 메뉴`}).click()
    await page.getByRole("button", {name: "이름 바꾸기"}).click()
    await page.locator("#folder-name").fill(renamed)
    await page.getByRole("button", {name: "바꾸기", exact: true}).click()
    await expect(page.getByRole("button", {name: `${renamed} 폴더 메뉴`})).toBeVisible()

    page.once("dialog", dialog => dialog.accept())
    await page.getByRole("button", {name: `${renamed} 폴더 메뉴`}).click()
    await page.getByRole("button", {name: "삭제", exact: true}).click()
    await expect(page.getByRole("button", {name: `${renamed} 폴더 메뉴`})).toHaveCount(0)
})
