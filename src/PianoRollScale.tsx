import { createMemo, Index, Show } from "solid-js";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollScale.module.css";
import usePianoRollGrid from "./usePianoRollGrid";

const PianoRollScale = () => {
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));
  const grid = usePianoRollGrid();

  return (
    <div class={styles.PianoRollScale}>
      <Index each={grid()}>
        {(entry) => {
          return (
            <Show when={horizontalViewPort().isVisible(entry().virtualDimensions)}>
              <div
                classList={{
                  [styles["PianoRollScale-Time"]]: true,
                  [styles["Highlighted"]]: entry().isHighlighted,
                  [styles["HighlightedBorder"]]: entry().hasHighlightedBorder,
                }}
                style={{
                  left: `${entry().virtualDimensions.offset}px`,
                  width: `${entry().virtualDimensions.size}px`,
                }}
              >
                <Show when={entry().showLabel}>
                  <div class={styles["PianoRollScale-Label"]}>{entry().label}</div>
                </Show>
              </div>
            </Show>
          );
        }}
      </Index>
    </div>
  );
};

export default PianoRollScale;
