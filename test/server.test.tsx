import { describe, expect, it } from "vitest";
import { isServer } from "solid-js/web";
import { useNotes } from "../src";
import type { Note } from "../src";

const note = (ticks: number): Note => ({
  ticks,
  durationTicks: 120,
  midi: 60,
  velocity: 1,
});

describe("environment", () => {
  it("runs on server", () => {
    expect(typeof window).toBe("undefined");
    expect(isServer).toBe(true);
  });
});

describe("useNotes on the server", () => {
  // The note model is plain data and has no business needing a DOM. Rendering
  // the roll itself does, which is why only this half runs here.
  it("orders notes with no DOM present", () => {
    const { notes, onInsertNote } = useNotes();

    onInsertNote(note(480));
    onInsertNote(note(0));
    onInsertNote(note(960));

    expect(notes().map((n) => n.ticks)).toEqual([0, 480, 960]);
  });
});
