import { usePianoRollContext } from "./PianoRollContext";

const HorizontalZoomControl = () => {
  const context = usePianoRollContext();

  return (
    <input
      value={context.zoom}
      onInput={(event) => context.onZoomChange?.(event.currentTarget.valueAsNumber)}
      type="range"
      max="500"
      min="1"
      step={0.01}
      style={{
        "margin-left": "50px",
        "margin-right": "16px",
      }}
    />
  );
};

export default HorizontalZoomControl;
