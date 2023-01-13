import { createMemo, mergeProps } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";
import { useViewPortDimension } from "./ScrollZoomViewPort";

const ZoomSliderControl = (
  props: {
    dimensionName?: string;
    orientation?: "horizontal" | "vertical";
  } & JSX.IntrinsicElements["input"],
) => {
  const propsWithDefaults = mergeProps({ orientation: "horizontal" }, props);
  const dimension = createMemo(() =>
    useViewPortDimension(props.dimensionName ?? propsWithDefaults.orientation),
  );

  return (
    <input
      min={dimension().minZoom}
      max={dimension().maxZoom}
      step={0.01}
      {...props}
      value={dimension().zoom}
      onInput={(event) => dimension().onZoomChange?.(event.currentTarget.valueAsNumber)}
      type="range"
      {...{ orient: propsWithDefaults.orientation }}
      style={
        propsWithDefaults.orientation === "vertical"
          ? {
              margin: 0,
              "margin-left": "4px",
              "margin-right": "4px",
              width: "16px",
              transform: "rotate(180deg)",
              ...({
                "writing-mode": "bt-lr" /* IE */,
                "-webkit-appearance": "slider-vertical" /* WebKit */,
              } as unknown as JSX.CSSProperties),
              ...(typeof props.style === "object" && props.style),
            }
          : {
              margin: 0,
              "margin-top": "4px",
              "margin-bottom": "4px",
              ...(typeof props.style === "object" && props.style),
            }
      }
    />
  );
};

export default ZoomSliderControl;
