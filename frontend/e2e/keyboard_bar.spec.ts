import {Page} from "@playwright/test"
import {apiToken, createNote, expect, login, test} from "./fixtures"

test.use({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true})

type EditorHandle = {
    getHTML: () => string
    state: { selection: { head: number }, doc: { textBetween: (a: number, b: number) => string } }
    commands: { setTextSelection: (pos: number) => void, focus: () => void }
}

const editorEval = <T, >(page: Page, run: (editor: EditorHandle) => T) => page.evaluate(run =>
    new Function("editor", `return (${run})(editor)`)(
        (document.querySelector('.ProseMirror[contenteditable="true"]') as unknown as { editor: EditorHandle }).editor),
    run.toString()) as Promise<T>

async function openNote(page: Page, content: string) {
    await login(page)
    const noteId = await createNote(page, await apiToken(page), {title: `키보드 ${Date.now().toString(36)}`, content})
    await page.goto(`/s/${noteId}`)
    const body = page.locator('.ProseMirror[contenteditable="true"]')
    await expect(body).toBeVisible()
    // 개발 서버의 Next.js 표시(왼쪽 아래)가 막대의 첫 단추를 덮는다.
    await page.addStyleTag({content: "nextjs-portal { display: none !important; }"})
    return body
}

test("휴대폰에서 본문을 쓰는 동안 키보드 위 막대로 목록을 들이고 내민다", async ({page}) => {
    const body = await openNote(page, "<ul><li><p>하나</p></li><li><p>둘</p></li></ul>")
    const bar = page.getByRole("toolbar", {name: "키보드 도구"})
    await expect(bar).toHaveCount(0)

    await body.getByText("둘").tap()
    await expect(bar).toBeVisible()
    await bar.getByRole("button", {name: "들여쓰기"}).tap()
    await expect.poll(() => editorEval(page, editor => editor.getHTML())).toContain("<li><p>하나</p><ul><li><p>둘</p></li></ul></li>")
    // 단추를 눌러도 본문 포커스가 남아 이어 쓸 수 있다.
    await page.keyboard.type("!")
    await expect(body).toContainText("둘!")

    await bar.getByRole("button", {name: "내어쓰기"}).tap()
    await expect.poll(() => editorEval(page, editor => editor.getHTML())).toContain("<li><p>하나</p></li><li><p>둘!</p></li>")

    const outdented = await editorEval(page, editor => editor.getHTML())
    await bar.getByRole("button", {name: "되돌리기"}).tap()
    await expect.poll(() => editorEval(page, editor => editor.getHTML())).not.toBe(outdented)

    await bar.getByRole("button", {name: "키보드 내리기"}).tap()
    await expect(bar).toHaveCount(0)
})

test("키보드 위 막대의 화살표로 커서를 옮긴다", async ({page}) => {
    const body = await openNote(page, "<p>첫째 줄</p><p>둘째 줄</p>")
    await body.getByText("둘째 줄").tap()
    const bar = page.getByRole("toolbar", {name: "키보드 도구"})
    // "둘째| 줄" (첫 문단 1~5, 둘째 문단 글은 7 부터)
    await editorEval(page, editor => editor.commands.setTextSelection(9))
    const charBefore = () => editorEval(page, editor => {
        const head = editor.state.selection.head
        return editor.state.doc.textBetween(Math.max(0, head - 1), head)
    })

    await bar.getByRole("button", {name: "왼쪽으로"}).tap()
    expect(await charBefore()).toBe("둘")
    await bar.getByRole("button", {name: "위로"}).tap()
    await page.keyboard.type("|")
    await expect(body.locator("p").first()).toHaveText(/^첫.?\|/)
    await bar.getByRole("button", {name: "아래로"}).tap()
    await bar.getByRole("button", {name: "오른쪽으로"}).tap()
    await page.keyboard.type("^")
    await expect(body.locator("p").nth(1)).toContainText("^")
})

test("키보드가 올라와 보이는 화면이 줄면 막대가 키보드 바로 위로 올라간다", async ({page}) => {
    // 실제 키보드는 띄울 수 없어 iOS Safari 의 visualViewport·innerHeight 를 흉내 낸다.
    await page.addInitScript(() => {
        // 키보드가 오르기 전에는 화면 전체(844). init 스크립트가 도는 때는 아직 문서가 없어 높이를 미리 잴 수 없다.
        const fake = Object.assign(new EventTarget(), {offsetTop: 0, height: 844, width: 390})
        Object.defineProperty(window, "visualViewport", {get: () => fake})
        // iOS Safari 는 키보드가 오르면 innerHeight 도 보이는 화면만큼 준다.
        Object.defineProperty(window, "innerHeight", {get: () => fake.height})
        ;(window as unknown as { openKeyboard: (height: number) => void }).openKeyboard = height => {
            fake.height = height
            fake.dispatchEvent(new Event("resize"))
        }
    })
    const body = await openNote(page, "<p>본문</p>")
    await body.getByText("본문").tap()
    const bar = page.getByRole("toolbar", {name: "키보드 도구"})
    await expect(bar).toBeVisible()

    await page.evaluate(() => (window as unknown as { openKeyboard: (height: number) => void }).openKeyboard(500))
    await expect.poll(async () => Math.round((await bar.boundingBox())!.y + (await bar.boundingBox())!.height)).toBe(500)
})
