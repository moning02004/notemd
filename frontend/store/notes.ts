import {create} from "zustand"
import {NoteCard} from "@/types/note";

interface NotesStore {
    notes: Array<NoteCard>

    setNotes: (values: Array<NoteCard>) => void
}

export const useNotesStore = create<NotesStore>((set) => ({
    notes: [],
    setNotes: (values: Array<NoteCard>) => {
        set({notes: values})
    },
}))