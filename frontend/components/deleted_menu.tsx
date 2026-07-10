import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import {useNotesStore} from "@/store/notes";
import {ActionDrawer} from "@/components/ui/action_drawer";

export const DeletedMenu = ({noteId, trigger}: {noteId: string, trigger?: React.ReactNode}) => {
    const {notes, setNotes} = useNotesStore()

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
        <ActionDrawer
            trigger={trigger}
            items={[
                {label: "복구", onClick: restoreNote},
                {label: "영구 삭제", onClick: permanentDelete},
            ]}
        />
    );
}
