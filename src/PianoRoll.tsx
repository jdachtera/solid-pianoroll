import styles from "./PianoRoll.module.css";
import { Midi } from "@tonejs/midi";

import { JSX, splitProps, createSignal } from "solid-js";
import HorizontalZoomControl from "./HorizontalZoomControl";

import { PianoRollContextProvider } from "./PianoRollContext";
import PianoRollKeys from "./PianoRollKeys";
import PianoRollNotes from "./PianoRollNotes";
import ScrollContainer from "./ScrollContainer";
import VerticalZoomControl from "./VerticalZoomControl";

type Note = Pick<
  ReturnType<Midi["tracks"][number]["notes"][number]["toJSON"]>,
  "durationTicks" | "midi" | "ticks" | "velocity"
>;

export type PianoRollProps = {
  ppq: number;
  notes: Note[];

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
  ]);

  const [scrollContainer, setScrollContainer] = createSignal<HTMLDivElement>();
  const [notesContainer, setNotesContainer] = createSignal<HTMLDivElement>();

  return (
    <PianoRollContextProvider
      {...contextProps}
      scrollContainer={scrollContainer()}
      notesContainer={notesContainer()}
    >
      <div {...divProps} class={styles.PianoRoll}>
        <div class={styles.PianoRollContainer}>
          <PianoRollKeys />

          <div class={styles.PianoRollInnerContainer}>
            <PianoRollNotes ref={setNotesContainer} />
            <ScrollContainer ref={setScrollContainer} />
          </div>

          <VerticalZoomControl />
        </div>

        <HorizontalZoomControl />
      </div>
    </PianoRollContextProvider>
  );
};

export default PianoRoll;
