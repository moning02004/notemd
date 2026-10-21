import {Page} from "@playwright/test"
import {apiToken, createNote, expect, login, test} from "./fixtures"

/** 코드 블록 하나가 든 노트를 열고 그 블록의 글 끝에 커서를 둔다. */
async function openCode(page: Page, content: string) {
    await login(page)
    const noteId = await createNote(page, await apiToken(page), {title: `코드 ${Date.now().toString(36)}`, content})
    await page.goto(`/s/${noteId}`)
    const code = page.locator('.ProseMirror[contenteditable="true"] pre code, .ProseMirror[contenteditable="true"] pre [data-node-view-content]').first()
    await expect(code).toBeVisible()
    return code
}

/** 에디터 문서에 든 코드 블록의 글(화면의 innerText 는 끝 줄바꿈이 들쭉날쭉하다). */
const codeText = (page: Page) => page.evaluate(() =>
    (document.querySelector('.ProseMirror[contenteditable="true"]') as unknown as {
        editor: { $node: (name: string) => { textContent: string } | null }
    }).editor.$node("codeBlock")!.textContent)

/** 코드 블록 글의 끝에서 back 글자 앞으로 커서를 둔다. */
async function toEnd(page: Page, back = 0) {
    await page.locator(".ProseMirror pre [data-node-view-content]").click()
    await page.evaluate(back => {
        const editor = (document.querySelector('.ProseMirror[contenteditable="true"]') as unknown as {
            editor: { state: { doc: { descendants: (f: (node: { type: { name: string }, nodeSize: number }, pos: number) => void) => void } }, commands: { setTextSelection: (pos: number) => void } }
        }).editor
        let end = 0
        editor.state.doc.descendants((node, pos) => {
            if (node.type.name === "codeBlock") end = pos + node.nodeSize - 1
        })
        editor.commands.setTextSelection(end - back)
    }, back)
}

test("코드 블록에서 Enter 는 들여쓰기를 잇고, 빈 줄에서 다시 누르면 한 단계 내민다", async ({page}) => {
    await openCode(page, "<p>위</p><pre><code>start</code></pre>")
    await toEnd(page)

    await page.keyboard.press("Enter")
    await page.keyboard.press("Tab")
    await page.keyboard.type("a")
    await page.keyboard.press("Enter")
    await page.keyboard.type("b")
    expect(await codeText(page)).toBe("start\n    a\n    b")

    await page.keyboard.press("Enter")
    await page.keyboard.press("Enter")
    await page.keyboard.type("c")
    expect(await codeText(page)).toBe("start\n    a\n    b\nc")
})

test("여는 괄호 뒤 Enter 는 한 단계 더 들이고, 닫는 괄호는 아래 줄로 내린다", async ({page}) => {
    await openCode(page, "<p>위</p><pre><code>if (x) {}</code></pre>")
    await toEnd(page, 1)
    await page.keyboard.press("Enter")
    await page.keyboard.type("y")
    expect(await codeText(page)).toBe("if (x) {\n    y\n}")
})

test("YAML 은 두 칸씩 들이고, 목록 항목 다음 줄은 \"- \" 뒤 글자 자리에 맞춘다", async ({page}) => {
    await openCode(page, '<p>위</p><pre><code class="language-yaml">env:</code></pre>')
    await toEnd(page)
    await page.keyboard.press("Enter")
    await page.keyboard.type("- name: namename")
    await page.keyboard.press("Enter")
    await page.keyboard.type('value: "123123"')
    await page.keyboard.press("Enter")
    await page.keyboard.press("Enter")
    await page.keyboard.type("- name: other")
    expect(await codeText(page)).toBe('env:\n  - name: namename\n    value: "123123"\n  - name: other')
})

test("Shift-Enter 는 블록을 빠져나가지 않고 Enter 처럼 줄을 바꾼다, 탭 문자 들여쓰기도 잇는다", async ({page}) => {
    await openCode(page, "<p>위</p><pre><code>func main() {\n\tx := 1</code></pre>")
    await toEnd(page)
    await page.keyboard.press("Shift+Enter")
    await page.keyboard.type("y")
    expect(await codeText(page)).toBe("func main() {\n\tx := 1\n\ty")
    await page.keyboard.press("Shift+Tab")
    expect(await codeText(page)).toBe("func main() {\n\tx := 1\ny")
})

