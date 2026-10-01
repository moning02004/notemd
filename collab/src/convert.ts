/*
 * 노트 HTML ↔ Y 문서.
 *
 * 스키마는 프론트와 같은 lib/editor_schema.ts(SCHEMA_EXTENSIONS)를 쓰고, Y 변환은 에디터의 Collaboration 확장과
 * 같은 @tiptap/y-tiptap 을 쓴다. 두 쪽이 같은 코드로 문서를 읽고 써야 노드·속성이 사라지지 않는다.
 *
 * Y 문서의 구성(에디터와 약속):
 *   - XmlFragment "default": 본문(Tiptap Collaboration 의 기본 field)
 *   - Text "title": 제목(제목도 같이 편집한다)
 *   - Map "meta": "epoch" = 이 Y 문서의 내력 id. 저장본 HTML 로 새로 만들 때마다 바뀐다.
 *
 * epoch: 브라우저는 이 기기에 Y 문서 사본을 둔다(오프라인 편집). 서버가 HTML 로 문서를 새로 만들면(바깥에서 본문을
 * 바꿔 Y 문서가 비워진 뒤) 내용이 같아도 내력이 달라, 낡은 사본과 합치면 글이 두 번 들어간다. epoch 가 다르면
 * 합치지 않는다.
 */
import {getSchema} from "@tiptap/core"
import {generateHTML, generateJSON} from "@tiptap/html/server"
import {prosemirrorJSONToYXmlFragment, yXmlFragmentToProsemirrorJSON} from "@tiptap/y-tiptap"
import {randomUUID} from "node:crypto"
import * as Y from "yjs"
import {SCHEMA_EXTENSIONS} from "./editor_schema"

export const BODY_FIELD = "default"
export const TITLE_FIELD = "title"
export const META_FIELD = "meta"

const schema = getSchema(SCHEMA_EXTENSIONS)

/** 저장된 HTML·제목으로 Y 문서를 채운다(처음 여는 노트). 문서는 비어 있어야 한다. */
export function fillFromHtml(doc: Y.Doc, html: string, title: string): void {
    const json = generateJSON(html || "<p></p>", SCHEMA_EXTENSIONS)
    doc.transact(() => {
        prosemirrorJSONToYXmlFragment(schema, json, doc.getXmlFragment(BODY_FIELD))
        doc.getText(TITLE_FIELD).insert(0, title || "")
        doc.getMap(META_FIELD).set("epoch", randomUUID())
    })
}

export function epochOf(doc: Y.Doc): string | undefined {
    return doc.getMap(META_FIELD).get("epoch") as string | undefined
}

/** epoch 가 없는 문서(4.0.0 에서 저장한 것)에 하나 붙인다. 붙였으면 true(곧바로 저장해야 한다). */
export function ensureEpoch(doc: Y.Doc): boolean {
    if (epochOf(doc)) return false
    doc.getMap(META_FIELD).set("epoch", randomUUID())
    return true
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

/** 마크다운에서 바꾼 HTML 을 문서 끝에 붙인다(에이전트 덧붙이기). 빈 노트면 빈 줄을 남기지 않고 바꾼다. */
export function appendHtml(doc: Y.Doc, html: string): void {
    const addition = generateJSON(html, SCHEMA_EXTENSIONS)
    const fragment = doc.getXmlFragment(BODY_FIELD)
    const scratch = new Y.Doc()
    prosemirrorJSONToYXmlFragment(schema, addition, scratch.getXmlFragment(BODY_FIELD))
    const nodes = scratch.getXmlFragment(BODY_FIELD).toArray().map(node => (node as Y.XmlElement).clone())
    const isEmpty = bodyHtml(doc) === "<p></p>"
    doc.transact(() => {
        if (isEmpty) fragment.delete(0, fragment.length)
        fragment.insert(fragment.length, nodes)
    })
}
