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
import PianoRollScale from "./PianoRollScale";

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
            <div
              classList={{
                [styles.PianoRollLeftColumn]: true,
                [styles.showTrackList]: context.showTrackList,
              }}
            >
              <Show when={context.showTrackList}>
                <div
                  style={{
                    height: "30px",
                    "border-right": "1px black solid",
                  }}
                >
                  <button
                    title={context.mode === "keys" ? "Tracks Mode" : "Keys Mode"}
                    onClick={() =>
                      context.onModeChange(context.mode === "keys" ? "tracks" : "keys")
                    }
                    style={{
                      "font-size": "16px",
                      "line-height": "16px",
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                  >
                    <div>{context.mode === "keys" ? "≡" : "🎹"}</div>
                  </button>
                </div>
              </Show>
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                <Show when={context.showTrackList}>
                  <PianoRollTrackListScroller>
                    <PianoRollTrackList />
                  </PianoRollTrackListScroller>
                </Show>
                <Show when={context.mode === "keys"}>
                  <PianoRollKeys />
                </Show>
              </div>
            </div>

            <PianoRollNotesScroller>
              {allProps.children}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  height: "100%",
                  "flex-direction": "column",
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "30px" }}>
                  <PianoRollScale />
                </div>

                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                  <PianoRollGrid />
                  <PianoRollNotes />
                </div>
              </div>
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
