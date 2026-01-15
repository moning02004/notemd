import {LuEllipsisVertical} from "react-icons/lu";
import {Drawer} from "vaul";
import {apiRequest} from "@/lib/api";

export const DeletedMenu = ({noteId}: {noteId: string}) => {
    const restoreNote = () => {
        apiRequest.patch(`/notes/${noteId}/restore`).then(r => {
            window.location.reload();
        })
    }

    const permanentDelete = () => {
        apiRequest.delete(`/notes/${noteId}/permanently`).then(r => {
            window.location.reload();
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
