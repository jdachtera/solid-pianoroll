import {
  Component,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Show,
  untrack,
} from "solid-js";

import styles from "./Demo.module.css";
import { PianoRoll, usePianoRoll } from "../src";
import { Midi } from "@tonejs/midi";
import { GridDivision } from "src/PianoRoll";

type Note = Pick<
  ReturnType<Midi["tracks"][number]["notes"][number]["toJSON"]>,
  "durationTicks" | "midi" | "ticks" | "velocity"
>;

const Demo: Component = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  const gainNode = new GainNode(audioCtx, {
    gain: 0.5,
  });

  const analyser = new AnalyserNode(audioCtx, {
    smoothingTimeConstant: 1,
    fftSize: 2048,
  });

  gainNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  const [url, setUrl] = createSignal("/MIDI_sample.mid");
  const [inputUrl, setInputUrl] = createSignal(untrack(() => url()));
  const [parsedMidi] = createResource(url, (url) => Midi.fromUrl(url));
  const track = createMemo(() => parsedMidi()?.toJSON().tracks[1]);

  const {
    position,
    setPosition,

    zoom,
    setZoom,

    verticalPosition,
    setVerticalPosition,

    verticalZoom,
    setVerticalZoom,

    gridDivision,
    setGridDivision,

    snapToGrid,
    setSnapToGrid,

    notes,
    setNotes,

    duration,
  } = usePianoRoll();

  createEffect(() => {
    setNotes(track()?.notes ?? []);
  });

  return (
    <div class={styles.Demo}>
      <h1>Solid Pianoroll</h1>
      <Show when={track()}>
        {() => {
          if (!track()) return;
          return (
            <PianoRoll
              style={{
                height: "500px",
              }}
              gridDivision={gridDivision()}
              snapToGrid={snapToGrid()}
              notes={notes()}
              ppq={parsedMidi()!.header.ppq}
              duration={duration()}
              position={position()}
              verticalPosition={verticalPosition()}
              verticalZoom={verticalZoom()}
              zoom={zoom()}
              onPositionChange={setPosition}
              onZoomChange={setZoom}
              onVerticalZoomChange={setVerticalZoom}
              onVerticalPositionChange={setVerticalPosition}
              onNoteChange={(index, note) => {
                setNotes([...notes().slice(0, index), note, ...notes().splice(index + 1)]);
              }}
              onInsertNote={(note) => {
                const index = Math.max(
                  notes().findIndex(({ ticks }) => ticks > note.ticks),
                  0,
                );
                setNotes([...notes().slice(0, index), note, ...notes().splice(index)]);
                return index;
              }}
              onRemoveNote={(index) => {
                setNotes([...notes().slice(0, index), ...notes().splice(index + 1)]);
              }}
            />
          );
        }}
      </Show>

      <h2>Info:</h2>
      <div>
        <label>MIDI URL:</label>
        <input value={inputUrl()} onChange={(event) => setInputUrl(event.currentTarget.value)} />
        <button onClick={() => setUrl(inputUrl())}>Update</button>
      </div>
      <div>
        <label>Grid:</label>
        <select
          value={gridDivision()}
          onChange={(event) => {
            setGridDivision(
              +event.currentTarget.options[event.currentTarget.selectedIndex]!
                .value as GridDivision,
            );
          }}
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="4">4</option>
          <option value="8">8</option>
          <option value="16">16</option>
          <option value="32">32</option>
          <option value="64">64</option>
        </select>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={snapToGrid()}
            onChange={() => setSnapToGrid(!snapToGrid())}
          />
          Snap to grid
        </label>
      </div>
    </div>
  );
};

export default Demo;
