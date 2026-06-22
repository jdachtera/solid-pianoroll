import { mergeProps } from "solid-js";
import { createStore } from "solid-js/store";
import { GridDivision } from "./types";
import { Note, NoteExpressionField, Track } from "./types";
import { ClientRect } from "./useBoundingClientRect";

const clampValue = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

let noteIdCounter = 0;
// Stable-ish unique id for a note. Not cryptographic — just needs to be unique
// within a session so selections can track notes across re-sorting on move.
export const createNoteId = () =>
  `n${Date.now().toString(36)}${(noteIdCounter++).toString(36)}${Math.floor(
    Math.random() * 1e6,
  ).toString(36)}`;

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
  // Loop/clip length in ticks. The timeline spans `duration` (which a consumer
  // can make larger than the loop to leave room to drag), while the loop brace
  // marks [loopStart, loopEnd]. 0 means "no separate loop" → falls back to
  // `duration`.
  loopEnd: number;
  // Where the loop begins (ticks). Defaults to 0 (loop from the clip start).
  loopStart: number;
  // Time signature. A bar is `beatsPerBar` beats, each a 1/`beatUnit` note, so
  // a bar = beatsPerBar * ppq * 4 / beatUnit ticks. Defaults to 4/4.
  beatsPerBar: number;
  beatUnit: number;
  tracks: Track[];
  selectedTrackIndex: number;
  // Ids of the currently selected notes (across all tracks). Drives the
  // selected-note styling and is the target of the keyboard/lane actions.
  selectedNoteIds: string[];
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
  loopEnd: 0,
  loopStart: 0,
  beatsPerBar: 4,
  beatUnit: 4,
  tracks: [],
  selectedTrackIndex: 0,
  selectedNoteIds: [],
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

// User-supplied action callbacks (not derived `on<Prop>Change` setters). These
// are invoked *in addition to* the built-in state bookkeeping below.
type PianoRollActionHandlers = {
  onNoteDown: (trackIndex: number, keyNumber: number) => void;
  onNoteUp: (trackIndex: number, keyNumber: number) => void;
};

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
  // Selection + multi-note editing actions.
  "selectNotes",
  "toggleNoteSelection",
  "clearSelection",
  "selectAllNotes",
  "isNoteSelected",
  "deleteSelectedNotes",
  "nudgeSelectedNotes",
  "copySelectedNotes",
  "cutSelectedNotes",
  "pasteNotes",
  "duplicateSelectedNotes",
  "setSelectedNotesField",
  "updateTrackNotes",
  "gridTicks",
  "barTicks",
] as (keyof ReturnType<typeof createPianoRollstate>)[];

