import { createContext, useContext } from "solid-js";

import { PianoRollProps } from "./PianoRoll";

const PianoRollContext = createContext<PianoRollProps>();

export const PianoRollContextProvider = PianoRollContext.Provider;

export const usePianoRollContext = () => {
  const context = useContext(PianoRollContext);

  if (!context) throw new Error("No PianoRollContext found");

  return context;
};
