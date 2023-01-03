import { JSX } from "solid-js/jsx-runtime";
import { usePianoRollContext } from "../PianoRollContext";

const VerticalZoomControl = (props: JSX.IntrinsicElements["input"]) => {
  const context = usePianoRollContext();

  return (
    <input
      min="1"
      max="11"
      step={0.01}
      {...props}
      value={context.verticalZoom}
      onInput={(event) => context.onVerticalZoomChange?.(event.currentTarget.valueAsNumber)}
      type="range"
      {...{ orient: "vertical" }}
      style={{
        width: "16px",
        ...({
          "writing-mode": "bt-lr" /* IE */,
          "-webkit-appearance": "slider-vertical" /* WebKit */,
        } as unknown as JSX.CSSProperties),
      }}
    />
  );
};

export default VerticalZoomControl;