const createPianoRollstate = (
  initialState?: Partial<PianoRollState & StateChangeHandlerObject & PianoRollActionHandlers>,
) => {
  const [state, setState] = createStore<PianoRollState>({
    ...defaultState,
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

    // Every note that enters the model gets a stable id so selection survives
    // the re-sorting that move/insert can trigger.
    const noteWithId: Note = note.id ? note : { ...note, id: createNoteId() };

    const newNoteIndex = Math.max(
      notes.findIndex(({ ticks }) => ticks > noteWithId.ticks),
      0,
    );

    updateNotes(trackIndex, (notes) => [
      ...notes.slice(0, newNoteIndex),
      noteWithId,
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
    // Forward to the consumer's callback (e.g. to audition a synth/sampler).
    // Previously this internal handler shadowed any user-supplied onNoteDown via
    // mergeProps, so on-screen key presses lit up but never produced sound.
    initialState?.onNoteDown?.(trackIndex, keyNumber);
  };

  const onNoteUp = (trackIndex: number, keyNumber: number) => {
    updateKeyPressedState(trackIndex, keyNumber, false);
    initialState?.onNoteUp?.(trackIndex, keyNumber);
  };

  const isKeyDown = (trackIndex: number, keyNumber: number) =>
    !!state.pressedKeys[trackIndex]?.[keyNumber];

  const snapValueToGridIfEnabled = (value: number, altKey: boolean) => {
    const gridDivisionTicks = (state.ppq * 4) / state.gridDivision;

    return state.snapToGrid && !altKey
      ? Math.round(value / gridDivisionTicks) * gridDivisionTicks
      : value;
  };

  // --- Selection + multi-note editing -------------------------------------

  // Ticks spanned by one grid cell and one bar, for keyboard nudging + paste.
  const gridTicks = () => (state.ppq * 4) / state.gridDivision;
  const barTicks = () => (state.beatsPerBar * state.ppq * 4) / state.beatUnit;

  const isNoteSelected = (id?: string) => !!id && state.selectedNoteIds.includes(id);

  // Replace (or, when `additive`, extend) the current selection.
  const selectNotes = (ids: string[], additive = false) => {
    const next = additive ? Array.from(new Set([...state.selectedNoteIds, ...ids])) : ids;
    handlers.onSelectedNoteIdsChange(next);
  };

  const toggleNoteSelection = (id: string) => {
    const set = new Set(state.selectedNoteIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    handlers.onSelectedNoteIdsChange([...set]);
  };

  const clearSelection = () => handlers.onSelectedNoteIdsChange([]);

  const selectAllNotes = () => {
    const ids = (state.tracks[state.selectedTrackIndex]?.notes ?? [])
      .map((note) => note.id)
      .filter((id): id is string => !!id);
    handlers.onSelectedNoteIdsChange(ids);
  };

  // Rebuild every track's notes through `mapper`. Returning `null` drops the
  // note. A single `onTracksChange` keeps multi-note edits atomic.
  const updateTrackNotes = (mapper: (note: Note, trackIndex: number) => Note | null) => {
    handlers.onTracksChange(
      state.tracks.map((track, trackIndex) => ({
        ...track,
        notes: track.notes
          .map((note) => mapper(note, trackIndex))
          .filter((note): note is Note => note !== null),
      })),
    );
  };

  const deleteSelectedNotes = () => {
    const selected = new Set(state.selectedNoteIds);
    if (!selected.size) return;
    updateTrackNotes((note) => (note.id && selected.has(note.id) ? null : note));
    clearSelection();
  };

  // Move the selected notes by a tick/midi delta (arrow-key nudging).
  const nudgeSelectedNotes = (delta: { ticks?: number; midi?: number }) => {
    const selected = new Set(state.selectedNoteIds);
    if (!selected.size) return;
    updateTrackNotes((note) =>
      note.id && selected.has(note.id)
        ? {
            ...note,
            ticks: Math.max(0, note.ticks + (delta.ticks ?? 0)),
            midi: clampValue(note.midi + (delta.midi ?? 0), 0, 127),
          }
        : note,
    );
  };

  // Set one expression field on every selected note (used by the lanes).
  const setSelectedNotesField = (field: NoteExpressionField, value: number | boolean) => {
    const selected = new Set(state.selectedNoteIds);
    if (!selected.size) return;
    updateTrackNotes((note) =>
      note.id && selected.has(note.id) ? { ...note, [field]: value } : note,
    );
  };

  // Per-roll clipboard for copy/cut/paste.
  let clipboard: Note[] = [];

  const copySelectedNotes = () => {
    const selected = new Set(state.selectedNoteIds);
    clipboard = state.tracks
      .flatMap((track) => track.notes)
      .filter((note) => note.id && selected.has(note.id))
      .map((note) => ({ ...note }));
  };

  const cutSelectedNotes = () => {
    copySelectedNotes();
    deleteSelectedNotes();
  };

  // Paste the clipboard into the selected track, anchored at `atTicks` (or the
  // playhead) and selecting the pasted copies.
  const pasteNotes = (atTicks?: number) => {
    if (!clipboard.length) return;
    const trackIndex = state.selectedTrackIndex;
    const track = state.tracks[trackIndex];
    if (!track) return;

    const minTicks = Math.min(...clipboard.map((note) => note.ticks));
    const anchor = atTicks ?? state.playHeadPosition ?? minTicks;
    const offset = anchor - minTicks;

    const newIds: string[] = [];
    const pasted = clipboard.map((note) => {
      const id = createNoteId();
      newIds.push(id);
      return { ...note, id, ticks: Math.max(0, note.ticks + offset) };
    });

    handlers.onTracksChange(
      state.tracks.map((existing, index) =>
        index === trackIndex
          ? { ...existing, notes: [...existing.notes, ...pasted].sort((a, b) => a.ticks - b.ticks) }
          : existing,
      ),
    );
    handlers.onSelectedNoteIdsChange(newIds);
  };

  // Duplicate the selection in place, offset by its own length, and select the
  // copies (Ableton ⌘D behaviour).
  const duplicateSelectedNotes = () => {
    const selected = new Set(state.selectedNoteIds);
    const sources = state.tracks
      .flatMap((track, trackIndex) => track.notes.map((note) => ({ note, trackIndex })))
      .filter(({ note }) => note.id && selected.has(note.id));
    if (!sources.length) return;

    const minTicks = Math.min(...sources.map(({ note }) => note.ticks));
    const maxEnd = Math.max(...sources.map(({ note }) => note.ticks + note.durationTicks));
    const offset = Math.max(maxEnd - minTicks, gridTicks());

    const newIds: string[] = [];
    handlers.onTracksChange(
      state.tracks.map((track, trackIndex) => {
        const additions = sources
          .filter((source) => source.trackIndex === trackIndex)
          .map(({ note }) => {
            const id = createNoteId();
            newIds.push(id);
            return { ...note, id, ticks: note.ticks + offset };
          });
        if (!additions.length) return track;
        return {
          ...track,
          notes: [...track.notes, ...additions].sort((a, b) => a.ticks - b.ticks),
        };
      }),
    );
    handlers.onSelectedNoteIdsChange(newIds);
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
    gridTicks,
    barTicks,
    isNoteSelected,
    selectNotes,
    toggleNoteSelection,
    clearSelection,
    selectAllNotes,
    updateTrackNotes,
    deleteSelectedNotes,
    nudgeSelectedNotes,
    setSelectedNotesField,
    copySelectedNotes,
    cutSelectedNotes,
    pasteNotes,
    duplicateSelectedNotes,
  });
};

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export default createPianoRollstate;
