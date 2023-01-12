import { createMemo, For, Index, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { blackKeys, keys } from "./PianoRollKeys";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollGrid.module.css";

const PianoRollGrid = () => {
  const context = usePianoRollContext();

  const verticalViewPort = createMemo(() => useViewPortDimension("vertical"));
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));

  const measureTicks = createMemo(() => context.ppq * 4);
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

    return Array.from({ length: numberOfLines }).map((_, index) => ({
      index: index + startIndex,
      ticks: (index + startIndex) * gridDivisorTicks(),
    }));
  });

  return (
    <div class={styles.PianoRollGrid}>
      <Index each={gridArray()}>
        {(entry) => {
          const virtualDimensions = createMemo(() =>
            horizontalViewPort().calculatePixelDimensions(entry().ticks, gridDivisorTicks()),
          );

          return (
            <Show when={virtualDimensions().size > 0}>
              <div
                class={styles["PianoRollGrid-Time"]}
                style={{
                  background:
                    Math.ceil((entry().index + 1 * selectedGridDivisorTicks()) / measureTicks()) %
                      2 ===
                    0
                      ? "#ddd"
                      : "#ccc",
                  left: `${virtualDimensions().offset}px`,
                  width: `${virtualDimensions().size}px`,
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
      <Show when={context.mode === "keys"}>
        <Index each={keys}>
          {(key) => {
            const virtualDimensions = createMemo(() =>
              verticalViewPort().calculatePixelDimensions(127 - key().number, 1),
            );

            return (
              <Show when={virtualDimensions().size > 0}>
                <div
                  class={styles["PianoRollGrid-Row"]}
                  style={{
                    top: `${virtualDimensions().offset}px`,
                    height: `${virtualDimensions().size}px`,
                    width: "100%",
                    "background-color": key().isBlack ? "rgba(0,0,0,0.2)" : "none",
                    "border-width": `${
                      !key().isBlack && !blackKeys.includes((key().number + 1) % 12) ? "0.1px" : 0
                    } 1px ${
                      !key().isBlack && !blackKeys.includes((key().number - 1) % 12) ? "0.1px" : 0
                    } 0`,
                  }}
                ></div>
              </Show>
            );
          }}
        </Index>
      </Show>

      <Show when={context.mode === "tracks"}>
        <For each={context.tracks}>
          {(track, index) => {
            const virtualDimensions = createMemo(() =>
              verticalViewPort().calculatePixelDimensions(index(), 1),
            );

            return (
              <Show when={virtualDimensions().size > 0}>
                <div
                  class={styles["PianoRollGrid-Row"]}
                  style={{
                    top: `${virtualDimensions().offset}px`,
                    height: `${virtualDimensions().size}px`,
                    width: "100%",
                    "background-color": index() % 2 === 0 ? "rgba(0,0,0,0.2)" : "none",
                    "border-width": 0,
                  }}
                ></div>
              </Show>
            );
          }}
        </For>
      </Show>
    </div>
  );
};

export default PianoRollGrid;
