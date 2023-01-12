import { createSignal } from "solid-js";
import { GridDivision } from "./PianoRoll";

const usePianoRoll = () => {
  const [ppq, onPpqChange] = createSignal(120);

  const [mode, onModeChange] = createSignal<"keys" | "tracks">("tracks");

  const [position, onPositionChange] = createSignal(0);

  const [zoom, onZoomChange] = createSignal(10);
  const [verticalZoom, onVerticalZoomChange] = createSignal(5);
  const [verticalPosition, onVerticalPositionChange] = createSignal(44);

  const [gridDivision, onGridDivisionChange] = createSignal<GridDivision>(4);
  const [snapToGrid, onSnapToGridChange] = createSignal(true);

  const [duration, onDurationChange] = createSignal(0);

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

    mode,
    onModeChange,

    duration,
    onDurationChange,
  };
};

export default usePianoRoll;
