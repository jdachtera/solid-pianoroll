import { createMemo } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";
import { useViewPortDimension } from "./ScrollZoomViewPort";

const VerticalZoomControl = (
  props: {
    dimensionName?: string;
  } & JSX.IntrinsicElements["input"],
) => {
  const dimension = createMemo(() => useViewPortDimension(props.dimensionName ?? "vertical"));

  return (
    <input
      min="1"
      max="11"
      step={0.01}
      {...props}
      value={dimension().zoom}
      onInput={(event) => dimension().onZoomChange?.(event.currentTarget.valueAsNumber)}
      type="range"
      {...{ orient: "vertical" }}
      style={{
        width: "16px",
        transform: "rotate(180deg)",
        ...({
          "writing-mode": "bt-lr" /* IE */,
          "-webkit-appearance": "slider-vertical" /* WebKit */,
        } as unknown as JSX.CSSProperties),
      }}
    />
  );
};

export default VerticalZoomControl;
