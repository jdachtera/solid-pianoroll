import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { createPianoRollstate } from "../src";
import { automationValueAtTicks } from "../src/PianoRollAutomationLane";
import type { Track } from "../src";

const track = (): Track => ({ name: "t", color: "#fff", notes: [] });

describe("automation", () => {
  it("sets and sorts automation points on the selected track", () =>
    createRoot((dispose) => {
      const state = createPianoRollstate({ ppq: 96, tracks: [track()] });
      state.setSelectedTrackAutomation("volume", [
        { ticks: 384, value: 0.2 },
        { ticks: 0, value: 1 },
      ]);
      const points = state.tracks[0]?.automation?.volume ?? [];
      expect(points.map((p) => p.ticks)).toEqual([0, 384]);
      dispose();
    }));

  it("samples a piecewise-linear curve, holding at the ends", () => {
    const points = [
      { ticks: 0, value: 0 },
      { ticks: 100, value: 1 },
    ];
    expect(automationValueAtTicks(points, -10, 0.5)).toBe(0); // before first
    expect(automationValueAtTicks(points, 50, 0.5)).toBeCloseTo(0.5); // midpoint
    expect(automationValueAtTicks(points, 200, 0.5)).toBe(1); // after last
    expect(automationValueAtTicks([], 50, 0.7)).toBe(0.7); // empty → fallback
  });
});
