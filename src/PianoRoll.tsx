import styles from "./PianoRoll.module.css";

import { JSX, ParentProps, Show, mergeProps } from "solid-js";

import { PianoRollContextProvider, splitContextProps } from "./PianoRollContext";
import PianoRollKeys from "./PianoRollKeys";
import PianoRollNotes from "./PianoRollNotes";
import PianoRollGrid from "./PianoRollGrid";
import ZoomSliderControl from "./viewport/ZoomSliderControl";
import PianoRollTrackList from "./PianoRollTrackList";
import createPianoRollstate from "./usePianoRollState";
import PianoRollScrollZoomViewPort from "./PianoRollScrollZoomViewPort";
import PianoRollNotesScroller from "./PianoRollNotesScroller";
import PianoRollTrackListScroller from "./PianoRollTrackListScroller";

export type GridDivision = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export type PianoRollProps = {
  showAllTracks?: boolean;
  showTrackList?: boolean;
} & ReturnType<typeof createPianoRollstate> &
  Omit<JSX.IntrinsicElements["div"], "onDurationChange">;

const PianoRoll = (allProps: ParentProps<PianoRollProps>) => {
  const propsWithDefaults = mergeProps({ showAllTracks: false }, allProps);
  const [context, divProps] = splitContextProps(propsWithDefaults);

  return (
    <PianoRollContextProvider value={context}>
      <div {...divProps} class={styles.PianoRoll}>
        <PianoRollScrollZoomViewPort>
          <div class={styles.PianoRollContainer}>
            <ZoomSliderControl orientation="vertical" dimensionName="verticalTracks" />
            <div class={styles.PianoRollLeftColumn}>
              <Show when={context.showTrackList}>
                <PianoRollTrackListScroller>
                  <PianoRollTrackList />
                </PianoRollTrackListScroller>
              </Show>
              <Show when={context.mode === "keys"}>
                <PianoRollKeys />
              </Show>
            </div>

            <PianoRollNotesScroller>
              {allProps.children}
              <PianoRollGrid />
              <PianoRollNotes />
            </PianoRollNotesScroller>

            <ZoomSliderControl orientation="vertical" disabled={context.mode !== "keys"} />
          </div>
          <ZoomSliderControl
            orientation="horizontal"
            style={{
              "margin-left": `${context.tracksScrollerClientRect.width + 24}px`,
              "margin-right": "24px",
            }}
          />
        </PianoRollScrollZoomViewPort>
      </div>
    </PianoRollContextProvider>
  );
};

export default PianoRoll;
