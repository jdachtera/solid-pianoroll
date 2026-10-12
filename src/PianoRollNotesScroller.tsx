import { createEffect, createSignal, ParentProps } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import useBoundingClientRect from "./useBoundingClientRect";
import ScrollZoomContainer from "./viewport/ScrollZoomContainer";
import { SCALE_HEIGHT } from "./PianoRollScrollZoomViewPort";

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
      // The time scale sits above the notes inside this scroller.
      verticalInset={SCALE_HEIGHT}
    >
      {props.children}
    </ScrollZoomContainer>
  );
};

export default PianoRollNotesScroller;
