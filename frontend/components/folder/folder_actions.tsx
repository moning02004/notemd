"use client"

import {useState} from "react"
import {FiMoreHorizontal} from "react-icons/fi"
import {ActionDrawer} from "@/components/ui/action_drawer"
import {Modal} from "@/components/ui/modal"
import {Spinner} from "@/components/icons"
import {useCreateFolder, useDeleteFolder, useRenameFolder} from "@/hooks/useFolders"
import {FolderNode} from "@/types/folder"

/**
 * 휴대폰에서 폴더를 고치는 메뉴(이름 바꾸기·하위 폴더·삭제).
 *
 * 데스크톱은 사이드바 폴더 줄에 마우스를 올리면 ⋯ 가 나오지만, 휴대폰에는 사이드바도 호버도 없어
 * 폴더를 만든 뒤 고칠 길이 없었다. 아래에서 올라오는 메뉴로 같은 일을 하게 한다.
 */
export function FolderActions({folder, onDeleted}: {
    folder: FolderNode
    /** 지운 뒤에 할 일. 보고 있던 폴더를 지웠으면 위로 올라가야 한다. */
    onDeleted?: () => void
}) {
    const renameFolder = useRenameFolder()
    const createFolder = useCreateFolder()
    const deleteFolder = useDeleteFolder()

    // 이름을 적는 창. 이름 바꾸기와 하위 폴더 추가가 같이 쓴다.
    const [naming, setNaming] = useState<"rename" | "child" | null>(null)
    const [draftName, setDraftName] = useState("")
    const busy = renameFolder.isPending || createFolder.isPending

    const open = (mode: "rename" | "child") => {
        setDraftName(mode === "rename" ? folder.name : "")
        setNaming(mode)
    }

    const submit = async () => {
        const name = draftName.trim()
        if (!name || busy) return
        if (naming === "rename") {
            if (name !== folder.name) await renameFolder.mutateAsync({hashId: folder.hash_id, name})
        } else {
            await createFolder.mutateAsync({name, parent: folder.hash_id})
        }
        setNaming(null)
    }

    const canAddChild = folder.depth < 2

    return (
        <>
            <ActionDrawer
                trigger={
                    <button aria-label={`${folder.name} 폴더 메뉴`}
                            className="flex items-center justify-center w-11 h-11 shrink-0 rounded-lg text-muted
                                       cursor-pointer active:bg-background">
                        <FiMoreHorizontal size={18}/>
                    </button>
                }
                items={[
                    {label: "이름 바꾸기", onClick: () => open("rename")},
                    {
                        label: canAddChild ? "하위 폴더 추가" : "하위 폴더 추가 (3단계까지만)",
                        onClick: canAddChild ? () => open("child") : undefined,
                        extraClass: canAddChild ? undefined : "cursor-not-allowed text-subtle",
                    },
                    {
                        label: "삭제",
                        danger: true,
                        onClick: () => {
                            if (!confirm(`'${folder.name}' 폴더를 지웁니다. 안에 있는 노트는 휴지통으로 갑니다.`)) return
                            deleteFolder.mutate(folder.hash_id, {onSuccess: onDeleted})
                        },
                    },
                ]}
            />

            <Modal isOpen={naming !== null} onClose={() => setNaming(null)}
                   className="w-[88vw] max-w-sm rounded-xl p-4 gap-3">
                <p className="text-[15px] font-semibold text-foreground">
                    {naming === "rename" ? "폴더 이름 바꾸기" : `‘${folder.name}’ 안에 새 폴더`}
                </p>
                <form className="flex flex-col gap-3" onSubmit={event => {
                    event.preventDefault()
                    submit()
                }}>
                    <input
                        id="folder-name"
                        autoFocus
                        value={draftName}
                        onChange={event => setDraftName(event.target.value)}
                        onFocus={event => event.target.select()}
                        placeholder="폴더 이름"
                        autoComplete="off"
                        // 16px 보다 작으면 iOS 가 입력할 때 화면을 확대한다.
                        className="border border-border-strong rounded-lg px-3 h-11 text-[16px] text-foreground
                                   bg-surface outline-none focus:border-accent"
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setNaming(null)}
                                className="flex-1 h-11 rounded-lg border border-border text-[14px] font-medium
                                           text-muted cursor-pointer active:bg-background">
                            취소
                        </button>
                        <button type="submit" disabled={!draftName.trim() || busy}
                                className="flex-1 h-11 rounded-lg bg-accent text-white text-[14px] font-semibold
                                           cursor-pointer flex items-center justify-center gap-1.5
                                           disabled:opacity-40 disabled:cursor-not-allowed">
                            {busy && <Spinner size={15}/>}
                            {naming === "rename" ? "바꾸기" : "만들기"}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    )
}
