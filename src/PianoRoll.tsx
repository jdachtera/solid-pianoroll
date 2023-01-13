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

  const [context, divProps] = splitContextProps(propsWithDefaults);

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

    if (context.mode === "tracks") {
      context.onVerticalPositionChange?.(0);
    }
  }, true);

  return (
    <PianoRollContextProvider value={context}>
      <div {...divProps} class={styles.PianoRoll}>
        <ScrollZoomViewPort
          dimensions={{
            horizontal: () => ({
              pixelOffset: clientRect().left,
              pixelSize: clientRect().width,
              position: context.position,
              range: context.duration,
              zoom: context.zoom * (zoomFactor / clientRect().width),
              onPositionChange: context.onPositionChange,
              onZoomChange: (zoom) =>
                context.onZoomChange?.(
                  clamp(zoom / (zoomFactor / clientRect().width), minZoom(), maxZoom()),
                ),
            }),
            vertical: () => ({
              pixelOffset: clientRect().top,
              pixelSize: clientRect().height,
              position: context.verticalPosition,
              range: 128,
              zoom: context.verticalZoom * (zoomFactor / clientRect().height),
              onPositionChange: context.onVerticalPositionChange,
              onZoomChange: (verticalZoom) =>
                context.onVerticalZoomChange?.(
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
              position: context.verticalTrackPosition,
              range: context.tracks.length,
              zoom: context.verticalTrackZoom * (zoomFactor / trackClientRef().height),
              onPositionChange: context.onVerticalTrackPositionChange,
              onZoomChange: (verticalTrackZoom) =>
                context.onVerticalTrackZoomChange?.(
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
              <Show when={context.showTrackList}>
                <ScrollContainer
                  ref={setTrackScrollerRef}
                  horizontalDimensionName="horizontalTracks"
                  verticalDimensionName="verticalTracks"
                  showScrollbar={context.mode === "keys"}
                >
                  <PianoRollTrackList />
                </ScrollContainer>
              </Show>
              <Show when={context.mode === "keys"}>
                <PianoRollKeys />
              </Show>
            </div>

            <ScrollContainer
              ref={setScrollerRef}
              verticalDimensionName={context.mode === "keys" ? "vertical" : "verticalTracks"}
            >
              {allProps.children}
              <PianoRollGrid />
              <PianoRollNotes />
            </ScrollContainer>

            <VerticalZoomControl
              min={minVerticalZoom()}
              max={maxVerticalZoom()}
              disabled={context.mode !== "keys"}
            />
          </div>
          <HorizontalZoomControl min={minZoom()} max={maxZoom()} />
        </ScrollZoomViewPort>
      </div>
    </PianoRollContextProvider>
  );
};

export default PianoRoll;
