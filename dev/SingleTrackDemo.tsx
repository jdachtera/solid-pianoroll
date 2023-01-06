import { PianoRoll, useNotes, usePianoRoll } from "../src";

const SingleTrackDemo = (props: {
  notes: ReturnType<typeof useNotes>;
  pianoRoll: ReturnType<typeof usePianoRoll>;
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
        notes={props.notes.notes()}
        onNoteChange={props.notes.onNoteChange}
        onInsertNote={props.notes.onInsertNote}
        onRemoveNote={props.notes.onRemoveNote}
        condensed={props.pianoRoll.condensed()}
      />
    </>
  );
};

export default SingleTrackDemo;
