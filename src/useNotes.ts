import { createSignal } from "solid-js";
import { Note } from "./types";

const useNotes = () => {
  const [notes, onNotesChange] = createSignal<Note[]>([]);
  const onNoteChange = (index: number, note: Note) => {
    onNotesChange([...notes().slice(0, index), note, ...notes().splice(index + 1)]);
  };

  const onInsertNote = (note: Note) => {
    const index = Math.max(
      notes().findIndex(({ ticks }) => ticks > note.ticks),
      0,
    );
    onNotesChange([...notes().slice(0, index), note, ...notes().splice(index)]);
    return index;
  };

  const onRemoveNote = (index: number) => {
    onNotesChange([...notes().slice(0, index), ...notes().splice(index + 1)]);
  };

  return {
    notes,
    onNotesChange,
    onNoteChange,
    onInsertNote,
    onRemoveNote,
  };
};

export default useNotes;
