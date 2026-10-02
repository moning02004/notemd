import {ReactNodeViewRenderer} from "@tiptap/react"
import {CollectionBase} from "@/lib/editor_schema"
import {emptyCollection, serializeCollection} from "@/lib/collection_core"
import {CollectionView} from "@/components/collection/collection_view"

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        collection: {
            /** 지금 자리에 새 콜렉션을 넣는다. */
            insertCollection: () => ReturnType
        }
    }
}

/**
 * 콜렉션. 스키마(data 속성, 저장 HTML)는 lib/editor_schema.ts 의 CollectionBase 에 있고
 * (공동 편집 서버와 함께 쓴다), 여기서는 화면(노드 뷰)과 넣는 명령만 더한다.
 */
export const Collection = CollectionBase.extend({
    addCommands() {
        return {
            insertCollection: () => ({commands}) => commands.insertContent([
                {type: this.name, attrs: {data: serializeCollection(emptyCollection())}},
                // 표 뒤에 이어 쓸 줄. 문서 끝에 넣으면 커서를 둘 곳이 없다.
                {type: "paragraph"},
            ]),
        }
    },

    addNodeView() {
        return ReactNodeViewRenderer(CollectionView, {
            /*
             * 표 안에서 일어나는 일(누르기, 글 치기, 붙여넣기)은 표가 다 처리한다. 에디터가 받으면 누를 때마다
             * 표 전체가 골라지고 포커스를 빼앗아, 칸을 고치다 말고 키보드가 내려가거나 Backspace 가 표를 지운다.
             * 끌어서 옮기기만 에디터에 맡긴다. 표를 통째로 지우려면 표 바로 뒤에서 Backspace 로 고른 뒤 지운다.
             */
            stopEvent: ({event}) => !event.type.startsWith("drag") && event.type !== "drop",
        })
    },
})
