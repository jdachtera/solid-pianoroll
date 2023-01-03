import { JSX } from "solid-js/jsx-runtime";

import { usePianoRollContext } from "../PianoRollContext";

const HorizontalZoomControl = (props: JSX.IntrinsicElements["input"]) => {
  const context = usePianoRollContext();

  return (
    <input
      max="500"
      min="1"
      step={0.01}
      {...props}
      value={context.zoom}
      onInput={(event) => context.onZoomChange?.(event.currentTarget.valueAsNumber)}
      type="range"
      style={{
        "margin-left": "50px",
        "margin-right": "16px",
      }}
    />
  );
};

export default HorizontalZoomControl;
