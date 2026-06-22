import { createMemo } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";

const usePianoRollGrid = () => {
  const context = usePianoRollContext();

  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));
  // A bar's length honours the time signature: beatsPerBar beats, each a
  // 1/beatUnit note (ppq is ticks per quarter). Falls back to 4/4.
  const measureTicks = createMemo(
    () => (context.beatsPerBar * context.ppq * 4) / (context.beatUnit || 4) || context.ppq * 4,
  );
  const selectedGridDivisorTicks = createMemo(() => measureTicks() / context.gridDivision);

  function calculateVisibleGridDivisorTicks(value: number): number {
    const visibleRange = horizontalViewPort().calculateVisibleRange();

    if (visibleRange <= 0) return 0;

    if (visibleRange / value > 100) {
      return calculateVisibleGridDivisorTicks(value * 2);
    }

    if (visibleRange / value < 30) {
      return calculateVisibleGridDivisorTicks(value / 2);
    }

    return value;
  }

  const gridDivisorTicks = createMemo(() =>
    calculateVisibleGridDivisorTicks(selectedGridDivisorTicks()),
  );

  const gridArray = createMemo(() => {
    const numberOfLines = Math.ceil(
      horizontalViewPort().calculateVisibleRange() / gridDivisorTicks() + 1,
    );
    const startIndex = Math.floor(context.position / gridDivisorTicks());

    return Array.from({ length: numberOfLines }).map((_, i) => {
      const index = i + startIndex;
      const ticks = index * gridDivisorTicks();

      const measurePosition = ticks / measureTicks() + 1;

      const bars = Math.floor(measurePosition);
      const beats = Math.floor((measurePosition - bars) * (context.beatsPerBar || 4));

      const label = `${bars}${beats ? `.${beats}` : ""}`;
      return {
        index,
        ticks,
        isHighlighted:
          Math.ceil(((index + 1) * selectedGridDivisorTicks()) / measureTicks()) % 2 === 0,
        hasHighlightedBorder: (index * gridDivisorTicks()) % selectedGridDivisorTicks() === 0,
        showLabel: ((index * selectedGridDivisorTicks()) / measureTicks()) % 2 === 0,
        virtualDimensions: horizontalViewPort().calculatePixelDimensions(ticks, gridDivisorTicks()),
        label,
      };
    });
  });

  return gridArray;
};

export default usePianoRollGrid;
