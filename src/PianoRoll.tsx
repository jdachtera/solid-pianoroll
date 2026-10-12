import styles from "./PianoRoll.module.css";

import { JSX, ParentProps, Show, mergeProps } from "solid-js";

import { PianoRollContextProvider, splitContextProps } from "./PianoRollContext";
import PianoRollKeys from "./PianoRollKeys";
import PianoRollNotes from "./PianoRollNotes";
import PianoRollGrid from "./PianoRollGrid";
import ZoomSliderControl from "./viewport/ZoomSliderControl";
import PianoRollTrackList from "./PianoRollTrackList";
import createPianoRollstate from "./usePianoRollState";
import PianoRollScrollZoomViewPort, { SCALE_HEIGHT } from "./PianoRollScrollZoomViewPort";
import PianoRollNotesScroller from "./PianoRollNotesScroller";
import PianoRollTrackListScroller from "./PianoRollTrackListScroller";
import PianoRollScale from "./PianoRollScale";

export type PianoRollProps = {
  showAllTracks?: boolean;
  showTrackList?: boolean;
  /** Show the notes without letting anyone edit them.
   *
   * Without this the roll is always editable, and editable is a destructive
   * default for a viewer: the notes layer inserts a note on any press that is
   * not on an existing one, so simply LOOKING at a track — scrolling it with a
   * finger, tapping to focus — writes to it. A caller displaying a recording it
   * does not own (a loop taken from a synth, a file being previewed) has no way
   * to say "draw this" without also saying "and let it be rewritten".
   *
   * Read-only suppresses exactly the note mutations: insert, move, trim and
   * delete. Everything else still works, because none of it changes the music —
   * scrolling, zooming, switching tracks, and playing the keyboard down the side
   * (which sounds notes through onNoteDown/onNoteUp rather than recording them).
   */
  readOnly?: boolean;
} & ReturnType<typeof createPianoRollstate> &
  Omit<JSX.IntrinsicElements["div"], "onDurationChange">;

const PianoRoll = (allProps: ParentProps<PianoRollProps>) => {
  const propsWithDefaults = mergeProps({ showAllTracks: false }, allProps);
  const [context, divProps] = splitContextProps(propsWithDefaults);

  return (
    <PianoRollContextProvider value={context}>
      {/* The consumer's own class is kept alongside ours rather than replaced.
          `class={...}` after the spread used to overwrite whatever they passed,
          so <PianoRoll class="my-roll"> silently styled nothing — the one hook
          a caller would reach for first. */}
      <div
        {...divProps}
        class={[styles.PianoRoll, typeof divProps.class === "string" ? divProps.class : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <PianoRollScrollZoomViewPort>
          <div class={styles.PianoRollContainer}>
            {/* Zooms the track list, so it only belongs where there is one. */}
            <Show when={context.showTrackList}>
              <ZoomSliderControl orientation="vertical" dimensionName="verticalTracks" />
            </Show>
            <div
              classList={{
                [styles.PianoRollLeftColumn]: true,
                [styles.showTrackList]: context.showTrackList,
              }}
            >
              <Show when={context.showTrackList}>
                <div class={styles.ModeBar}>
                  {/* Both modes shown, the current one lit, so the control says
                      what it does without a tooltip. */}
                  <div class={styles.ModeToggle} role="group" aria-label="Left column">
                    <button
                      type="button"
                      title="Keys"
                      aria-pressed={context.mode === "keys"}
                      classList={{
                        [styles.ModeButton]: true,
                        [styles.active]: context.mode === "keys",
                      }}
                      onClick={() => context.onModeChange("keys")}
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                        <rect
                          x="1.5"
                          y="2.5"
                          width="13"
                          height="11"
                          rx="1.5"
                          fill="none"
                          stroke="currentColor"
                        />
                        <path d="M5.5 3v10M10.5 3v10" stroke="currentColor" />
                        <rect x="4.25" y="3" width="2.5" height="6" fill="currentColor" />
                        <rect x="9.25" y="3" width="2.5" height="6" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      title="Tracks"
                      aria-pressed={context.mode === "tracks"}
                      classList={{
                        [styles.ModeButton]: true,
                        [styles.active]: context.mode === "tracks",
                      }}
                      onClick={() => context.onModeChange("tracks")}
                    >
                      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                        <path
                          d="M2 4h12M2 8h12M2 12h12"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>
                  </div>
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
                <div style={{ height: `${SCALE_HEIGHT}px` }}>
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
              "margin-left": `${context.tracksScrollerClientRect.width + 22}px`,
              "margin-right": "22px",
            }}
          />
        </PianoRollScrollZoomViewPort>
      </div>
    </PianoRollContextProvider>
  );
};

export default PianoRoll;
