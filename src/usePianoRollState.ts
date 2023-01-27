import { mergeProps } from "solid-js";
import { createStore } from "solid-js/store";
import { GridDivision } from "./types";
import { Note, Track } from "./types";
import { ClientRect } from "./useBoundingClientRect";

type PianoRollState = {
  ppq: number;
  mode: "keys" | "tracks";
  position: number;
  zoom: number;
  verticalZoom: number;
  verticalPosition: number;
  verticalTrackZoom: number;
  verticalTrackPosition: number;
  playHeadPosition: number;
  gridDivision: GridDivision;
  snapToGrid: boolean;
  duration: number;
  tracks: Track[];
  selectedTrackIndex: number;
  pressedKeys: Record<number, Record<number, boolean>>;
  notesScrollerClientRect: Pick<ClientRect, "left" | "width" | "top" | "height">;
  tracksScrollerClientRect: Pick<ClientRect, "left" | "width" | "top" | "height">;
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
  playHeadPosition: 0,
  gridDivision: 4,
  snapToGrid: true,
  duration: 0,
  tracks: [],
  selectedTrackIndex: 0,
  pressedKeys: {},
  notesScrollerClientRect: { left: 0, width: 0, top: 0, height: 0 },
  tracksScrollerClientRect: { left: 0, width: 0, top: 0, height: 0 },
};

type PropNameToHandlerName<PropName extends string> = `on${Capitalize<PropName>}Change`;

type StateChangeHandlerObject = {
  [PropName in keyof typeof defaultState as PropNameToHandlerName<PropName>]: (
    value: typeof defaultState[PropName],
    originalEvent?: MouseEvent | KeyboardEvent,
  ) => void;
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
  "isKeyDown",
  "snapValueToGridIfEnabled",
] as (keyof ReturnType<typeof createPianoRollstate>)[];

const createPianoRollstate = (
  initialState?: Partial<PianoRollState & StateChangeHandlerObject>,
) => {
  const [state, setState] = createStore<PianoRollState>({
    ...defaultState,
    ...initialState,
  });

  const handlers = Object.fromEntries(
    (Object.entries(state) as Entries<typeof state>).map((entry) => {
      const handlerName = propNameToHandlerName(entry[0]) as PropNameToHandlerName<typeof entry[0]>;
      return [
        handlerName,
        (value: typeof entry[1], originalEvent?: MouseEvent | KeyboardEvent) => {
          const handler = initialState?.[handlerName] as
            | ((value: typeof entry[1], originalEvent?: MouseEvent | KeyboardEvent) => void)
            | undefined;

          setState(entry[0], value);

          if (handler) {
            handler(value, originalEvent);
          }
        },
      ];
    }),
  ) as StateChangeHandlerObject;

  const onPlayheadPositionChange = (
    playheadPosition: number,
    originalEvent?: MouseEvent | KeyboardEvent,
  ) => {
    handlers.onPlayHeadPositionChange(
      snapValueToGridIfEnabled(playheadPosition, !!originalEvent?.altKey),
    );
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

  const updateKeyPressedState = (trackIndex: number, keyNumber: number, value: boolean) => {
    handlers.onPressedKeysChange?.({
      ...state.pressedKeys,
      [trackIndex]: {
        ...state.pressedKeys[trackIndex],
        [keyNumber]: value,
      },
    });
  };

  const onNoteDown = (trackIndex: number, keyNumber: number) => {
    updateKeyPressedState(trackIndex, keyNumber, true);
  };

  const onNoteUp = (trackIndex: number, keyNumber: number) => {
    updateKeyPressedState(trackIndex, keyNumber, false);
  };

  const isKeyDown = (trackIndex: number, keyNumber: number) =>
    !!state.pressedKeys[trackIndex]?.[keyNumber];

  const snapValueToGridIfEnabled = (value: number, altKey: boolean) => {
    const gridDivisionTicks = (state.ppq * 4) / state.gridDivision;

    return state.snapToGrid && !altKey
      ? Math.round(value / gridDivisionTicks) * gridDivisionTicks
      : value;
  };

  return mergeProps(state, {
    ...handlers,
    onNoteChange,
    onInsertNote,
    onRemoveNote,
    onNoteDown,
    onNoteUp,
    isKeyDown,
    snapValueToGridIfEnabled,
    onPlayheadPositionChange,
  });
};

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export default createPianoRollstate;
