import styles from "./PianoRoll.module.css";

import { JSX, splitProps, createSignal, createMemo } from "solid-js";

import { PianoRollContextProvider } from "./PianoRollContext";
import PianoRollKeys from "./PianoRollKeys";
import PianoRollNotes from "./PianoRollNotes";
import ScrollContainer from "./viewport/ScrollContainer";
import PianoRollGrid from "./PianoRollGrid";
import { Note } from "./types";
import { ScrollZoomViewPort as ScrollZoomViewPort } from "./viewport/ScrollZoomViewPort";
import useBoundingClientRect from "./useBoundingClientRect";
import { clamp } from "./viewport/createViewPortDimension";
import VerticalZoomControl from "./viewport/VerticalZoomControl";
import HorizontalZoomControl from "./viewport/HorizontalZoomControl";

export type GridDivision = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export type PianoRollProps = {
  ppq: number;
  notes: Note[];

  gridDivision: GridDivision;
  snapToGrid: boolean;

  condensed?: boolean;

  verticalPosition: number;
  verticalZoom: number;

  position: number;
  duration: number;
  zoom: number;

  onVerticalZoomChange?: (zoom: number) => void;
  onVerticalPositionChange?: (zoom: number) => void;
  onZoomChange?: (zoom: number) => void;
  onPositionChange?: (zoom: number) => void;

  onNoteChange?: (index: number, note: Note) => void;
  onInsertNote?: (note: Note) => number;
  onRemoveNote?: (index: number) => void;
};

const PianoRoll = (allProps: PianoRollProps & JSX.IntrinsicElements["div"]) => {
  const [contextProps, divProps] = splitProps(allProps, [
    "ppq",
    "notes",
    "position",
    "duration",
    "zoom",
    "verticalPosition",
    "verticalZoom",
    "onVerticalZoomChange",
    "onVerticalPositionChange",
    "onZoomChange",
    "onPositionChange",
    "onNoteChange",
    "gridDivision",
    "snapToGrid",
    "onInsertNote",
    "onRemoveNote",
  ]);

  const [scrollerRef, setScrollerRef] = createSignal<HTMLDivElement>();
  const clientRect = useBoundingClientRect(scrollerRef);

  const zoomFactor = 500;

  const minZoom = createMemo(() => 1 / (zoomFactor / clientRect().width));
  const maxZoom = createMemo(() => 500 * (zoomFactor / clientRect().width));

  const minVerticalZoom = createMemo(() => 1 / (zoomFactor / clientRect().height));
  const maxVerticalZoom = createMemo(() => 10 * (zoomFactor / clientRect().height));

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
            }}
          >
            <PianoRollKeys />

            <ScrollContainer ref={setScrollerRef}>
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
