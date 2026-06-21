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

  // --- Loop brace ------------------------------------------------------------
  // An Ableton-style bracket over the ruler marking the loop [loopStart, loopEnd].
  // Drag either edge to set the loop start / clip length; edges snap to the bar
  // (honouring the time signature) and commit once on release. Consumers
  // typically pass a `duration` a bit larger than the loop so the right edge has
  // room to drag past the current end. Only shown when the consumer opts in by
  // providing a non-zero `loopEnd`.
  const [dragLoopStart, setDragLoopStart] = createSignal<number>();
  const [dragLoopEnd, setDragLoopEnd] = createSignal<number>();

  const barTicks = () =>
    (context.beatsPerBar * (context.ppq || 192) * 4) / (context.beatUnit || 4) ||
    (context.ppq || 192) * 4;
  const snapToBar = (ticks: number) => Math.max(0, Math.round(ticks / barTicks()) * barTicks());

  const loopStart = () => dragLoopStart() ?? context.loopStart;
  const loopEnd = () => dragLoopEnd() ?? context.loopEnd;
  const braceDimensions = createMemo(() =>
    horizontalViewPort().calculatePixelDimensions(loopStart(), loopEnd() - loopStart()),
  );

  const startDrag = (edge: "start" | "end") => (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (edge === "start") setDragLoopStart(context.loopStart);
    else setDragLoopEnd(context.loopEnd);

    const onMove = (moveEvent: MouseEvent) => {
      const position = snapToBar(horizontalViewPort().calculatePosition(moveEvent.clientX));
      if (edge === "start") {
        // Keep at least one bar of loop, and don't go before the clip start.
        setDragLoopStart(Math.max(0, Math.min(position, loopEnd() - barTicks())));
      } else {
        // At least one bar long, and within the visible timeline.
        setDragLoopEnd(
          Math.min(Math.max(position, loopStart() + barTicks()), context.duration || Infinity),
        );
      }
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (edge === "start") {
        const value = dragLoopStart();
        setDragLoopStart(undefined);
        if (value != null) context.onLoopStartChange?.(value);
      } else {
        const value = dragLoopEnd();
        setDragLoopEnd(undefined);
        if (value != null) context.onLoopEndChange?.(value);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
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
        {/* Loop region [loopStart, loopEnd] — a top bar plus edge marker lines. */}
        <div
          style={{
            position: "absolute",
            top: "0px",
            left: `${braceDimensions().offset}px`,
            width: `${braceDimensions().size}px`,
            height: "100%",
            "box-sizing": "border-box",
            "border-left": "2px solid #ff9100",
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
        {/* Grab zone straddling the loop's left edge (loop start). */}
        <div
          title="Drag to set the loop start"
          onMouseDown={startDrag("start")}
          style={{
            position: "absolute",
            top: "0px",
            left: `${braceDimensions().offset - 5}px`,
            width: "11px",
            height: "100%",
            cursor: "ew-resize",
            "z-index": "3",
          }}
        />
        {/* Grab zone straddling the loop's right edge (clip length). */}
        <div
          title="Drag to set the clip length"
          onMouseDown={startDrag("end")}
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
