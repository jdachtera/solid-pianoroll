import { createEffect, createMemo, JSX, splitProps } from "solid-js";
import { clamp } from "./createViewPortDimension";
import { useViewPortDimension } from "./ScrollZoomViewPort";

const PlayHead = (
  allProps: {
    position: number;
    onPositionChange?: (playHeadPosition: number, event: MouseEvent | PointerEvent) => void;
    sync?: boolean;
    dimensionName?: string;
  } & JSX.IntrinsicElements["div"],
) => {
  const [props, divProps] = splitProps(allProps, [
    "position",
    "sync",
    "onPositionChange",
    "dimensionName",
  ]);

  const viewPort = useViewPortDimension(props.dimensionName ?? "horizontal");

  createEffect(() => {
    if (!props.sync) return;

    const maxPosition = viewPort.range;
    const newPosition = clamp(props.position - viewPort.range / viewPort.zoom / 2, 0, maxPosition);

    viewPort.onPositionChange?.(newPosition);
  });

  const leftPosition = createMemo(() => viewPort.calculatePixelOffset(props.position));

  return (
    <div
      class="PlayHead"
      {...divProps}
      style={{
        position: "absolute",
        height: "100%",
        // The border-box width has to include both 10px borders: without them a
        // 2px border-box leaves a 0px padding box, and the clipped background
        // below then paints nothing at all.
        width: "calc(var(--pianoroll-playhead-width, 2px) + 20px)",
        left: `${leftPosition()}px`,
        "background-color": "var(--pianoroll-playhead, green)",
        cursor: "pointer",
        // The line is 2px because that is how wide a playhead should LOOK. A
        // finger cannot hit 2px, so the touch target is widened either side
        // without widening the mark: the borders are transparent, the clip
        // keeps the drawn line where it was, and touch-action hands the gesture
        // to the drag instead of to the scroller underneath.
        "box-sizing": "border-box",
        "border-left": "10px solid transparent",
        "border-right": "10px solid transparent",
        "margin-left": "-10px",
        "background-clip": "padding-box",
        "touch-action": "none",
        ...(typeof divProps.style === "object" && divProps.style),
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const handlePointerMove = (event: PointerEvent) => {
          const newPosition = viewPort.calculatePosition(event.clientX);
          props.onPositionChange?.(newPosition, event);
        };
        const handlePointerUp = () => {
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerUp);
          window.removeEventListener("pointercancel", handlePointerUp);
        };
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
      }}
    />
  );
};

export default PlayHead;
