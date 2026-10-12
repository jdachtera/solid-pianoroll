import { createEffect, createSignal, ParentProps } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import useBoundingClientRect from "./useBoundingClientRect";
import { ScrollContainer } from "solid-viewport";

const PianoRollTrackListScroller = (props: ParentProps) => {
  const context = usePianoRollContext();

  const [ref, setRef] = createSignal<HTMLDivElement>();
  const clientRect = useBoundingClientRect(ref);

  createEffect(() => {
    context.onTracksScrollerClientRectChange(clientRect());
  });

  return (
    <ScrollContainer
      ref={setRef}
      horizontalAxis="horizontalTracks"
      verticalAxis="verticalTracks"
      nativeScrollbars={context.mode === "keys"}
      style={{ "z-index": 4 }}
    >
      {props.children}
    </ScrollContainer>
  );
};

export default PianoRollTrackListScroller;
