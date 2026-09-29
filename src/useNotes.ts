import { createSignal } from "solid-js";
import { Note } from "./types";

/** A track's notes, kept sorted by start time.
 *
 * Every operation here builds a new array and leaves the old one alone. That is
 * not a style preference: this used to reach for `splice`, which edits in place
 * and returns what it removed, so each "copy" quietly rewrote the very array it
 * was copying from — the caller's array, if the caller had handed one in. The
 * notes came back out of order, the returned insert index pointed at the wrong
 * note, and a track someone else still held a reference to changed underneath
 * them.
 */
const useNotes = () => {
  const [notes, onNotesChange] = createSignal<Note[]>([]);

  const onNoteChange = (index: number, note: Note) => {
    onNotesChange(notes().map((existing, current) => (current === index ? note : existing)));
  };

  /** Insert in start-time order, and answer with where it landed — the caller
   *  needs that index to go on dragging the note it just created. */
  const onInsertNote = (note: Note) => {
    const current = notes();
    const following = current.findIndex(({ ticks }) => ticks > note.ticks);
    // No later note means this one belongs at the end. findIndex says -1 for
    // that, and reading -1 as "the front" is how a note dragged out past
    // everything else used to jump to the start of the track.
    const index = following === -1 ? current.length : following;

    onNotesChange([...current.slice(0, index), note, ...current.slice(index)]);

    return index;
  };

  const onRemoveNote = (index: number) => {
    onNotesChange(notes().filter((_, current) => current !== index));
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
