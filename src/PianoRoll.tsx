import styles from "./PianoRoll.module.css";

import { JSX, createSignal, ParentProps, Show, mergeProps } from "solid-js";

import { PianoRollContextProvider, splitContextProps } from "./PianoRollContext";
import PianoRollKeys from "./PianoRollKeys";
import PianoRollNotes from "./PianoRollNotes";
import ScrollZoomContainer from "./viewport/ScrollZoomContainer";
import PianoRollGrid from "./PianoRollGrid";
import { ScrollZoomViewPort as ScrollZoomViewPort } from "./viewport/ScrollZoomViewPort";
import useBoundingClientRect from "./useBoundingClientRect";
import ZoomSliderControl from "./viewport/ZoomSliderControl";
import PianoRollTrackList from "./PianoRollTrackList";
import createPianoRollstate from "./usePianoRollState";

export type GridDivision = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export type PianoRollProps = {
  showAllTracks?: boolean;
  showTrackList?: boolean;
} & ReturnType<typeof createPianoRollstate> &
  Omit<JSX.IntrinsicElements["div"], "onDurationChange">;

const PianoRoll = (allProps: ParentProps<PianoRollProps>) => {
  const propsWithDefaults = mergeProps({ showAllTracks: false }, allProps);
  const [context, divProps] = splitContextProps(propsWithDefaults);

  const [notesScrollerRef, setNotesScrollerRef] = createSignal<HTMLDivElement>();
  const [tracksScrollerRef, setTracksScrollerRef] = createSignal<HTMLDivElement>();

  const notesScrollerClientRect = useBoundingClientRect(notesScrollerRef);
  const tracksScrollerClientRect = useBoundingClientRect(tracksScrollerRef);

  const zoomFactor = 500;

  return (
    <PianoRollContextProvider value={context}>
      <div {...divProps} class={styles.PianoRoll}>
        <ScrollZoomViewPort
          dimensions={{
            horizontal: () => ({
              pixelOffset: notesScrollerClientRect().left,
              pixelSize: notesScrollerClientRect().width,
              position: context.position,
              range: context.duration,
              zoom: context.zoom * (zoomFactor / notesScrollerClientRect().width),
              onPositionChange: context.onPositionChange,
              onZoomChange: (zoom) =>
                context.onZoomChange?.(zoom / (zoomFactor / notesScrollerClientRect().width)),
              minZoom: 1,
              maxZoom: 500,
            }),
            vertical: () => ({
              pixelOffset: notesScrollerClientRect().top,
              pixelSize: notesScrollerClientRect().height,
              position: context.verticalPosition,
              range: 128,
              zoom: context.verticalZoom * (zoomFactor / notesScrollerClientRect().height),
              onPositionChange: context.onVerticalPositionChange,
              onZoomChange: (verticalZoom) =>
                context.onVerticalZoomChange?.(
                  verticalZoom / (zoomFactor / notesScrollerClientRect().height),
                ),
              minZoom: 1,
              maxZoom: 10,
            }),
            horizontalTracks: () => ({
              pixelOffset: 0,
              pixelSize: tracksScrollerClientRect().width,
            }),
            verticalTracks: () => ({
              pixelOffset: tracksScrollerClientRect().top,
              pixelSize: tracksScrollerClientRect().height,
              position: context.verticalTrackPosition,
              range: context.tracks.length,
              zoom: context.verticalTrackZoom * (zoomFactor / tracksScrollerClientRect().height),
              onPositionChange: context.onVerticalTrackPositionChange,
              onZoomChange: (verticalTrackZoom) =>
                context.onVerticalTrackZoomChange?.(
                  verticalTrackZoom / (zoomFactor / tracksScrollerClientRect().height),
                ),
              minZoom: 0.8,
              maxZoom: 3,
            }),
            horizontalKeys: () => ({ pixelSize: 60 }),
          }}
        >
          <div class={styles.PianoRollContainer}>
            <ZoomSliderControl orientation="vertical" dimensionName="verticalTracks" />
            <div class={styles.PianoRollLeftColumn}>
              <Show when={context.showTrackList}>
                <ScrollZoomContainer
                  ref={setTracksScrollerRef}
                  horizontalDimensionName="horizontalTracks"
                  verticalDimensionName="verticalTracks"
                  showScrollbar={context.mode === "keys"}
                >
                  <PianoRollTrackList />
                </ScrollZoomContainer>
              </Show>
              <Show when={context.mode === "keys"}>
                <PianoRollKeys />
              </Show>
            </div>

            <ScrollZoomContainer
              ref={setNotesScrollerRef}
              verticalDimensionName={context.mode === "keys" ? "vertical" : "verticalTracks"}
            >
              {allProps.children}
              <PianoRollGrid />
              <PianoRollNotes />
            </ScrollZoomContainer>

            <ZoomSliderControl orientation="vertical" disabled={context.mode !== "keys"} />
          </div>
          <ZoomSliderControl
            orientation="horizontal"
            style={{
              "margin-left": `${tracksScrollerClientRect().width + 24}px`,
              "margin-right": "24px",
            }}
          />
        </ScrollZoomViewPort>
      </div>
    </PianoRollContextProvider>
  );
};

export default PianoRoll;
