import {API_URL, apiToken, createNote, expect, login, test} from "./fixtures"

const unique = (name: string) => `${name} ${Date.now().toString(36)}`

test("검색하면 이름이 맞는 폴더가 노트보다 위에 나온다", async ({page}) => {
    const word = unique("분기").replace(" ", "")
    await login(page)
    const token = await apiToken(page)
    const created = await page.request.post(`${API_URL}/folders`,
        {headers: {Authorization: `Bearer ${token}`}, data: {name: `${word} 보고`}})
    expect(created.ok()).toBeTruthy()
    await createNote(page, token, {title: `${word} 계획`})
    await page.reload()

    await page.getByRole("button", {name: "검색"}).click()
    await page.getByPlaceholder("검색", {exact: true}).pressSequentially(word)

    // 검색 결과의 폴더 줄은 이름 뒤에 노트 수가 붙는다(사이드바의 같은 이름 버튼과 가른다).
    const folderRow = page.getByRole("button", {name: new RegExp(`${word} 보고\\s*\\d`)})
    // 검색 결과의 노트 줄(뒤에 깔린 목록 카드의 같은 제목과 가른다).
    const noteRow = page.locator(".font-bold", {hasText: `${word} 계획`})
    await expect(folderRow).toBeVisible()
    await expect(noteRow).toBeVisible()
    const folderTop = (await folderRow.boundingBox())!.y
    const noteTop = (await noteRow.boundingBox())!.y
    expect(folderTop).toBeLessThan(noteTop)

    await folderRow.click()
    await expect(page).toHaveURL(/folder=/)
})

test("검색 범위를 폴더로 좁히면 그 폴더 안의 노트만 나온다", async ({page}) => {
    const word = unique("결산").replace(" ", "")
    await login(page)
    const token = await apiToken(page)
    const headers = {Authorization: `Bearer ${token}`}
    const folderName = `${word} 자료`
    const created = await page.request.post(`${API_URL}/folders`, {headers, data: {name: folderName}})
    const folder: string = (await created.json()).hash_id
    await createNote(page, token, {title: `${word} 폴더 안`, folder})
    await createNote(page, token, {title: `${word} 폴더 밖`})
    await page.reload()

    await page.getByRole("button", {name: "검색"}).click()
    await page.getByPlaceholder("검색", {exact: true}).pressSequentially(word)
    const inside = page.locator(".font-bold", {hasText: `${word} 폴더 안`})
    const outside = page.locator(".font-bold", {hasText: `${word} 폴더 밖`})
    await expect(inside).toBeVisible()
    await expect(outside).toBeVisible()

    await page.getByRole("combobox", {name: "찾을 범위"}).click()
    await page.getByRole("option", {name: `/${folderName}`}).click()
    await expect(inside).toBeVisible()
    await expect(outside).toBeHidden()

    await page.getByRole("button", {name: "범위 풀기"}).click()
    await expect(outside).toBeVisible()
})
