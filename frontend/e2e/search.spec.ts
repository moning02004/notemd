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
