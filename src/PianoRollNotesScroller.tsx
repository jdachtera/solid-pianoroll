import { createEffect, createSignal, ParentProps } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import useBoundingClientRect from "./useBoundingClientRect";
import { ScrollContainer } from "solid-viewport";
import { SCALE_HEIGHT } from "./PianoRollScrollZoomViewPort";

const PianoRollNotesScroller = (props: ParentProps) => {
  const context = usePianoRollContext();

  const [ref, setRef] = createSignal<HTMLDivElement>();
  const clientRect = useBoundingClientRect(ref);

  createEffect(() => {
    context.onNotesScrollerClientRectChange(clientRect());
  });

  return (
    <ScrollContainer
      ref={setRef}
      verticalAxis={context.mode === "keys" ? "vertical" : "verticalTracks"}
      // The time scale sits above the notes inside this scroller.
      verticalInset={SCALE_HEIGHT}
      nativeScrollbars
      pinch={context.pinchZoom}
      style={{ "z-index": 4 }}
    >
      {props.children}
    </ScrollContainer>
  );
};

export default PianoRollNotesScroller;
