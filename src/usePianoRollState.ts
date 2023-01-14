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
  pressedKeys: number[][];
};

const defaultState: PianoRollState = {
  ppq: 0,
  mode: "keys",
  position: 0,
  zoom: 10,
  verticalZoom: 5,
  verticalPosition: 44,
  verticalTrackZoom: 0.5,
  verticalTrackPosition: 0,
  gridDivision: 4,
  snapToGrid: true,
  duration: 0,
  tracks: [],
  selectedTrackIndex: 0,
  pressedKeys: [],
};

const propNameToHandlerName = (name: string) => `on${name[0]?.toUpperCase()}${name.slice(1)}Change`;

export const pianoRollStatePropNames = [
  ...Object.keys(defaultState),
  ...Object.keys(defaultState).map(propNameToHandlerName),
  "onNoteChange",
  "onInsertNote",
  "onRemoveNote",
  "onNoteDown",
  "onNoteUp",
] as (keyof ReturnType<typeof createPianoRollstate>)[];

const createPianoRollstate = (initialState?: Partial<PianoRollState>) => {
  const [state, setState] = createStore<PianoRollState>({
    ...defaultState,
    ...initialState,
  });

  const handlers = Object.fromEntries(
    (Object.entries(state) as Entries<typeof state>).map((entry) => {
      return [
        propNameToHandlerName(entry[0]),
        (value: typeof entry[1]) => setState(entry[0], value),
      ];
    }),
  ) as {
    [key in keyof typeof state as `on${Capitalize<key>}Change`]: (value: typeof state[key]) => void;
  };

  const updateNotes = async (trackIndex: number, getNotes: (notes: Note[]) => Note[]) => {
    const track = state.tracks[trackIndex];
    if (!track) return;

    const notes = track.notes;

    handlers.onTracksChange([
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

  const onNoteDown = (trackIndex: number, keyNumber: number) => {
    const trackPressedKeys = state.pressedKeys[trackIndex] ?? [];

    handlers.onPressedKeysChange?.([
      ...state.pressedKeys.slice(0, trackIndex),
      [...trackPressedKeys, keyNumber],
      ...state.pressedKeys.slice(trackIndex + 1),
    ]);
  };

  const onNoteUp = (trackIndex: number, keyNumber: number) => {
    const trackPressedKeys = state.pressedKeys[trackIndex] ?? [];

    handlers.onPressedKeysChange?.([
      ...state.pressedKeys.slice(0, trackIndex),
      trackPressedKeys.filter((number) => number !== keyNumber),
      ...state.pressedKeys.slice(trackIndex + 1),
    ]);
  };

  return mergeProps(state, {
    ...handlers,
    onNoteChange,
    onInsertNote,
    onRemoveNote,
    onNoteDown,
    onNoteUp,
  });
};

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export default createPianoRollstate;
