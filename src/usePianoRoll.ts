import { createEffect, createSignal } from "solid-js";
import { GridDivision } from "./PianoRoll";
import { Note } from "./types";

const usePianoRoll = () => {
  const [position, setPosition] = createSignal(0);

  const [zoom, setZoom] = createSignal(10);
  const [verticalZoom, setVerticalZoom] = createSignal(5);
  const [verticalPosition, setVerticalPosition] = createSignal(64);

  const [gridDivision, setGridDivision] = createSignal<GridDivision>(16);
  const [snapToGrid, setSnapToGrid] = createSignal(true);

  const [notes, setNotes] = createSignal<Note[]>([]);
  const [duration, setDuration] = createSignal(0);

  createEffect(() => {
    setDuration(
      (notes()[notes().length - 1]?.ticks ?? 0) + (notes()[notes().length - 1]?.durationTicks ?? 0),
    );
  });

  return {
    position,
    setPosition,

    zoom,
    setZoom,

    verticalPosition,
    setVerticalPosition,

    verticalZoom,
    setVerticalZoom,

    gridDivision,
    setGridDivision,

    snapToGrid,
    setSnapToGrid,

    notes,
    setNotes,

    duration,
  };
};

export default usePianoRoll;
