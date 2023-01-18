import { createMemo, Index, Show } from "solid-js";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollScale.module.css";
import usePianoRollGrid from "./usePianoRollGrid";
import { usePianoRollContext } from "./PianoRollContext";

const PianoRollScale = () => {
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));
  const grid = usePianoRollGrid();
  const context = usePianoRollContext();

  const updatePlayheadPosition = (event: MouseEvent) => {
    const position = horizontalViewPort().calculatePosition(event.clientX);
    context.onPlayHeadPositionChange(position, event);
  };

  return (
    <div
      class={styles.PianoRollScale}
      onMouseDown={(event) => {
        updatePlayheadPosition(event);

        const handleMouseUp = () => {
          window.removeEventListener("mousemove", updatePlayheadPosition);
          window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", updatePlayheadPosition);
        window.addEventListener("mouseup", handleMouseUp);
      }}
    >
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
