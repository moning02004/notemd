import {API_URL, apiToken, createNote, expect, login, test} from "./fixtures"

test("에이전트 API 로 본문을 바꾸면 노트 화면에 바뀐 내용이 보인다", async ({page}) => {
    const title = `다시 쓸 노트 ${Date.now().toString(36)}`
    await login(page)
    const token = await apiToken(page)
    const noteId = await createNote(page, token, {title, content: "<p>지워질 옛 본문</p>"})
    const issued = await page.request.post(`${API_URL}/api-tokens`,
        {headers: {Authorization: `Bearer ${token}`}, data: {name: "E2E", scope: "write"}})
    const agentToken: string = (await issued.json()).token

    // 노트를 한 번 열어 공동 편집 문서를 만들어 둔다(열려 있던 문서도 바뀌어야 한다).
    await page.goto(`/s/${noteId}`)
    await expect(page.locator(".ProseMirror")).toContainText("지워질 옛 본문")

    const replaced = await page.request.put(`${API_URL}/api/v1/notes/${noteId}`,
        {headers: {Authorization: `Bearer ${agentToken}`}, data: {content: "## 새로 쓴 본문\n\n- 첫째"}})
    expect(replaced.ok()).toBeTruthy()

    // 열어 둔 화면이 새로 고치지 않아도 바뀐다.
    await expect(page.locator(".ProseMirror")).toContainText("새로 쓴 본문")
    await expect(page.locator(".ProseMirror")).not.toContainText("지워질 옛 본문")
    await expect(page.getByPlaceholder("제목")).toHaveValue(title)
})
