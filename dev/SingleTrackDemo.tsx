import { Note } from "src/types";
import { PianoRoll, PlayHead, usePianoRoll } from "../src";

const SingleTrackDemo = (props: {
  notes: Note[];
  pianoRoll: ReturnType<typeof usePianoRoll>;
  playHeadPosition?: number;
  onNoteChange?: (index: number, note: Note) => void;
  onInsertNote?: (note: Note) => number;
  onRemoveNote?: (index: number) => void;
}) => {
  return (
    <>
      <h2>Single track</h2>

      <PianoRoll
        style={{ flex: 1, "border-top": "1px gray solid" }}
        gridDivision={props.pianoRoll.gridDivision()}
        snapToGrid={props.pianoRoll.snapToGrid()}
        ppq={props.pianoRoll.ppq()}
        duration={props.pianoRoll.duration()}
        position={props.pianoRoll.position()}
        verticalPosition={props.pianoRoll.verticalPosition()}
        verticalZoom={props.pianoRoll.verticalZoom()}
        zoom={props.pianoRoll.zoom()}
        onPositionChange={props.pianoRoll.onPositionChange}
        onZoomChange={props.pianoRoll.onZoomChange}
        onVerticalZoomChange={props.pianoRoll.onVerticalZoomChange}
        onVerticalPositionChange={props.pianoRoll.onVerticalPositionChange}
        notes={props.notes}
        onNoteChange={props.onNoteChange}
        onInsertNote={props.onInsertNote}
        onRemoveNote={props.onRemoveNote}
        condensed={props.pianoRoll.condensed()}
      >
        <PlayHead playHeadPosition={props.playHeadPosition} style={{ "z-index": 3 }} />
      </PianoRoll>
    </>
  );
};

export default SingleTrackDemo;
