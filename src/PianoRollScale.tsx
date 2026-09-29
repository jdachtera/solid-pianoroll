import { createMemo, Index, Show } from "solid-js";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollScale.module.css";
import usePianoRollGrid from "./usePianoRollGrid";
import { usePianoRollContext } from "./PianoRollContext";

const PianoRollScale = () => {
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));
  const grid = usePianoRollGrid();
  const context = usePianoRollContext();

  const updatePlayheadPosition = (event: PointerEvent) => {
    const position = horizontalViewPort().calculatePosition(event.clientX);
    context.onPlayHeadPositionChange(position, event);
  };

  return (
    <div
      class={styles.PianoRollScale}
      onPointerDown={(event) => {
        updatePlayheadPosition(event);

        const handlePointerUp = () => {
          window.removeEventListener("pointermove", updatePlayheadPosition);
          window.removeEventListener("pointerup", handlePointerUp);
          window.removeEventListener("pointercancel", handlePointerUp);
        };

        window.addEventListener("pointermove", updatePlayheadPosition);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
      }}
      // Scrubbing the ruler is a drag along the same axis the roll scrolls in,
      // so without this the browser pans instead and the playhead never moves.
      style={{ "touch-action": "none" }}
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
