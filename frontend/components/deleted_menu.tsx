import {LuEllipsisVertical} from "react-icons/lu";
import {Drawer} from "vaul";
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import {useNotesStore} from "@/store/notes";

export const DeletedMenu = ({noteId}: {noteId: string}) => {
    const {notes, setNotes, clearNotes} = useNotesStore()

    const restoreNote = async () => {
        await apiRequest.patch(`/notes/${noteId}/restore`).then((note_hashes: Array<string>) => {
            toast.success("노트가 복구되었습니다.")
            setNotes(notes.filter(note => note.hash_id != noteId))
        })
    }

    const permanentDelete = async () => {
        await apiRequest.delete(`/notes/${noteId}/permanently`).then((note_hashes: Array<string>) => {
            toast.success("노트가 삭제되었습니다.")
            setNotes(notes.filter(note => note.hash_id != noteId))
        })
    }

    return (
        <Drawer.Root>
            {/* 기존 버튼 그대로 */}
            <Drawer.Trigger asChild>
                <div className="drawer-button">
                    <button className="drawer-menu">
                        <LuEllipsisVertical size={22}/>
                    </button>
                </div>
            </Drawer.Trigger>

            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40"/>
                <Drawer.Content className="drawer-content">
                    <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-300"/>

                    <div className="flex flex-col p-4">
                        <button
                            className="w-full p-3 text-left hover:bg-[#efefef] cursor-pointer rounded border-b border-[#ededed]"
                            onClick={restoreNote}>복구
                        </button>
                        <button
                            className="w-full p-3 text-left hover:bg-[#efefef] cursor-pointer rounded border-b border-[#ededed]"
                            onClick={permanentDelete}>영구 삭제
                        </button>
                        <Drawer.Close
                            className="w-full p-3 hover:bg-[#efefef] rounded cursor-pointer text-left">취소</Drawer.Close>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
