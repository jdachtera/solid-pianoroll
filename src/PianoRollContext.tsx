import { createContext, JSX, splitProps, useContext } from "solid-js";

import { PianoRollProps } from "./PianoRoll";

const PianoRollContext = createContext<PianoRollProps>();

export const PianoRollContextProvider = PianoRollContext.Provider;

export const usePianoRollContext = () => {
  const context = useContext(PianoRollContext);

  if (!context) throw new Error("No PianoRollContext found");

  return context;
};

export const splitContextProps = (allProps: PianoRollProps & JSX.IntrinsicElements["div"]) =>
  splitProps(allProps, [
    "mode",
    "duration",
    "gridDivision",
    "tracks",
    "position",
    "ppq",
    "snapToGrid",
    "verticalPosition",
    "verticalZoom",
    "zoom",
    "onInsertNote",
    "onNoteChange",
    "onPositionChange",
    "onRemoveNote",
    "onVerticalPositionChange",
    "onVerticalZoomChange",
    "onZoomChange",
    "showAllTracks",
    "selectedTrackIndex",
    "onSelectedTrackIndexChange",
  ]);
