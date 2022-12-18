import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  splitProps,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";

import { PianoRollProps } from "./PianoRoll";
import useBoundingClientRect, { ClientRect } from "./useBoundingClientRect";
import useViewPortScaler, { ViewPortScaler } from "./useViewPortScaler";

export type NoteDragMode = "trimStart" | "move" | "trimEnd" | undefined;
type PianoRollContext = {
  horizontalViewPort: ViewPortScaler;
  verticalViewPort: ViewPortScaler;
  clientRect: ClientRect;

  notesContainer?: HTMLDivElement;

  isDragging: boolean;
  onIsDraggingChange: (isDragging: boolean) => void;

  noteDragMode: NoteDragMode;
  onNoteDragModeChange: (isDragging: NoteDragMode) => void;
} & PianoRollProps;

const PianoRollContext = createContext<PianoRollContext>(undefined!);

export const PianoRollContextProvider = (
  props: {
    scrollContainer?: HTMLDivElement;
    notesContainer?: HTMLDivElement;

    children: JSX.Element;
  } & PianoRollProps,
) => {
  const [noteDragMode, setNoteDragMode] = createSignal<NoteDragMode>();
  const [isDragging, setIsDragging] = createSignal(false);

  const [_ownProps, contextProps] = splitProps(props, ["children", "scrollContainer"]);
  const clientRect = useBoundingClientRect(() => props.scrollContainer);

  const horizontalViewPort = useViewPortScaler(() => ({
    viewPortOffset: clientRect().left,
    viewPortSize: clientRect().width,

    virtualPosition: props.position,
    virtualRange: props.duration,
    zoom: props.zoom,
  }));

  const verticalViewPort = useViewPortScaler(() => ({
    viewPortOffset: clientRect().top,
    viewPortSize: clientRect().height,

    virtualPosition: props.verticalPosition,
    zoom: props.verticalZoom,

    virtualRange: 128,
  }));

  const getContextValue = () => {
    return {
      ...contextProps,
      horizontalViewPort,
      verticalViewPort,
      clientRect: clientRect(),

      isDragging: isDragging(),
      onIsDraggingChange: setIsDragging,

      noteDragMode: noteDragMode(),
      onNoteDragModeChange: setNoteDragMode,
    };
  };

  const [contextValue, setContextValue] = createStore<PianoRollContext>(getContextValue());

  createEffect(() => {
    setContextValue(getContextValue());
  });

  return (
    <PianoRollContext.Provider value={contextValue}>{props.children}</PianoRollContext.Provider>
  );
};

export const usePianoRollContext = () => {
  const context = useContext(PianoRollContext);

  if (!context) throw new Error("No PianoRollContext found");

  return context;
};
