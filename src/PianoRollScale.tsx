import { createMemo, createSignal, Index, Show } from "solid-js";
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

  // --- Loop-length brace -----------------------------------------------------
  // An Ableton-style bracket over the ruler marking the loop [0, loopEnd]. Drag
  // its right edge to set the clip length; it snaps to the bar and commits once
  // on release (consumers typically pass a `duration` a bit larger than the loop
  // so there's room to drag past the current end). Only shown when the consumer
  // opts in by providing a non-zero `loopEnd`.
  const [dragLoopEnd, setDragLoopEnd] = createSignal<number>();

  const barTicks = () => (context.ppq || 192) * 4;
  const snapToBar = (ticks: number) =>
    Math.max(barTicks(), Math.round(ticks / barTicks()) * barTicks());

  const loopEnd = () => dragLoopEnd() ?? context.loopEnd;
  const braceDimensions = createMemo(() =>
    horizontalViewPort().calculatePixelDimensions(0, loopEnd()),
  );

  const handleResize = (event: MouseEvent) => {
    const position = horizontalViewPort().calculatePosition(event.clientX);
    // Snap to the bar and keep the handle within the visible timeline.
    setDragLoopEnd(Math.min(snapToBar(position), context.duration || Infinity));
  };

  const startResize = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragLoopEnd(context.loopEnd);

    const stop = () => {
      window.removeEventListener("mousemove", handleResize);
      window.removeEventListener("mouseup", stop);
      const value = dragLoopEnd();
      setDragLoopEnd(undefined);
      if (value != null) context.onLoopEndChange?.(value);
    };

    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", stop);
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

      <Show when={context.loopEnd > 0}>
        {/* Loop region [0, loopEnd] — a top bar plus a marker line at the end. */}
        <div
          style={{
            position: "absolute",
            top: "0px",
            left: `${braceDimensions().offset}px`,
            width: `${braceDimensions().size}px`,
            height: "100%",
            "box-sizing": "border-box",
            "border-right": "2px solid #ff9100",
            "pointer-events": "none",
            "z-index": "2",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "0px",
              left: "0px",
              width: "100%",
              height: "5px",
              background: "rgba(255, 145, 0, 0.55)",
            }}
          />
        </div>
        {/* Grab zone straddling the loop's right edge. */}
        <div
          title="Drag to set the clip length"
          onMouseDown={startResize}
          style={{
            position: "absolute",
            top: "0px",
            left: `${braceDimensions().offset + braceDimensions().size - 5}px`,
            width: "11px",
            height: "100%",
            cursor: "ew-resize",
            "z-index": "3",
          }}
        />
      </Show>
    </div>
  );
};

export default PianoRollScale;
