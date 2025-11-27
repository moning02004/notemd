import { create } from 'zustand';

interface NoteState {
  title: string;
  content: string;
  url: string;
}

export const useNoteStore = create<NoteState>((set) => ({
  // isOpened: false,
  // setOpened: (flag) =>
  //     set(() => ({
  //         isOpened: flag,
  //     })),
  title: "",
  content: "",
  url: "",
}));
