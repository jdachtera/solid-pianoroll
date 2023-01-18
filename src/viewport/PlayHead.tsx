import { createEffect, createMemo, JSX, splitProps } from "solid-js";
import { clamp } from "./createViewPortDimension";
import { useViewPortDimension } from "./ScrollZoomViewPort";

const PlayHead = (
  allProps: {
    position: number;
    onPositionChange?: (playHeadPosition: number, event: MouseEvent) => void;
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
        width: "2px",
        left: `${leftPosition()}px`,
        "background-color": "green",
        cursor: "pointer",
        ...(typeof divProps.style === "object" && divProps.style),
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const handleMouseMove = (event: MouseEvent) => {
          const newPosition = viewPort.calculatePosition(event.clientX);
          props.onPositionChange?.(newPosition, event);
        };
        const handleMouseUp = () => {
          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);
        };
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      }}
    />
  );
};

export default PlayHead;