test("Tab·Shift-Tab 은 고른 줄들을 한꺼번에 들이고 내민다, Backspace 는 한 단계씩 지운다", async ({page}) => {
    await openCode(page, "<p>위</p><pre><code>a\nb</code></pre>")
    await toEnd(page)
    await page.keyboard.press("ControlOrMeta+a")
    await page.keyboard.press("Tab")
    expect(await codeText(page)).toBe("    a\n    b")
    await page.keyboard.press("Shift+Tab")
    expect(await codeText(page)).toBe("a\nb")

    await toEnd(page)
    await page.keyboard.press("Enter")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Backspace")
    await page.keyboard.type("c")
    expect(await codeText(page)).toBe("a\nb\n    c")
})

test("코드 블록 안에서 전체 선택은 그 코드만 고르고, 한 번 더 누르면 문서 전체를 고른다", async ({page}) => {
    await openCode(page, "<p>앞 문단</p><pre><code>line1\nline2</code></pre><p>뒤 문단</p>")
    await toEnd(page)
    await page.keyboard.press("ControlOrMeta+a")
    expect(await page.evaluate(() => window.getSelection()!.toString())).toBe("line1\nline2")
    await page.keyboard.press("ControlOrMeta+a")
    expect(await page.evaluate(() => window.getSelection()!.toString())).toContain("앞 문단")
})

test("Enter 로 내려가며 써도 커서가 화면 바닥에 붙지 않는다", async ({page}) => {
    const lines = Array.from({length: 40}, (_, i) => `<p>줄 ${i}</p>`).join("")
    await openCode(page, `${lines}<pre><code>a</code></pre>`)
    await toEnd(page)
    for (let i = 0; i < 20; i++) {
        await page.keyboard.press("Enter")
        await page.keyboard.type(`x${i}`)
    }
    const gap = await page.evaluate(() => innerHeight - window.getSelection()!.getRangeAt(0).getClientRects()[0].bottom)
    expect(gap).toBeGreaterThan(80)
})

test("코드 블록 위 막대를 끌어 다른 자리로 옮긴다", async ({page}) => {
    await openCode(page, "<p>첫째</p><p>둘째</p><pre><code>moved</code></pre>")
    const editor = page.locator('.ProseMirror[contenteditable="true"]')
    await editor.locator(".code-block-header").dragTo(editor.getByText("첫째"), {targetPosition: {x: 2, y: 2}})
    await expect.poll(() => editor.evaluate(el => [...el.children].map(c => c.textContent?.includes("moved") ? "code" : c.textContent)))
        .toEqual(["code", "첫째", "둘째"])
})

test("코드 블록을 접기 제목 위에 놓으면 접기 본문 맨 앞에 들어가고, 접혀 있었으면 펼친다", async ({page}) => {
    await openCode(page, '<p>위</p><details class="details"><summary>접기 제목</summary>'
        + '<div data-type="detailsContent"><p>접기 안 글</p></div></details><p>가운데</p><pre><code>moved</code></pre>')
    const header = (await page.locator(".ProseMirror .code-block-header").boundingBox())!
    await page.mouse.move(header.x + 200, header.y + header.height / 2)
    await page.mouse.down()
    await page.mouse.move(header.x + 210, header.y + 10, {steps: 3})
    const summary = (await page.locator(".ProseMirror summary").boundingBox())!
    await page.mouse.move(summary.x + 40, summary.y + summary.height / 2, {steps: 10})
    await expect(page.locator(".ProseMirror .details.drop-into")).toHaveCount(1)
    await page.mouse.up()

    await expect(page.locator(".ProseMirror .details.drop-into")).toHaveCount(0)
    expect(await page.evaluate(() => (document.querySelector('.ProseMirror[contenteditable="true"]') as unknown as {
        editor: { getHTML: () => string }
    }).editor.getHTML())).toBe('<p>위</p><details class="details" open=""><summary>접기 제목</summary>'
        + '<div data-type="detailsContent"><pre><code>moved</code></pre><p>접기 안 글</p></div></details><p>가운데</p>')
})
