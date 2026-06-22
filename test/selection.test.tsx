import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { createPianoRollstate } from "../src";
import type { Note, Track } from "../src";

const note = (id: string, ticks: number, midi = 60, extra: Partial<Note> = {}): Note => ({
  id,
  ticks,
  durationTicks: 96,
  midi,
  velocity: 100,
  ...extra,
});

const trackWith = (...notes: Note[]): Track => ({ name: "t", color: "#fff", notes });

describe("selection + multi-note editing", () => {
  it("selects, toggles and clears notes", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate({
        ppq: 96,
        tracks: [trackWith(note("a", 0), note("b", 96), note("c", 192))],
      });

      state.selectNotes(["a", "b"]);
      expect(state.selectedNoteIds).toEqual(["a", "b"]);
      expect(state.isNoteSelected("a")).toBe(true);
      expect(state.isNoteSelected("c")).toBe(false);

      state.toggleNoteSelection("c");
      expect(state.selectedNoteIds).toContain("c");
      state.toggleNoteSelection("a");
      expect(state.selectedNoteIds).not.toContain("a");

      state.selectAllNotes();
      expect([...state.selectedNoteIds].sort()).toEqual(["a", "b", "c"]);

      state.clearSelection();
      expect(state.selectedNoteIds).toEqual([]);
      dispose();
    }));

  it("deletes only the selected notes", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate({
        ppq: 96,
        tracks: [trackWith(note("a", 0), note("b", 96), note("c", 192))],
      });
      state.selectNotes(["a", "c"]);
      state.deleteSelectedNotes();

      expect(state.tracks[0]?.notes.map((n) => n.id)).toEqual(["b"]);
      expect(state.selectedNoteIds).toEqual([]);
      dispose();
    }));

  it("nudges selection by ticks and midi, clamped to range", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate({
        ppq: 96,
        tracks: [trackWith(note("a", 96, 60), note("b", 0, 127))],
      });
      state.selectNotes(["a", "b"]);
      state.nudgeSelectedNotes({ ticks: -192, midi: 5 });

      const a = state.tracks[0]?.notes.find((n) => n.id === "a");
      const b = state.tracks[0]?.notes.find((n) => n.id === "b");
      expect(a?.ticks).toBe(0); // clamped at 0 (96 - 192)
      expect(a?.midi).toBe(65);
      expect(b?.midi).toBe(127); // clamped at 127
      dispose();
    }));

  it("sets an expression field on every selected note", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate({
        ppq: 96,
        tracks: [trackWith(note("a", 0), note("b", 96), note("c", 192))],
      });
      state.selectNotes(["a", "b"]);
      state.setSelectedNotesField("detune", 50);
      state.setSelectedNotesField("reverse", true);

      const notes = state.tracks[0]?.notes ?? [];
      expect(notes.find((n) => n.id === "a")?.detune).toBe(50);
      expect(notes.find((n) => n.id === "b")?.reverse).toBe(true);
      expect(notes.find((n) => n.id === "c")?.detune).toBeUndefined();
      dispose();
    }));

  it("duplicates the selection after itself and selects the copies", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate({
        ppq: 96,
        tracks: [trackWith(note("a", 0), note("b", 96))],
      });
      state.selectNotes(["a", "b"]);
      state.duplicateSelectedNotes();

      expect(state.tracks[0]?.notes.length).toBe(4);
      // Copies are offset by the selection length (0..192 → +192).
      const ticks = state.tracks[0]?.notes.map((n) => n.ticks).sort((x, y) => x - y);
      expect(ticks).toEqual([0, 96, 192, 288]);
      expect(state.selectedNoteIds.length).toBe(2);
      // The new selection points at notes that aren't the originals.
      expect(state.selectedNoteIds).not.toContain("a");
      dispose();
    }));

  it("copy/paste inserts copies anchored at the playhead", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate({
        ppq: 96,
        playHeadPosition: 384,
        tracks: [trackWith(note("a", 0), note("b", 96))],
      });
      state.selectNotes(["a", "b"]);
      state.copySelectedNotes();
      state.pasteNotes();

      expect(state.tracks[0]?.notes.length).toBe(4);
      const ticks = state.tracks[0]?.notes.map((n) => n.ticks).sort((x, y) => x - y);
      // Anchored at playhead 384: min tick 0 → 384, 96 → 480.
      expect(ticks).toEqual([0, 96, 384, 480]);
      expect(state.selectedNoteIds.length).toBe(2);
      dispose();
    }));

  it("assigns an id to inserted notes that lack one", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate({
        ppq: 96,
        tracks: [trackWith()],
      });
      const index = state.onInsertNote(0, {
        ticks: 0,
        durationTicks: 96,
        midi: 60,
        velocity: 100,
      });
      expect(index).toBe(0);
      expect(state.tracks[0]?.notes[0]?.id).toBeTruthy();
      dispose();
    }));
});
