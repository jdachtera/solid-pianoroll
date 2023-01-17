import { createEffect, createSignal, ParentProps } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import useBoundingClientRect from "./useBoundingClientRect";
import ScrollZoomContainer from "./viewport/ScrollZoomContainer";

const PianoRollTrackListScroller = (props: ParentProps) => {
  const context = usePianoRollContext();

  const [ref, setRef] = createSignal<HTMLDivElement>();
  const clientRect = useBoundingClientRect(ref);

  createEffect(() => {
    context.onTracksScrollerClientRectChange(clientRect());
  });

  return (
    <ScrollZoomContainer
      ref={setRef}
      horizontalDimensionName="horizontalTracks"
      verticalDimensionName="verticalTracks"
      showScrollbar={context.mode === "keys"}
    >
      {props.children}
    </ScrollZoomContainer>
  );
};

export default PianoRollTrackListScroller;
