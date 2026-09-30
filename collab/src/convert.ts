/*
 * 노트 HTML ↔ Y 문서.
 *
 * 스키마는 프론트와 같은 lib/editor_schema.ts(SCHEMA_EXTENSIONS)를 쓰고, Y 변환은 에디터의 Collaboration 확장과
 * 같은 @tiptap/y-tiptap 을 쓴다. 두 쪽이 같은 코드로 문서를 읽고 써야 노드·속성이 사라지지 않는다.
 *
 * Y 문서의 구성(에디터와 약속):
 *   - XmlFragment "default": 본문(Tiptap Collaboration 의 기본 field)
 *   - Text "title": 제목(제목도 같이 편집한다)
 */
import {getSchema} from "@tiptap/core"
import {generateHTML, generateJSON} from "@tiptap/html/server"
import {prosemirrorJSONToYXmlFragment, yXmlFragmentToProsemirrorJSON} from "@tiptap/y-tiptap"
import * as Y from "yjs"
import {SCHEMA_EXTENSIONS} from "./editor_schema"

export const BODY_FIELD = "default"
export const TITLE_FIELD = "title"

const schema = getSchema(SCHEMA_EXTENSIONS)

/** 저장된 HTML·제목으로 Y 문서를 채운다(처음 여는 노트). 문서는 비어 있어야 한다. */
export function fillFromHtml(doc: Y.Doc, html: string, title: string): void {
    const json = generateJSON(html || "<p></p>", SCHEMA_EXTENSIONS)
    doc.transact(() => {
        prosemirrorJSONToYXmlFragment(schema, json, doc.getXmlFragment(BODY_FIELD))
        doc.getText(TITLE_FIELD).insert(0, title || "")
    })
}

/** Y 문서의 본문을 HTML 로(검색·내보내기·API 가 읽는 사본). */
export function bodyHtml(doc: Y.Doc): string {
    const json = yXmlFragmentToProsemirrorJSON(doc.getXmlFragment(BODY_FIELD))
    // 빈 문서는 content 가 없는 doc 이다. 에디터가 저장하던 모양(<p></p>)에 맞춘다.
    if (!json.content?.length) return "<p></p>"
    return generateHTML(json, SCHEMA_EXTENSIONS)
}

export function titleOf(doc: Y.Doc): string {
    return doc.getText(TITLE_FIELD).toString()
}

/** 마크다운에서 바꾼 HTML 을 문서 끝에 붙인다(에이전트 덧붙이기). */
export function appendHtml(doc: Y.Doc, html: string): void {
    const addition = generateJSON(html, SCHEMA_EXTENSIONS)
    const fragment = doc.getXmlFragment(BODY_FIELD)
    const scratch = new Y.Doc()
    prosemirrorJSONToYXmlFragment(schema, addition, scratch.getXmlFragment(BODY_FIELD))
    const nodes = scratch.getXmlFragment(BODY_FIELD).toArray().map(node => (node as Y.XmlElement).clone())
    doc.transact(() => fragment.insert(fragment.length, nodes))
}
