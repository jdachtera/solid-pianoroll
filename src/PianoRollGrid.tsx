import { createEffect, createMemo, Index, Ref, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { blackKeys, keys } from "./PianoRollKeys";

const PianoRollGrid = () => {
  const context = usePianoRollContext();

  const gridDivisorTicks = createMemo(() => (context.ppq * 4) / context.gridDivision);
  const gridArray = createMemo(() => {
    const numberOfLines = context.duration / gridDivisorTicks();
    return Array.from({ length: numberOfLines }).map((_, index) => index * gridDivisorTicks());
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
          {(tick, index) => {
            const virtualDimensions = createMemo(() =>
              context.horizontalViewPort.getVirtualDimensions(tick(), gridDivisorTicks()),
            );

            return (
              <Show when={virtualDimensions().size > 0}>
                <div
                  class="PianoRoll-Grid-Time"
                  style={{
                    "z-index": 1,
                    position: "absolute",
                    "box-sizing": "border-box",
                    background: index % 4 === 0 ? "#ccc" : "#ddd",
                    top: `0px`,
                    height: `100%`,
                    left: `${virtualDimensions().offset}px`,
                    width: `${virtualDimensions().size}px`,
                    "border-left": "1px gray solid",
                  }}
                ></div>
              </Show>
            );
          }}
        </Index>
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
      </div>
    </div>
  );
};

export default PianoRollGrid;
