import {LuEllipsisVertical} from "react-icons/lu";
import {Drawer} from "vaul";
import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";

export const NoteMenu = ({noteId, canDelete}: { noteId: string, canDelete: boolean }) => {
    const deleteNote = () => {
        apiRequest.delete(`/notes/${noteId}`).then(() => {
            toast.success("노트가 삭제되었습니다.")
            window.location.reload()
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

                    <div className="flex flex-col p-4 space-y-2">
                        <button
                            className="w-full p-2 text-left hover:bg-[#efefef] cursor-pointer rounded border-b border-[#ededed]">수정
                        </button>
                        {canDelete && <button
                            className="w-full p-2 text-left hover:bg-[#efefef] cursor-pointer rounded border-b border-[#ededed] text-red-600"
                            onClick={deleteNote}>삭제
                        </button>}
                        <Drawer.Close
                            className="w-full p-2 hover:bg-[#efefef] rounded cursor-pointer text-left">취소</Drawer.Close>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
