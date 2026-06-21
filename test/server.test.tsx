import { describe, expect, it } from "vitest";
import { isServer } from "solid-js/web";
import { createPianoRollstate } from "../src";

describe("createPianoRollstate (ssr)", () => {
  it("runs on the server", () => {
    expect(isServer).toBe(true);
  });

  it("computes a 4/4 default without a DOM", () => {
    const state = createPianoRollstate({ ppq: 96 });
    expect(state.ppq).toBe(96);
    expect(state.beatsPerBar).toBe(4);
    expect(state.beatUnit).toBe(4);
  });
});
