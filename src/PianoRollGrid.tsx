import { createMemo, For, Index, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { blackKeys, keys } from "./PianoRollKeys";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollGrid.module.css";
import usePianoRollGrid from "./usePianoRollGrid";

const PianoRollGrid = () => {
  const context = usePianoRollContext();

  const verticalViewPort = createMemo(() =>
    useViewPortDimension(context.mode === "keys" ? "vertical" : "verticalTracks"),
  );
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));
  const gridArray = usePianoRollGrid();

  return (
    <div class={styles.PianoRollGrid}>
      <Index each={gridArray()}>
        {(entry) => {
          return (
            <Show when={horizontalViewPort().isVisible(entry().virtualDimensions)}>
              <div
                classList={{
                  [styles["PianoRollGrid-Time"]]: true,
                  [styles["Highlighted"]]: entry().isHighlighted,
                  [styles["HighlightedBorder"]]: entry().hasHighlightedBorder,
                }}
                style={{
                  left: `${entry().virtualDimensions.offset}px`,
                  width: `${entry().virtualDimensions.size}px`,
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
