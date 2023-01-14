import { createEffect, createMemo, JSX, mergeProps, splitProps } from "solid-js";
import { clamp } from "./viewport/createViewPortDimension";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";

const PlayHead = (
  allProps: {
    position: number;
    onPositionChange?: (playHeadPosition: number) => void;
    sync?: boolean;
  } & JSX.IntrinsicElements["div"],
) => {
  const propsWithDefauls = mergeProps(allProps);
  const [props, divProps] = splitProps(propsWithDefauls, ["position", "sync", "onPositionChange"]);

  const viewPort = useViewPortDimension("horizontal");
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
        const handleMouseMove = ({ clientX }: MouseEvent) => {
          const newPosition = viewPort.calculatePosition(clientX);
          props.onPositionChange?.(newPosition);
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
