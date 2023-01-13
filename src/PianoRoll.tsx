import styles from "./PianoRoll.module.css";

import {
  JSX,
  createSignal,
  createMemo,
  ParentProps,
  createEffect,
  Show,
  mergeProps,
} from "solid-js";

import { PianoRollContextProvider, splitContextProps } from "./PianoRollContext";
import PianoRollKeys from "./PianoRollKeys";
import PianoRollNotes from "./PianoRollNotes";
import ScrollContainer from "./viewport/ScrollContainer";
import PianoRollGrid from "./PianoRollGrid";
import { ScrollZoomViewPort as ScrollZoomViewPort } from "./viewport/ScrollZoomViewPort";
import useBoundingClientRect from "./useBoundingClientRect";
import { clamp } from "./viewport/createViewPortDimension";
import VerticalZoomControl from "./viewport/VerticalZoomControl";
import HorizontalZoomControl from "./viewport/HorizontalZoomControl";
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

  const [contextProps, divProps] = splitContextProps(propsWithDefaults);

  const [scrollerRef, setScrollerRef] = createSignal<HTMLDivElement>();
  const [trackScrollerRef, setTrackScrollerRef] = createSignal<HTMLDivElement>();

  const clientRect = useBoundingClientRect(scrollerRef);
  const trackClientRef = useBoundingClientRect(trackScrollerRef);

  const zoomFactor = 500;

  const minZoom = createMemo(() => 1 / (zoomFactor / clientRect().width));
  const maxZoom = createMemo(() => 500 * (zoomFactor / clientRect().width));

  const minVerticalZoom = createMemo(() => 1 / (zoomFactor / clientRect().height));
  const maxVerticalZoom = createMemo(() => 10 * (zoomFactor / clientRect().height));

  const minVerticalTracksZoom = createMemo(() => 0.8 / (zoomFactor / trackClientRef().height));
  const maxVerticalTracksZoom = createMemo(() => 3 * (zoomFactor / trackClientRef().height));

  createEffect((isInitial) => {
    if (isInitial) return false;

    if (contextProps.mode === "tracks") {
      contextProps.onVerticalPositionChange?.(0);
    }
  }, true);

  return (
    <PianoRollContextProvider value={contextProps}>
      <div {...divProps} class={styles.PianoRoll}>
        <ScrollZoomViewPort
          dimensions={{
            horizontal: () => ({
              pixelOffset: clientRect().left,
              pixelSize: clientRect().width,
              position: contextProps.position,
              range: contextProps.duration,
              zoom: contextProps.zoom * (zoomFactor / clientRect().width),
              onPositionChange: contextProps.onPositionChange,
              onZoomChange: (zoom) =>
                contextProps.onZoomChange?.(
                  clamp(zoom / (zoomFactor / clientRect().width), minZoom(), maxZoom()),
                ),
            }),
            vertical: () => ({
              pixelOffset: clientRect().top,
              pixelSize: clientRect().height,
              position: contextProps.verticalPosition,
              range: 128,
              zoom: contextProps.verticalZoom * (zoomFactor / clientRect().height),
              onPositionChange: contextProps.onVerticalPositionChange,
              onZoomChange: (verticalZoom) =>
                contextProps.onVerticalZoomChange?.(
                  clamp(
                    verticalZoom / (zoomFactor / clientRect().height),
                    minVerticalZoom(),
                    maxVerticalZoom(),
                  ),
                ),
            }),
            horizontalTracks: () => ({
              pixelOffset: clientRect().left,
              pixelSize: clientRect().width,
              position: 0,
              range: 1,
              zoom: 1,
            }),
            verticalTracks: () => ({
              pixelOffset: trackClientRef().top,
              pixelSize: trackClientRef().height,
              position: contextProps.verticalTrackPosition,
              range: Math.max(contextProps.tracks.length, 16),
              zoom: contextProps.verticalTrackZoom * (zoomFactor / trackClientRef().height),
              onPositionChange: contextProps.onVerticalTrackPositionChange,
              onZoomChange: (verticalTrackZoom) =>
                contextProps.onVerticalTrackZoomChange?.(
                  clamp(
                    verticalTrackZoom / (zoomFactor / trackClientRef().height),
                    minVerticalTracksZoom(),
                    maxVerticalTracksZoom(),
                  ),
                ),
            }),
          }}
        >
          <div class={styles.PianoRollContainer}>
            <VerticalZoomControl
              min={minVerticalTracksZoom()}
              max={maxVerticalTracksZoom()}
              dimensionName="verticalTracks"
            />
            <div style={{ display: "flex", width: "20%" }}>
              <Show when={contextProps.showTrackList}>
                <ScrollContainer
                  ref={setTrackScrollerRef}
                  horizontalDimensionName="horizontalTracks"
                  verticalDimensionName="verticalTracks"
                  showScrollbar={contextProps.mode === "keys"}
                >
                  <PianoRollTrackList />
                </ScrollContainer>
              </Show>
              <Show when={contextProps.mode === "keys"}>
                <PianoRollKeys />
              </Show>
            </div>

            <ScrollContainer
              ref={setScrollerRef}
              verticalDimensionName={contextProps.mode === "keys" ? "vertical" : "verticalTracks"}
            >
              {allProps.children}
              <PianoRollGrid />
              <PianoRollNotes />
            </ScrollContainer>

            <VerticalZoomControl
              min={minVerticalZoom()}
              max={maxVerticalZoom()}
              dimensionName={contextProps.mode === "keys" ? "vertical" : "verticalTracks"}
            />
          </div>
          <HorizontalZoomControl min={minZoom()} max={maxZoom()} />
        </ScrollZoomViewPort>
      </div>
    </PianoRollContextProvider>
  );
};

export default PianoRoll;
