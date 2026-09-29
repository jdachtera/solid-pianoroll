import { createRoot } from "solid-js";
import { isServer } from "solid-js/web";
import { describe, expect, it } from "vitest";
import { useNotes } from "../src";
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
