import { createEffect, createMemo, JSX, mergeProps, splitProps } from "solid-js";
import { clamp } from "./viewport/createViewPortDimension";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";

const PlayHead = (
  allProps: {
    playHeadPosition?: number;
    sync?: boolean;
    onPlayHeadPositionChange?: (playHeadPosition: number) => void;
    onPositionChange?: (position: number) => void;
  } & JSX.IntrinsicElements["div"],
) => {
  const propsWithDefauls = mergeProps({ playHeadPosition: 0, sync: false }, allProps);
  const [props, divProps] = splitProps(propsWithDefauls, [
    "playHeadPosition",
    "sync",
    "onPlayHeadPositionChange",
    "onPositionChange",
  ]);

  const viewPort = useViewPortDimension("horizontal");
  createEffect(() => {
    if (!props.sync) return;

    const maxPosition = viewPort.range;
    const newPosition = clamp(
      props.playHeadPosition - viewPort.range / viewPort.zoom / 2,
      0,
      maxPosition,
    );

    props.onPositionChange?.(newPosition);
  });

  const leftPosition = createMemo(() => viewPort.calculatePixelOffset(props.playHeadPosition));

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
        const handleMouseMove = ({ movementX }: MouseEvent) => {
          const { parentElement } = event.currentTarget;
          if (!parentElement) return;

          const newPosition = viewPort.calculatePosition(leftPosition() + movementX);
          props.onPlayHeadPositionChange?.(newPosition);
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
