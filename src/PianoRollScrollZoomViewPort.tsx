import { ParentProps } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { ScrollZoomViewPort } from "./viewport/ScrollZoomViewPort";

// Height (px) of the time-ruler row above the notes (see PianoRoll.tsx). The
// notes/grid start this far below the notes-scroller's top, so the vertical
// hit-testing origin must be offset by it — otherwise clicks/drags map ~this
// many pixels too high and notes land a few semitones below the cursor.
export const PIANO_ROLL_SCALE_HEIGHT = 30;

const PianoRollScrollZoomViewPort = (props: ParentProps) => {
  const zoomFactor = 500;

  const context = usePianoRollContext();

  return (
    <ScrollZoomViewPort
      dimensions={{
        horizontal: () => ({
          pixelOffset: context.notesScrollerClientRect.left,
          pixelSize: context.notesScrollerClientRect.width,
          position: context.position,
          range: context.duration,
          zoom: context.zoom * (zoomFactor / context.notesScrollerClientRect.width),
          onPositionChange: context.onPositionChange,
          onZoomChange: (zoom) =>
            context.onZoomChange?.(zoom / (zoomFactor / context.notesScrollerClientRect.width)),
          minZoom: 1,
          maxZoom: 500,
        }),
        vertical: () => ({
          pixelOffset: context.notesScrollerClientRect.top + PIANO_ROLL_SCALE_HEIGHT,
          pixelSize: context.notesScrollerClientRect.height,
          position: context.verticalPosition,
          range: 128,
          zoom: context.verticalZoom * (zoomFactor / context.notesScrollerClientRect.height),
          onPositionChange: context.onVerticalPositionChange,
          onZoomChange: (verticalZoom) =>
            context.onVerticalZoomChange?.(
              verticalZoom / (zoomFactor / context.notesScrollerClientRect.height),
            ),
          minZoom: 1,
          maxZoom: 10,
        }),
        horizontalTracks: () => ({
          pixelOffset: 0,
          pixelSize: context.tracksScrollerClientRect.width,
        }),
        verticalTracks: () => ({
          pixelOffset: context.tracksScrollerClientRect.top,
          pixelSize: context.tracksScrollerClientRect.height,
          position: context.verticalTrackPosition,
          range: context.tracks.length,
          zoom: context.verticalTrackZoom * (zoomFactor / context.tracksScrollerClientRect.height),
          onPositionChange: context.onVerticalTrackPositionChange,
          onZoomChange: (verticalTrackZoom) =>
            context.onVerticalTrackZoomChange?.(
              verticalTrackZoom / (zoomFactor / context.tracksScrollerClientRect.height),
            ),
          minZoom: 0.8,
          maxZoom: 3,
        }),
        horizontalKeys: () => ({ pixelSize: 60 }),
      }}
    >
      {props.children}
    </ScrollZoomViewPort>
  );
};

export default PianoRollScrollZoomViewPort;
