import { createMemo, For, Index, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { blackKeys, keys } from "./PianoRollKeys";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollGrid.module.css";

const PianoRollGrid = () => {
  const context = usePianoRollContext();

  const verticalViewPort = createMemo(() =>
    useViewPortDimension(context.mode === "keys" ? "vertical" : "verticalTracks"),
  );
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
            <Show when={horizontalViewPort().isVisible(virtualDimensions())}>
              <div
                classList={{
                  [styles["PianoRollGrid-Time"]]: true,
                  [styles["Highlighted"]]:
                    Math.ceil(((entry().index + 1) * selectedGridDivisorTicks()) / measureTicks()) %
                      2 ===
                    0,
                  [styles["HighlightedBorder"]]:
                    (entry().index * gridDivisorTicks()) % selectedGridDivisorTicks() === 0,
                }}
                style={{
                  left: `${virtualDimensions().offset}px`,
                  width: `${virtualDimensions().size}px`,
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
              <Show when={verticalViewPort().isVisible(virtualDimensions())}>
                <div
                  classList={{
                    [styles["PianoRollGrid-Row"]]: true,
                    [styles["Key"]]: true,
                    [styles["IsDark"]]: key().isBlack,
                    [styles["IsBlackAndNextIsWhite"]]:
                      !key().isBlack && !blackKeys.includes((key().number + 1) % 12),
                  }}
                  style={{
                    top: `${virtualDimensions().offset}px`,
                    height: `${virtualDimensions().size}px`,
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
              <Show when={verticalViewPort().isVisible(virtualDimensions())}>
                <div
                  classList={{
                    [styles["PianoRollGrid-Row"]]: true,
                    [styles["IsDark"]]: index() % 2 === 0,
                  }}
                  style={{
                    top: `${virtualDimensions().offset}px`,
                    height: `${virtualDimensions().size}px`,
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
