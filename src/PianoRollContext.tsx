import { createContext, splitProps, useContext } from "solid-js";

import { PianoRollProps } from "./PianoRoll";
import createPianoRollstate from "./usePianoRollState";

const PianoRollContext = createContext<
  {
    showAllTracks?: boolean;
    showTrackList?: boolean;
  } & ReturnType<typeof createPianoRollstate>
>();

export const PianoRollContextProvider = PianoRollContext.Provider;

export const usePianoRollContext = () => {
  const context = useContext(PianoRollContext);

  if (!context) throw new Error("No PianoRollContext found");

  return context;
};

export const splitContextProps = (allProps: PianoRollProps) =>
  splitProps(allProps, [
    "ppq",
    "mode",
    "position",
    "zoom",
    "verticalZoom",
    "verticalPosition",
    "verticalTrackZoom",
    "verticalTrackPosition",
    "gridDivision",
    "snapToGrid",
    "duration",
    "tracks",
    "selectedTrackIndex",
    "pressedKeys",
    "onPpqChange",
    "onModeChange",
    "onPositionChange",
    "onZoomChange",
    "onVerticalZoomChange",
    "onVerticalPositionChange",
    "onVerticalTrackZoomChange",
    "onVerticalTrackPositionChange",
    "onGridDivisionChange",
    "onSnapToGridChange",
    "onDurationChange",
    "onTracksChange",
    "onNoteChange",
    "onInsertNote",
    "onRemoveNote",
    "onSelectedTrackIndexChange",
    "onPressedKeysChange",
    "showAllTracks",
    "showTrackList",
  ]);
