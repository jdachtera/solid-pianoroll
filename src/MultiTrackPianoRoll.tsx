import {
  JSX,
  createSignal,
  mergeProps,
  createMemo,
  Index,
  createEffect,
  splitProps,
  Show,
  ParentProps,
} from "solid-js";
import styles from "./PianoRoll.module.css";
import HorizontalZoomControl from "./viewport/HorizontalZoomControl";

import { PianoRollContextProvider, splitContextProps } from "./PianoRollContext";

import PianoRollNotes from "./PianoRollNotes";
import ScrollContainer from "./viewport/ScrollContainer";
import PianoRollGrid from "./PianoRollGrid";

import { TrackJSON } from "@tonejs/midi";
import useNotes from "./useNotes";
import { PianoRollProps } from "./PianoRoll";
import useBoundingClientRect from "./useBoundingClientRect";
import { ScrollZoomViewPort, useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import { clamp } from "./viewport/createViewPortDimension";
import { createStore } from "solid-js/store";
import PianoRollKeys from "./PianoRollKeys";
import VerticalZoomControl from "./viewport/VerticalZoomControl";

export type MultiTrackPianoRollProps = Omit<
  PianoRollProps,
  "notes" | "onNoteChange" | "onInsertNote" | "onRemoveNote" | "condensed"
> & {
  tracks: TrackJSON[];
  selectedTrack?: TrackJSON;
  onSelectedTrackChange: (track?: TrackJSON) => void;
} & JSX.IntrinsicElements["div"];

const MultiTrackPianoRoll = (allProps: ParentProps<MultiTrackPianoRollProps>) => {
  const condensed = createMemo(() => !allProps.selectedTrack);

  const [ownProps, restProps] = splitProps(allProps, ["tracks", "selectedTrack"]);

  const [contextProps, divProps] = splitContextProps(
    mergeProps(restProps, { notes: [], condensed: false }),
  );

  const [scrollerRef, setScrollerRef] = createSignal<HTMLDivElement>();
  const clientRect = useBoundingClientRect(scrollerRef);

  const zoomFactor = 500;

  const minZoom = createMemo(() => 1 / (zoomFactor / clientRect().width));
  const maxZoom = createMemo(() => 500 * (zoomFactor / clientRect().width));

  const minVerticalZoom = createMemo(() => 1 / (zoomFactor / clientRect().height));
  const maxVerticalZoom = createMemo(() => 10 * (zoomFactor / clientRect().height));

  return (
    <div
      {...divProps}
      style={{
        display: "flex",
        flex: 1,
        height: "100%",
        "flex-direction": "row",
        overflow: "hidden",
        ...(typeof divProps.style === "object" && divProps.style),
      }}
    >
      <PianoRollContextProvider value={{ ...contextProps }}>
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
          <div
            style={{
              width: "250px",
              display: "flex",
              "flex-direction": "row",
            }}
          >
            <ul
              style={{
                "margin-block-start": 0,
                "padding-inline-start": 0,
                flex: 1,
                position: "relative",
              }}
            >
              <Index each={allProps.tracks}>
                {(track) => (
                  <li
                    style={{
                      width: "100%",
                      height: "30px",
                      "list-style": "none",
                      display: "flex",
                      "align-items": "center",
                      "border-top": "1px black solid",
                      background: track() === allProps.selectedTrack ? "lightgray" : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (track() === allProps.selectedTrack) {
                        allProps.onSelectedTrackChange(undefined);
                      } else {
                        allProps.onSelectedTrackChange(track());
                      }
                    }}
                  >
                    {track().name}
                  </li>
                )}
              </Index>
            </ul>
            <Show when={!condensed()}>
              <PianoRollKeys />
            </Show>
          </div>

          <div class={styles.PianoRoll} style={{ flex: 1 }}>
            <div class={styles.PianoRollContainer}>
              <ScrollContainer ref={setScrollerRef}>
                {allProps.children}
                <ul
                  style={{
                    margin: 0,
                    "margin-block-start": 0,
                    "padding-inline-start": 0,
                  }}
                >
                  <Index each={allProps.tracks}>
                    {(track) => {
                      const notes = useNotes();

                      createEffect(() => {
                        notes.onNotesChange(track().notes);
                      });

                      const [context, setContext] = createStore({ ...contextProps });

                      createEffect(() => {
                        setContext({
                          ...contextProps,
                          condensed: condensed(),
                          notes: notes.notes(),
                          onNoteChange: notes.onNoteChange,
                          onInsertNote: notes.onInsertNote,
                          onRemoveNote: notes.onRemoveNote,
                        });
                      });

                      const verticalViewPort = useViewPortDimension("vertical");

                      return (
                        <Show when={condensed() || allProps.selectedTrack === track()}>
                          <PianoRollContextProvider value={context}>
                            <li
                              style={{
                                display: "flex",
                                position: "relative",
                                "list-style": "none",
                                "flex-direction": "row",
                                height: condensed() ? "30px" : `${verticalViewPort.pixelSize}px`,
                                "border-top": "1px black solid",
                              }}
                            >
                              <PianoRollNotes />
                              <PianoRollGrid />
                            </li>
                          </PianoRollContextProvider>
                        </Show>
                      );
                    }}
                  </Index>
                </ul>
              </ScrollContainer>
              <Show when={!condensed()}>
                <VerticalZoomControl
                  value={contextProps.verticalZoom}
                  onInput={(event) =>
                    contextProps.onVerticalZoomChange?.(event.currentTarget.valueAsNumber)
                  }
                />
              </Show>
            </div>
            <HorizontalZoomControl
              style={{ width: "100%", "margin-left": 0 }}
              value={contextProps.zoom}
              onInput={(event) => contextProps.onZoomChange?.(event.currentTarget.valueAsNumber)}
            />
          </div>
        </ScrollZoomViewPort>
      </PianoRollContextProvider>
    </div>
  );
};

export default MultiTrackPianoRoll;
