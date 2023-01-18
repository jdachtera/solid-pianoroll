import { createContext, splitProps, useContext } from "solid-js";

import { PianoRollProps } from "./PianoRoll";
import createPianoRollstate, { pianoRollStatePropNames } from "./usePianoRollState";

export type PianoRollContext = {
  showAllTracks?: boolean;
  showTrackList?: boolean;
} & ReturnType<typeof createPianoRollstate>;

const PianoRollContext = createContext<PianoRollContext>();

export const PianoRollContextProvider = PianoRollContext.Provider;

export const usePianoRollContext = () => {
  const context = useContext(PianoRollContext);

  if (!context) throw new Error("No PianoRollContext found");

  return context;
};

export const splitContextProps = (allProps: PianoRollProps) =>
  splitProps(allProps, [...pianoRollStatePropNames, "showAllTracks", "showTrackList"]);
