import { createMemo, Index, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { blackKeys, keys } from "./PianoRollKeys";

const PianoRollGrid = () => {
  const context = usePianoRollContext();

  const measureTicks = createMemo(() => context.ppq * 4);
  const selectedGridDivisorTicks = createMemo(() => measureTicks() / context.gridDivision);

  function calculateVisibleGridDivisorTicks(value: number): number {
    if (context.horizontalViewPort.getVisibleRange() / value > 100) {
      return calculateVisibleGridDivisorTicks(value * 2);
    }
    if (context.horizontalViewPort.getVisibleRange() / value < 30) {
      return calculateVisibleGridDivisorTicks(value / 2);
    }
    return value;
  }

  const gridDivisorTicks = createMemo(() =>
    calculateVisibleGridDivisorTicks(selectedGridDivisorTicks()),
  );

  const gridArray = createMemo(() => {
    const numberOfLines = Math.ceil(
      context.horizontalViewPort.getVisibleRange() / gridDivisorTicks() + 1,
    );
    const startIndex = Math.floor(context.position / gridDivisorTicks());

    return Array.from({ length: numberOfLines }).map((_, index) => ({
      index: index + startIndex,
      ticks: (index + startIndex) * gridDivisorTicks(),
    }));
  });

  return (
    <div
      class="PianoRoll-Grid-Container"
      style={{
        position: "absolute",
        width: `${context.clientRect.width}px`,
        height: `${context.clientRect.height}px`,
      }}
    >
      <div
        class="PianoRoll-Grid"
        style={{
          position: "relative",
          width: `${context.clientRect.width}px`,
          height: "100%",
        }}
      >
        <Index each={gridArray()}>
          {(entry) => {
            const virtualDimensions = createMemo(() =>
              context.horizontalViewPort.getVirtualDimensions(entry().ticks, gridDivisorTicks()),
            );

            return (
              <Show when={virtualDimensions().size > 0}>
                <div
                  class="PianoRoll-Grid-Time"
                  style={{
                    "z-index": 1,
                    position: "absolute",
                    "box-sizing": "border-box",
                    background:
                      Math.ceil((entry().index + 1 * selectedGridDivisorTicks()) / measureTicks()) %
                        2 ===
                      0
                        ? "#ddd"
                        : "#ccc",
                    top: `0px`,
                    height: `100%`,
                    left: `${virtualDimensions().offset}px`,
                    width: `${virtualDimensions().size}px`,
                    "border-left-style": "solid",
                    "border-left-width": "0.5px",
                    "border-left-color":
                      (entry().index * gridDivisorTicks()) % selectedGridDivisorTicks() === 0
                        ? "gray"
                        : "#bbb",
                  }}
                ></div>
              </Show>
            );
          }}
        </Index>
        <Show when={!context.condensed}>
          <Index each={keys}>
            {(key) => {
              const virtualDimensions = createMemo(() =>
                context.verticalViewPort.getVirtualDimensions(127 - key().number, 1),
              );

              return (
                <Show when={virtualDimensions().size > 0}>
                  <div
                    class="PianoRoll-Grid-Key"
                    style={{
                      position: "absolute",
                      top: `${virtualDimensions().offset}px`,
                      height: `${virtualDimensions().size}px`,
                      width: "100%",
                      "background-color": key().isBlack ? "rgba(0,0,0,0.2)" : "none",
                      "border-style": "solid",
                      "border-color": "gray",
                      "border-width": `${
                        !key().isBlack && !blackKeys.includes((key().number + 1) % 12) ? "0.1px" : 0
                      } 1px ${
                        !key().isBlack && !blackKeys.includes((key().number - 1) % 12) ? "0.1px" : 0
                      } 0`,
                      "z-index": 1,
                    }}
                  ></div>
                </Show>
              );
            }}
          </Index>
        </Show>
      </div>
    </div>
  );
};

export default PianoRollGrid;
