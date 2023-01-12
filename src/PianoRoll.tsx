import styles from "./PianoRoll.module.css";

import { JSX, createSignal, createMemo, ParentProps, createEffect, Show } from "solid-js";

import { PianoRollContextProvider, splitContextProps } from "./PianoRollContext";
import PianoRollKeys from "./PianoRollKeys";
import PianoRollNotes from "./PianoRollNotes";
import ScrollContainer from "./viewport/ScrollContainer";
import PianoRollGrid from "./PianoRollGrid";
import { Note, Track } from "./types";
import { ScrollZoomViewPort as ScrollZoomViewPort } from "./viewport/ScrollZoomViewPort";
import useBoundingClientRect from "./useBoundingClientRect";
import { clamp } from "./viewport/createViewPortDimension";
import VerticalZoomControl from "./viewport/VerticalZoomControl";
import HorizontalZoomControl from "./viewport/HorizontalZoomControl";
import PianoRollTrackList from "./PianoRollTrackList";

export type GridDivision = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export type PianoRollProps = {
  ppq: number;
  tracks: Track[];

  gridDivision: GridDivision;
  snapToGrid: boolean;

  mode: "keys" | "tracks";
  showAllTracks?: boolean;
  showTrackList?: boolean;

  selectedTrackIndex: number;

  verticalPosition: number;
  verticalZoom: number;

  position: number;
  duration: number;
  zoom: number;

  onVerticalZoomChange?: (zoom: number) => void;
  onVerticalPositionChange?: (zoom: number) => void;
  onZoomChange?: (zoom: number) => void;
  onPositionChange?: (zoom: number) => void;

  onNoteChange?: (trackIndex: number, noteIndex: number, note: Note) => void;
  onInsertNote?: (trackIndex: number, note: Note) => number;
  onRemoveNote?: (trackIndex: number, noteIndex: number) => void;

  onSelectedTrackIndexChange?: (trackIndex: number) => void;
};

const PianoRoll = (allProps: ParentProps<PianoRollProps & JSX.IntrinsicElements["div"]>) => {
  const [contextProps, divProps] = splitContextProps(allProps);

  const [scrollerRef, setScrollerRef] = createSignal<HTMLDivElement>();
  const clientRect = useBoundingClientRect(scrollerRef);

  const zoomFactor = 500;

  const minZoom = createMemo(() => 1 / (zoomFactor / clientRect().width));
  const maxZoom = createMemo(() => 500 * (zoomFactor / clientRect().width));

  const minVerticalZoom = createMemo(() => 1 / (zoomFactor / clientRect().height));
  const maxVerticalZoom = createMemo(() => 10 * (zoomFactor / clientRect().height));

  createEffect((isInitial) => {
    if (isInitial) return false;

    if (contextProps.mode === "tracks") {
      contextProps.onVerticalPositionChange?.(0);
    }
  }, true);

  return (
    <PianoRollContextProvider value={contextProps}>
      <div {...divProps} class={styles.PianoRoll}>
        <div class={styles.PianoRollContainer}>
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
                range:
                  contextProps.mode === "keys" ? 128 : Math.max(contextProps.tracks.length, 16),
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
            }}
          >
            <div style={{ display: "flex", width: "20%" }}>
              <Show when={allProps.showTrackList}>
                <PianoRollTrackList />
              </Show>
              <Show when={contextProps.mode === "keys"}>
                <PianoRollKeys />
              </Show>
            </div>

            <ScrollContainer ref={setScrollerRef}>
              {allProps.children}
              <PianoRollGrid />
              <PianoRollNotes />
            </ScrollContainer>

            <VerticalZoomControl min={minVerticalZoom()} max={maxVerticalZoom()} />
          </ScrollZoomViewPort>
        </div>
        <HorizontalZoomControl min={minZoom()} max={maxZoom()} />
      </div>
    </PianoRollContextProvider>
  );
};

export default PianoRoll;
