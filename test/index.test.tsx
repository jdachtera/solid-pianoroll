import { createEffect, createRoot } from "solid-js";
import { isServer } from "solid-js/web";
import { describe, expect, it } from "vitest";
import { createPianoRollstate, PianoRoll, PlayHead, useNotes } from "../src";
import { render } from "solid-js/web";
import { builtInNoteEditors, createNoteEditors } from "../src/usePianoRollState";
import type { Track } from "../src";
import type { Note } from "../src";

const note = (ticks: number, midi = 60): Note => ({
  ticks,
  durationTicks: 120,
  midi,
  velocity: 1,
});

describe("environment", () => {
  it("runs on client", () => {
    expect(typeof window).toBe("object");
    expect(isServer).toBe(false);
  });
});

describe("useNotes", () => {
  it("starts empty", () =>
    createRoot((dispose) => {
      const { notes } = useNotes();
      expect(notes()).toEqual([]);
      dispose();
    }));

  it("keeps notes ordered by start time however they arrive", () =>
    createRoot((dispose) => {
      const { notes, onInsertNote } = useNotes();

      onInsertNote(note(480));
      onInsertNote(note(0));
      onInsertNote(note(960)); // later than everything already in the track
      onInsertNote(note(240));

      expect(notes().map((n) => n.ticks)).toEqual([0, 240, 480, 960]);
      dispose();
    }));

  it("returns the index the note actually landed at", () =>
    createRoot((dispose) => {
      const { notes, onInsertNote } = useNotes();

      onInsertNote(note(0));
      onInsertNote(note(960));
      const index = onInsertNote(note(480));

      expect(index).toBe(1);
      expect(notes()[index]?.ticks).toBe(480);
      dispose();
    }));

  it("replaces one note without disturbing its neighbours", () =>
    createRoot((dispose) => {
      const { notes, onInsertNote, onNoteChange } = useNotes();

      onInsertNote(note(0));
      onInsertNote(note(480));
      onInsertNote(note(960));

      onNoteChange(1, { ...note(480), midi: 72 });

      expect(notes().map((n) => n.ticks)).toEqual([0, 480, 960]);
      expect(notes().map((n) => n.midi)).toEqual([60, 72, 60]);
      dispose();
    }));

  it("removes only the note asked for", () =>
    createRoot((dispose) => {
      const { notes, onInsertNote, onRemoveNote } = useNotes();

      onInsertNote(note(0));
      onInsertNote(note(480));
      onInsertNote(note(960));

      onRemoveNote(1);

      expect(notes().map((n) => n.ticks)).toEqual([0, 960]);
      dispose();
    }));

  it("never mutates the array it was handed", () =>
    createRoot((dispose) => {
      const { notes, onNotesChange, onInsertNote, onNoteChange, onRemoveNote } = useNotes();

      // The caller's own array — a store slice, a prop, anything it still holds
      // a reference to. Editing a track must not reach back and rewrite it.
      const original: Note[] = [note(0), note(480), note(960)];
      onNotesChange(original);
      const snapshot = original.map((n) => n.ticks);

      onInsertNote(note(240));
      onNoteChange(0, { ...note(0), midi: 72 });
      onRemoveNote(0);

      expect(original.map((n) => n.ticks)).toEqual(snapshot);
      expect(notes()).not.toBe(original);
      dispose();
    }));
});

