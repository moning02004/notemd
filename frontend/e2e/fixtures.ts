import {expect, Page, test} from "@playwright/test"
import {Account, readAccount} from "./account"

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8002"

/** 로그인 화면으로 들어가 개인 노트 목록이 보일 때까지. */
export async function login(page: Page, account: Account = readAccount()) {
    await page.goto("/login")
    await page.getByPlaceholder("아이디를 입력하세요").fill(account.username)
    await page.locator('input[type="password"]').fill(account.password)
    await page.getByRole("button", {name: "로그인", exact: true}).click()
    await expect(page).toHaveURL(/\/$|\/\?/)
    await expect(page.getByRole("heading", {name: "개인 노트"})).toBeVisible()
}

/** 화면을 거치지 않고 API 로 일하기 위한 로그인 토큰. */
export async function apiToken(page: Page, account: Account = readAccount()): Promise<string> {
    const response = await page.request.post(`${API_URL}/auth/obtain-token`,
        {data: {username: account.username, password: account.password}})
    expect(response.ok()).toBeTruthy()
    return (await response.json()).access_token
}

/** API 로 노트를 만든다. 테스트의 준비 단계(화면으로 만들 필요가 없는 노트)에 쓴다. */
export async function createNote(page: Page, token: string, fields: { title: string, content?: string, folder?: string }) {
    const headers = {Authorization: `Bearer ${token}`}
    await page.request.get(`${API_URL}/preferences`, {headers})
    const created = await page.request.post(`${API_URL}/notes`, {headers, data: {}})
    const noteId: string = (await created.json()).hash_id
    const response = await page.request.patch(`${API_URL}/notes/${noteId}`, {
        headers, data: {title: fields.title, content: fields.content ?? `<p>${fields.title} 본문</p>`, folder: fields.folder},
    })
    expect(response.ok()).toBeTruthy()
    return noteId
}

export {expect, test}
