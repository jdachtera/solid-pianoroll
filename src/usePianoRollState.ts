import { mergeProps } from "solid-js";
import { createStore } from "solid-js/store";
import { GridDivision } from "./PianoRoll";
import { Note, Track } from "./types";

type PianoRollState = {
  ppq: number;
  mode: "keys" | "tracks";
  position: number;
  zoom: number;
  verticalZoom: number;
  verticalPosition: number;
  verticalTrackZoom: number;
  verticalTrackPosition: number;
  gridDivision: GridDivision;
  snapToGrid: boolean;
  duration: number;
  tracks: Track[];
  selectedTrackIndex: number;
  pressedKeys: number[];
};

const createPianoRollstate = (defaultState?: Partial<PianoRollState>) => {
  const [state, setState] = createStore<PianoRollState>({
    ppq: 0,
    mode: "keys",
    position: 0,
    zoom: 10,
    verticalZoom: 5,
    verticalPosition: 44,
    verticalTrackZoom: 1,
    verticalTrackPosition: 0,
    gridDivision: 4,
    snapToGrid: true,
    duration: 0,
    tracks: [],
    selectedTrackIndex: 0,
    pressedKeys: [],
    ...defaultState,
  });

  const updateNotes = async (trackIndex: number, getNotes: (notes: Note[]) => Note[]) => {
    const track = state.tracks[trackIndex];
    if (!track) return;

    const notes = track.notes;

    onTracksChange([
      ...state.tracks.slice(0, trackIndex),
      { ...track, notes: getNotes(notes) },
      ...state.tracks.slice(trackIndex + 1),
    ]);
  };

  const onNoteChange = (trackIndex: number, noteIndex: number, note: Note) => {
    updateNotes(trackIndex, (notes) => [
      ...notes.slice(0, noteIndex),
      note,
      ...notes.slice(noteIndex + 1),
    ]);
  };

  const onInsertNote = (trackIndex: number, note: Note) => {
    const track = state.tracks[trackIndex];
    if (!track) return -1;

    const notes = track.notes;

    const newNoteIndex = Math.max(
      notes.findIndex(({ ticks }) => ticks > note.ticks),
      0,
    );

    updateNotes(trackIndex, (notes) => [
      ...notes.slice(0, newNoteIndex),
      note,
      ...notes.slice(newNoteIndex),
    ]);

    return newNoteIndex;
  };

  const onRemoveNote = (trackIndex: number, noteIndex: number) => {
    updateNotes(trackIndex, (notes) => [
      ...notes.slice(0, noteIndex),
      ...notes.slice(noteIndex + 1),
    ]);
  };

  const onPpqChange = (ppq: PianoRollState["ppq"]) => setState("ppq", ppq);
  const onModeChange = (mode: PianoRollState["mode"]) => setState("mode", mode);
  const onPositionChange = (position: PianoRollState["position"]) => setState("position", position);
  const onZoomChange = (zoom: PianoRollState["zoom"]) => setState("zoom", zoom);
  const onVerticalZoomChange = (verticalZoom: PianoRollState["verticalZoom"]) =>
    setState("verticalZoom", verticalZoom);
  const onVerticalPositionChange = (verticalPosition: PianoRollState["verticalPosition"]) =>
    setState("verticalPosition", verticalPosition);

  const onVerticalTrackZoomChange = (verticalTrackZoom: PianoRollState["verticalTrackZoom"]) =>
    setState("verticalTrackZoom", verticalTrackZoom);
  const onVerticalTrackPositionChange = (
    verticalTrackPosition: PianoRollState["verticalTrackPosition"],
  ) => setState("verticalTrackPosition", verticalTrackPosition);

  const onGridDivisionChange = (gridDivision: PianoRollState["gridDivision"]) =>
    setState("gridDivision", gridDivision);
  const onSnapToGridChange = (snapToGrid: PianoRollState["snapToGrid"]) =>
    setState("snapToGrid", snapToGrid);
  const onDurationChange = (duration: PianoRollState["duration"]) => setState("duration", duration);
  const onTracksChange = (tracks: PianoRollState["tracks"]) => setState("tracks", tracks);
  const onSelectedTrackIndexChange = (selectedTrackIndex: PianoRollState["selectedTrackIndex"]) =>
    setState("selectedTrackIndex", selectedTrackIndex);

  const onPressedKeysChange = (pressedKeys: PianoRollState["pressedKeys"]) =>
    setState("pressedKeys", pressedKeys);

  return mergeProps(state, {
    onPpqChange,
    onModeChange,
    onPositionChange,
    onZoomChange,
    onVerticalZoomChange,
    onVerticalPositionChange,
    onVerticalTrackZoomChange,
    onVerticalTrackPositionChange,
    onGridDivisionChange,
    onSnapToGridChange,
    onDurationChange,
    onTracksChange,
    onNoteChange,
    onInsertNote,
    onRemoveNote,
    onSelectedTrackIndexChange,
    onPressedKeysChange,
  });
};

export default createPianoRollstate;
