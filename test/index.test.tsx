import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { createPianoRollstate } from "../src";

describe("createPianoRollstate", () => {
  it("applies defaults and overrides", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate({ ppq: 96, duration: 768, beatsPerBar: 3, beatUnit: 4 });
      expect(state.ppq).toBe(96);
      expect(state.duration).toBe(768);
      expect(state.beatsPerBar).toBe(3);
      expect(state.loopStart).toBe(0);
      dispose();
    }));

  it("forwards loop changes to the consumer callbacks", () =>
    createRoot((dispose) => {
      let committedEnd: number | undefined;
      let committedStart: number | undefined;
      const state = createPianoRollstate({
        loopEnd: 384,
        onLoopEndChange: (value) => (committedEnd = value),
        onLoopStartChange: (value) => (committedStart = value),
      });

      state.onLoopEndChange(768);
      expect(committedEnd).toBe(768);
      expect(state.loopEnd).toBe(768);

      state.onLoopStartChange(192);
      expect(committedStart).toBe(192);
      expect(state.loopStart).toBe(192);
      dispose();
    }));
});
