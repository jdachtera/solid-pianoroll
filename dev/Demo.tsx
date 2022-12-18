import {
  Component,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Show,
  untrack,
} from "solid-js";

import styles from "./App.module.css";
import { PianoRoll } from "../src";
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

  const [position, setPosition] = createSignal(0);

  const [zoom, setZoom] = createSignal(10);
  const [verticalZoom, setVerticalZoom] = createSignal(5);
  const [verticalPosition, setVerticalPosition] = createSignal(64);

  const [parsedMidi] = createResource(url, (url) => Midi.fromUrl(url));

  const track = createMemo(() => parsedMidi()?.toJSON().tracks[1]);

  const [notes, setNotes] = createSignal<Note[]>([]);
  const [duration, setDuration] = createSignal(0);

  const [gridDivision, setGridDivision] = createSignal<GridDivision>(16);
  const [snapToGrid, setSnapToGrid] = createSignal(true);

  createEffect(() => {
    setNotes(track()?.notes ?? []);
  });

  createEffect(() => {
    setDuration(
      (notes()[notes().length - 1]?.ticks ?? 0) + (notes()[notes().length - 1]?.durationTicks ?? 0),
    );
  });

  return (
    <div class={styles.App}>
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
                const index = notes().findIndex(({ ticks }) => ticks > note.ticks);
                setNotes([...notes().slice(0, index), note, ...notes().splice(index)]);
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
            console.log(event.currentTarget.options[event.currentTarget.selectedIndex]);
            setGridDivision(
              +event.currentTarget.options[event.currentTarget.selectedIndex].value as GridDivision,
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
