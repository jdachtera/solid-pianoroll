import { createMemo } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";
import { useViewPortDimension } from "./ScrollZoomViewPort";

const HorizontalZoomControl = (
  props: { dimensionName?: string } & JSX.IntrinsicElements["input"],
) => {
  const dimension = createMemo(() => useViewPortDimension(props.dimensionName ?? "horizontal"));

  return (
    <input
      max="500"
      min="1"
      step={0.01}
      {...props}
      value={dimension().zoom}
      onInput={(event) => dimension().onZoomChange?.(event.currentTarget.valueAsNumber)}
      type="range"
      style={{
        "margin-left": "50px",
        "margin-right": "16px",
        ...(typeof props.style === "object" && props.style),
      }}
    />
  );
};

export default HorizontalZoomControl;
