import { usePianoRollContext } from "./PianoRollContext";

const VerticalZoomControl = () => {
  const context = usePianoRollContext();

  return (
    <input
      value={context.verticalZoom}
      onInput={(event) => context.onVerticalZoomChange?.(event.currentTarget.valueAsNumber)}
      type="range"
      min="1"
      max="11"
      step={0.01}
      {...{ orient: "vertical" }}
      style={{
        width: "16px",
        ...({
          "writing-mode": "bt-lr" /* IE */,
          "-webkit-appearance": "slider-vertical" /* WebKit */,
        } as any),
      }}
    />
  );
};

export default VerticalZoomControl;
