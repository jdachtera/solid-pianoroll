import { mergeProps } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
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
    value: (typeof defaultState)[PropName],
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
    // Fresh objects per roll. The store merges object writes into the object
    // already there, so sharing defaultState's own would have every roll on the
    // page (and every test) writing into the same pressedKeys and client rects.
    pressedKeys: {},
    notesScrollerClientRect: { ...defaultState.notesScrollerClientRect },
    tracksScrollerClientRect: { ...defaultState.tracksScrollerClientRect },
    ...initialState,
  });

  const handlers = Object.fromEntries(
    (Object.entries(state) as Entries<typeof state>).map((entry) => {
      const handlerName = propNameToHandlerName(entry[0]) as PropNameToHandlerName<
        (typeof entry)[0]
      >;
      return [
        handlerName,
        (value: (typeof entry)[1], originalEvent?: MouseEvent | KeyboardEvent) => {
          const handler = initialState?.[handlerName] as
            | ((value: (typeof entry)[1], originalEvent?: MouseEvent | KeyboardEvent) => void)
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

  const { onNoteChange, onInsertNote, onRemoveNote } = createNoteEditors(
    () => state.tracks,
    (tracks) => handlers.onTracksChange(tracks),
  );

  // How many sources are holding each key down, per track. Playback can sound
  // the same pitch twice with the notes overlapping, and the mouse can play a
  // key that playback is also holding; with a plain flag the first release
  // lifted the key while the other was still sounding. Kept outside the store:
  // nothing renders the count, only whether it is above zero.
  const pressCounts = new Map<string, number>();

  const updateKeyPressedState = (trackIndex: number, keyNumber: number, delta: 1 | -1) => {
    const countKey = `${trackIndex}:${keyNumber}`;
    // The store is the truth for down/up: if anyone has reset pressedKeys
    // through onPressedKeysChange, a stale count must not keep a key down.
    const isDown = !!state.pressedKeys[trackIndex]?.[keyNumber];
    const count = Math.max(0, (isDown ? pressCounts.get(countKey) ?? 1 : 0) + delta);
    pressCounts.set(countKey, count);

    if (count > 0 === isDown) return;

    // Written at the key's own path rather than as a rebuilt object: replacing
    // pressedKeys[track] notified every key of that track on every note event,
    // so each visible key re-checked itself to find that one other key changed.
    if (!state.pressedKeys[trackIndex]) setState("pressedKeys", trackIndex, {});
    setState("pressedKeys", trackIndex, keyNumber, count > 0);

    // Callers have always been handed a new object per change; keep it that way
    // rather than leak the store's own, which mutates in place.
    const onPressedKeysChange = initialState?.onPressedKeysChange;
    if (onPressedKeysChange) {
      const pressedKeys = unwrap(state.pressedKeys);
      onPressedKeysChange({ ...pressedKeys, [trackIndex]: { ...pressedKeys[trackIndex] } });
    }
  };

  const onNoteDown = (trackIndex: number, keyNumber: number) => {
    updateKeyPressedState(trackIndex, keyNumber, 1);
  };

  const onNoteUp = (trackIndex: number, keyNumber: number) => {
    updateKeyPressedState(trackIndex, keyNumber, -1);
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

/** The note edits, written against whichever tracks and change handler they
    are given. The state hook binds them to its own store; <PianoRoll> binds
    them again to the tracks and onTracksChange it was actually passed, so a
    caller overriding onTracksChange as a prop is the one that hears about
    edits. Bound to the store alone, a prop override was silently skipped. */
export const createNoteEditors = (
  getTracks: () => Track[],
  setTracks: (tracks: Track[]) => void,
) => {
  const updateNotes = (trackIndex: number, getNotes: (notes: Note[]) => Note[]) => {
    const tracks = getTracks();
    const track = tracks[trackIndex];
    if (!track) return;

    setTracks([
      ...tracks.slice(0, trackIndex),
      { ...track, notes: getNotes(track.notes) },
      ...tracks.slice(trackIndex + 1),
    ]);
  };

  const editors = {
    onNoteChange: (trackIndex: number, noteIndex: number, note: Note) => {
      updateNotes(trackIndex, (notes) => [
        ...notes.slice(0, noteIndex),
        note,
        ...notes.slice(noteIndex + 1),
      ]);
    },

    onInsertNote: (trackIndex: number, note: Note) => {
      const track = getTracks()[trackIndex];
      if (!track) return -1;

      // After every existing note findIndex finds nothing; that is the end of
      // the track, not its start.
      const firstLater = track.notes.findIndex(({ ticks }) => ticks > note.ticks);
      const newNoteIndex = firstLater === -1 ? track.notes.length : firstLater;

      updateNotes(trackIndex, (notes) => [
        ...notes.slice(0, newNoteIndex),
        note,
        ...notes.slice(newNoteIndex),
      ]);

      return newNoteIndex;
    },

    onRemoveNote: (trackIndex: number, noteIndex: number) => {
      updateNotes(trackIndex, (notes) => [
        ...notes.slice(0, noteIndex),
        ...notes.slice(noteIndex + 1),
      ]);
    },
  };

  Object.values(editors).forEach((editor) => builtInNoteEditors.add(editor));
  return editors;
};

/** The editors createNoteEditors made, as opposed to a caller's own. */
export const builtInNoteEditors = new WeakSet<Function>();

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export default createPianoRollstate;
