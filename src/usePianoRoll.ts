import { createEffect, createSignal } from "solid-js";
import { GridDivision } from "./PianoRoll";
import { Note } from "./types";

const usePianoRoll = () => {
  const [ppq, onPpqChange] = createSignal(120);

  const [position, onPositionChange] = createSignal(0);

  const [zoom, onZoomChange] = createSignal(10);
  const [verticalZoom, onVerticalZoomChange] = createSignal(5);
  const [verticalPosition, onVerticalPositionChange] = createSignal(64);

  const [gridDivision, onGridDivisionChange] = createSignal<GridDivision>(16);
  const [snapToGrid, onSnapToGridChange] = createSignal(true);

  const [notes, onNotesChange] = createSignal<Note[]>([]);
  const [duration, setDuration] = createSignal(0);

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

  createEffect(() => {
    setDuration(
      Math.max(
        (notes()[notes().length - 1]?.ticks ?? 0) +
          (notes()[notes().length - 1]?.durationTicks ?? 0),
        ppq() * 4 * 4,
      ),
    );
  });

  return {
    ppq,
    onPpqChange,

    position,
    onPositionChange,

    zoom,
    onZoomChange,

    verticalPosition,
    onVerticalPositionChange,

    verticalZoom,
    onVerticalZoomChange,

    gridDivision,
    onGridDivisionChange,

    snapToGrid,
    onSnapToGridChange,

    notes,
    onNotesChange,
    onNoteChange,
    onInsertNote,
    onRemoveNote,

    duration,
  };
};

export default usePianoRoll;
