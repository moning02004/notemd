import {LuEllipsisVertical} from "react-icons/lu";
import {Drawer} from "vaul";
import {apiRequest} from "@/lib/api";

export const NoteMenu = ({noteId}: { noteId: string }) => {
    const deleteNote = () => {
        if (!confirm("정말로 이 노트를 삭제하시겠습니까?")) {
            return;
        }

        apiRequest.delete(`/notes/${noteId}`).then(() => {
            alert("노트가 삭제되었습니다.");
            window.location.reload()
        })
    }

    return (
        <Drawer.Root>
            {/* 기존 버튼 그대로 */}
            <Drawer.Trigger asChild>
                <div className="absolute flex right-3 top-3 opacity-0 group-hover:opacity-100">
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
            mx-auto w-[50vw]
            rounded-t-2xl bg-white
            border
          "
                >
                    <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-300"/>

                    <div className="flex flex-col p-4 space-y-2">
                        <button
                            className="w-full p-2 text-left hover:bg-[#efefef] cursor-pointer rounded border-b border-[#ededed]">수정
                        </button>
                        <button
                            className="w-full p-2 text-left hover:bg-[#efefef] cursor-pointer rounded border-b border-[#ededed] text-red-600"
                            onClick={deleteNote}
                        >삭제
                        </button>
                        <Drawer.Close
                            className="w-full p-2 hover:bg-[#efefef] rounded cursor-pointer text-left">취소</Drawer.Close>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
