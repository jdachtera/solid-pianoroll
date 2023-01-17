import { createEffect, createSignal, ParentProps } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import useBoundingClientRect from "./useBoundingClientRect";
import ScrollZoomContainer from "./viewport/ScrollZoomContainer";

const PianoRollNotesScroller = (props: ParentProps) => {
  const context = usePianoRollContext();

  const [ref, setRef] = createSignal<HTMLDivElement>();
  const clientRect = useBoundingClientRect(ref);

  createEffect(() => {
    context.onNotesScrollerClientRectChange(clientRect());
  });

  return (
    <ScrollZoomContainer
      ref={setRef}
      verticalDimensionName={context.mode === "keys" ? "vertical" : "verticalTracks"}
    >
      {props.children}
    </ScrollZoomContainer>
  );
};

export default PianoRollNotesScroller;
