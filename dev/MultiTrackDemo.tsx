import { TrackJSON } from "@tonejs/midi";
import { MultiTrackPianoRoll, usePianoRoll } from "../src";

const audioCtx = new (window.AudioContext ||
  (window as unknown as { webkitAudioContext: AudioContext }).webkitAudioContext)();
const gainNode = new GainNode(audioCtx, { gain: 0.5 });
const analyser = new AnalyserNode(audioCtx, { smoothingTimeConstant: 1, fftSize: 2048 });

gainNode.connect(analyser);
analyser.connect(audioCtx.destination);

const MultiTrackDemo = (props: {
  tracks: TrackJSON[];
  selectedTrack?: TrackJSON;
  onSelectedTrackChange: (track: TrackJSON | undefined) => void;
  pianoRoll: ReturnType<typeof usePianoRoll>;
}) => {
  return (
    <>
      <h2>Multi Track Mode</h2>

      <MultiTrackPianoRoll
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
        tracks={props.tracks ?? []}
        selectedTrack={props.selectedTrack}
        onSelectedTrackChange={props.onSelectedTrackChange}
      />
    </>
  );
};

export default MultiTrackDemo;
