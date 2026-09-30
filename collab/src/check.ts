/*
 * 스키마 왕복 확인: 저장된 HTML → Y 문서 → (인코딩·디코딩) → HTML 이 원래와 같은지.
 * 설계 문서의 가장 큰 위험(스키마가 어긋나 노드·속성이 사라진다)을 실제 노트로 본다.
 *
 *   npm run check -- samples.json     (samples.json: [{"title": "...", "html": "..."}, ...])
 */
import {readFileSync} from "node:fs"
import {generateJSON} from "@tiptap/html/server"
import * as Y from "yjs"
import {bodyHtml, fillFromHtml, titleOf} from "./convert"
import {SCHEMA_EXTENSIONS} from "./editor_schema"

// HTML 표기가 달라도(에디터 밖에서 만든 HTML, style 값의 rgb/hex) 문서 트리가 같으면 내용은 그대로다.
const tree = (html: string) => JSON.stringify(generateJSON(html, SCHEMA_EXTENSIONS))

const file = process.argv[2]
if (!file) {
    console.error("사용법: npm run check -- samples.json")
    process.exit(2)
}
const samples: { title: string, html: string }[] = JSON.parse(readFileSync(file, "utf8"))

let failed = 0
for (const sample of samples) {
    const doc = new Y.Doc()
    fillFromHtml(doc, sample.html, sample.title)
    // 저장·불러오기처럼 바이너리로 한 번 오간다.
    const reloaded = new Y.Doc()
    Y.applyUpdate(reloaded, Y.encodeStateAsUpdate(doc))
    const html = bodyHtml(reloaded)
    const same = html === sample.html
    const sameTree = same || tree(html) === tree(sample.html)
    if (!sameTree) failed += 1
    const verdict = same ? "같음" : sameTree ? "표기만 다름" : "내용 다름"
    console.log(`${verdict}  ${sample.title}  (${sample.html.length}자, 제목 ${titleOf(reloaded) === sample.title ? "같음" : "다름"})`)
    if (!sameTree) {
        // 처음 달라지는 곳을 보여 준다.
        let i = 0
        while (i < html.length && html[i] === sample.html[i]) i++
        console.log(`   원래: …${sample.html.slice(Math.max(0, i - 60), i + 120)}`)
        console.log(`   왕복: …${html.slice(Math.max(0, i - 60), i + 120)}`)
    }
}
console.log(`\n${samples.length}개 중 ${samples.length - failed}개 내용 같음`)
process.exit(failed ? 1 : 0)