describe("pressed keys", () => {
  it("keeps a key down until every press on it is released", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate();
      state.onNoteDown(0, 60);
      state.onNoteDown(0, 60);
      state.onNoteUp(0, 60);
      expect(state.isKeyDown(0, 60)).toBe(true);
      state.onNoteUp(0, 60);
      expect(state.isKeyDown(0, 60)).toBe(false);
      dispose();
    }));

  it("ignores a release with no press, rather than owing one", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate();
      state.onNoteUp(0, 60);
      state.onNoteDown(0, 60);
      expect(state.isKeyDown(0, 60)).toBe(true);
      dispose();
    }));

  it("starts counting afresh after pressedKeys is reset from outside", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate();
      state.onNoteDown(0, 60);
      state.onNoteDown(0, 60);
      // The store merges object writes, so a reset has to name the key.
      state.onPressedKeysChange({ 0: { 60: false } });
      state.onNoteDown(0, 60);
      state.onNoteUp(0, 60);
      expect(state.isKeyDown(0, 60)).toBe(false);
      dispose();
    }));

  it("only wakes the key that changed", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate();
      state.onNoteDown(0, 61);
      let runs = 0;
      createEffect(() => {
        state.isKeyDown(0, 62);
        runs++;
      });
      const before = runs;
      state.onNoteDown(0, 60);
      state.onNoteUp(0, 61);
      expect(runs).toBe(before);
      dispose();
    }));

  it("hands a caller's handler a new object per change", () =>
    createRoot((dispose) => {
      const seen: Record<number, Record<number, boolean>>[] = [];
      const state = createPianoRollstate({ onPressedKeysChange: (keys) => seen.push(keys) });
      state.onNoteDown(0, 60);
      state.onNoteDown(0, 64);
      expect(seen).toHaveLength(2);
      expect(seen[0]).not.toBe(seen[1]);
      expect(seen[0]?.[0]).toEqual({ 60: true });
      expect(seen[1]?.[0]).toEqual({ 60: true, 64: true });
      dispose();
    }));
});

describe("state", () => {
  it("does not share pressed keys between rolls", () =>
    createRoot((dispose) => {
      const first = createPianoRollstate();
      const second = createPianoRollstate();
      first.onNoteDown(0, 60);
      expect(second.isKeyDown(0, 60)).toBe(false);
      dispose();
    }));
});

describe("note editors", () => {
  const track = (notes: Note[]): Track => ({ name: "t", color: "#000", notes });

  it("appends a note that comes after every other one", () => {
    let tracks = [track([note(0), note(480)])];
    const editors = createNoteEditors(
      () => tracks,
      (next) => (tracks = next),
    );
    expect(editors.onInsertNote(0, note(960))).toBe(2);
    expect(tracks[0]?.notes.map(({ ticks }) => ticks)).toEqual([0, 480, 960]);
  });

  it("sends edits to whatever tracks and handler they are bound to", () => {
    let tracks = [track([note(0)])];
    const changes: Track[][] = [];
    const editors = createNoteEditors(
      () => tracks,
      (next) => {
        changes.push(next);
        tracks = next;
      },
    );
    editors.onRemoveNote(0, 0);
    expect(changes).toHaveLength(1);
    expect(tracks[0]?.notes).toEqual([]);
  });

  it("marks the state hook's own editors so <PianoRoll> can rebind them", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate();
      expect(builtInNoteEditors.has(state.onNoteChange)).toBe(true);
      expect(builtInNoteEditors.has(() => {})).toBe(false);
      dispose();
    }));
});

describe("<PianoRoll>", () => {
  // jsdom lays nothing out and has no ResizeObserver; sizes simply stay 0.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollTo ??= function () {};
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0 } as DOMRect);

  it("mounts with every axis and scroller wired up", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    let state!: ReturnType<typeof createPianoRollstate>;
    const dispose = render(() => {
      state = createPianoRollstate({ ppq: 480, duration: 1920 });
      state.onTracksChange([{ name: "Piano", color: "#f00", notes: [note(0), note(480, 64)] }]);
      return (
        <PianoRoll {...state} showTrackList>
          <PlayHead position={state.playHeadPosition} />
        </PianoRoll>
      );
    }, host);

    expect(host.querySelector("[title='C 3']")).not.toBeNull(); // a key
    expect(host.textContent).toContain("Piano"); // the track list
    expect(host.querySelector(".PlayHead")).not.toBeNull();

    state.onModeChange("tracks");
    expect(host.textContent).toContain("Piano");

    dispose();
    host.remove();
  });
});
