import { createEffect, createMemo, Index, Ref, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { keys } from "./PianoRollKeys";

const PianoRollGrid = () => {
  const context = usePianoRollContext();

  const gridArray = createMemo(() => {
    const numberOfLines = context.duration / ((context.ppq * 4) / context.gridDivision);
    return Array.from({ length: numberOfLines }).map((_, index) => ({
      index,
      tick: index * ((context.ppq * 4) / context.gridDivision),
    }));
  });

  const visibleDimensions = createMemo(() =>
    context.horizontalViewPort.getVirtualDimensions(
      context.position,
      context.duration / context.zoom,
    ),
  );

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
          {(gridline) => {
            const left = createMemo(() =>
              context.horizontalViewPort.getScaledValue(gridline().tick),
            );

            return (
              <Show
                when={
                  left() >= visibleDimensions().offset &&
                  left() <= visibleDimensions().offset + visibleDimensions().size
                }
              >
                <div
                  class="PianoRoll-Grid-Time"
                  style={{
                    "z-index": 1,
                    position: "absolute",
                    "box-sizing": "border-box",
                    top: `0px`,
                    height: `100%`,
                    left: `${left()}px`,
                    width: `1px`,
                    "background-color": "gray",
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
                    "border-bottom": `0.5px black solid`,
                    "border-top": `0.5px black solid`,
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
