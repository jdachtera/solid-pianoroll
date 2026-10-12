import { ParentProps } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { ViewPort } from "solid-viewport";

/** The scale strip above the notes (PianoRoll.tsx). */
export const SCALE_HEIGHT = 30;

const FIXED_AXIS = { position: 0, range: 1, zoom: 1, pixelOffset: 0 };

const PianoRollScrollZoomViewPort = (props: ParentProps) => {
  const zoomFactor = 500;

  const context = usePianoRollContext();
  const notesHeight = () => Math.max(1, context.notesScrollerClientRect.height - SCALE_HEIGHT);

  return (
    <ViewPort
      axes={{
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
        // The keys and the notes live BELOW the scale strip, so the vertical
        // axis is the scroller minus that strip. Sized to the whole scroller it
        // laid out SCALE_HEIGHT more pixels of keys than their box holds: the
        // key column overflowed and scrolled on its own, and the bottom rows of
        // notes were drawn out of view.
        vertical: () => ({
          pixelOffset: context.notesScrollerClientRect.top + SCALE_HEIGHT,
          pixelSize: notesHeight(),
          position: context.verticalPosition,
          range: 128,
          zoom: context.verticalZoom * (zoomFactor / notesHeight()),
          onPositionChange: context.onVerticalPositionChange,
          onZoomChange: (verticalZoom) =>
            context.onVerticalZoomChange?.(verticalZoom / (zoomFactor / notesHeight())),
          minZoom: 1,
          maxZoom: 10,
        }),
        // Fixed axes: the track list and the keys never pan or zoom sideways.
        horizontalTracks: () => ({
          ...FIXED_AXIS,
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
        horizontalKeys: () => ({ ...FIXED_AXIS, pixelSize: 60 }),
      }}
    >
      {props.children}
    </ViewPort>
  );
};

export default PianoRollScrollZoomViewPort;
