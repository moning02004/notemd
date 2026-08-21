import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import {useNotesStore} from "@/store/notes";
import {downloadNoteRequest} from "@/lib/note";
import {ActionDrawer} from "@/components/ui/action_drawer";

export const NoteMenu = ({noteId, canDelete, trigger}: {
    noteId: string,
    canDelete: boolean,
    trigger?: React.ReactNode
}) => {
    const {notes, setNotes} = useNotesStore();
    console.log(canDelete)

    const deleteNote = () => {
        apiRequest.delete(`/notes/${noteId}`)
            .then((note_hashes: Array<string>) => {
                toast.success("노트가 삭제되었습니다.")
                setNotes(notes.filter(note => !note_hashes.includes(note.hash_id)))
            })
    }
    const downloadNote = async () => {
        await downloadNoteRequest([noteId])
    }

    return (
        <ActionDrawer
            trigger={trigger}
            items={[
                {label: "수정"},
                {label: "다운로드", onClick: downloadNote},
                ...(canDelete ? [{label: "삭제", onClick: deleteNote, danger: true}] : []),
            ]}
        />
    );
}
