import {apiRequest} from "@/lib/api";
import toast from "react-hot-toast";
import {useNotesStore} from "@/store/notes";
import {downloadNoteRequest} from "@/lib/note";
import {ActionDrawer} from "@/components/ui/action_drawer";

export const NoteMenu = ({noteId, canDelete, canDownload, trigger}: {
    noteId: string,
    canDelete?: boolean,
    canDownload?: boolean,
    trigger?: React.ReactNode
}) => {
    const {notes, setNotes} = useNotesStore();

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
                {
                    label: canDownload ? "다운로드" : "다운로드 불가",
                    onClick: canDownload ? downloadNote : () => alert("다운로드 권한이 없습니다."),
                    extraClass: !canDownload && "cursor-not-allowed text-muted"
                },
                {
                    label: canDelete ? "삭제" : "삭제 불가",
                    onClick: canDelete ? deleteNote : () => alert("삭제 권한이 없습니다."),
                    danger: true,
                    extraClass: !canDelete && "cursor-not-allowed text-muted"
                },
            ]}
        />
    );
}
