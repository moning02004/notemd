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
                <div className="absolute flex right-3 top-3 opacity-100 md:opacity-0 group-hover:opacity-100">
                    <button className="px-1 bg-[#fafafa] cursor-pointer hover:text-[#9a9a9a] rounded">
                        <LuEllipsisVertical size={22}/>
                    </button>
                </div>
            </Drawer.Trigger>

            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40"/>

                <Drawer.Content
                    className="
            fixed bottom-0 left-0 right-0 z-50
            mx-auto w-[95vw] md:w-[50vw]
            rounded-t-2xl bg-white
            border
          "
                >
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
