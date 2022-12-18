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
    </div>
  );
};

export default Demo;
