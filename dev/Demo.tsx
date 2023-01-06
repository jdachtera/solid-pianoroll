import { Midi, MidiJSON } from "@tonejs/midi";
import {
  Component,
  createEffect,
  createResource,
  createSignal,
  Match,
  Switch,
  untrack,
} from "solid-js";
import { useNotes, usePianoRoll } from "../src";
import { GridDivision } from "src/PianoRoll";

import styles from "./Demo.module.css";
import MultiTrackDemo from "./MultiTrackDemo";
import SingleTrackDemo from "./SingleTrackDemo";

const Demo: Component = () => {
  const [demo, setDemo] = createSignal("singleTrack");

  const [url, setUrl] = createSignal("/MIDI_sample.mid");
  const [inputUrl, setInputUrl] = createSignal(untrack(() => url()));
  const [parsedMidi] = createResource(url, async (url) => {
    const midi = await Midi.fromUrl(url);
    return midi.toJSON();
  });

  const [selectedTrack, setSelectedTrack] = createSignal<MidiJSON["tracks"][number]>();

  const pianoRoll = usePianoRoll();
  const notes = useNotes();

  createEffect(() => {
    const midi = parsedMidi();
    if (!midi) return;

    pianoRoll.onPpqChange(midi.header.ppq);
    const track = midi.tracks.find(({ notes }) => notes.length);

    setSelectedTrack(track);
  });

  createEffect(() => {
    notes.onNotesChange(selectedTrack()?.notes ?? []);

    const longestTrackLength = Math.max(
      ...(parsedMidi()?.tracks.map(
        (track) =>
          (track.notes[track.notes.length - 1]?.ticks ?? 0) +
          (track.notes[track.notes.length - 1]?.durationTicks ?? 0),
      ) ?? [0]),
    );

    pianoRoll.onDurationChange(longestTrackLength);
  });

  return (
    <div class={styles.Demo}>
      <h1>Solid Pianoroll</h1>

      <nav>
        <button onClick={() => setDemo("singleTrack")}>Single Track</button>
        <button onClick={() => setDemo("multiTrack")}>Multi Track</button>
      </nav>

      <div
        style={{
          flex: 1,
          display: "flex",
          "flex-direction": "column",
          overflow: "hidden",
          padding: "16px",
          background: "#ddd",
        }}
      >
        <Switch>
          <Match when={demo() === "singleTrack"}>
            <SingleTrackDemo pianoRoll={pianoRoll} notes={notes} />
          </Match>
          <Match when={demo() === "multiTrack"}>
            <MultiTrackDemo
              pianoRoll={pianoRoll}
              tracks={parsedMidi()?.tracks ?? []}
              selectedTrack={selectedTrack()}
              onSelectedTrackChange={setSelectedTrack}
            />
          </Match>
        </Switch>
      </div>

      <div>
        <h2>Info:</h2>
        <div>
          <label>MIDI URL:</label>
          <input value={inputUrl()} onChange={(event) => setInputUrl(event.currentTarget.value)} />
          <button onClick={() => setUrl(inputUrl())}>Update</button>
        </div>
        <div>
          <label>Grid:</label>
          <select
            value={pianoRoll.gridDivision()}
            onChange={(event) => {
              const option = event.currentTarget.options[event.currentTarget.selectedIndex];
              if (!option) return;

              pianoRoll.onGridDivisionChange(+option.value as GridDivision);
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
              checked={pianoRoll.snapToGrid()}
              onChange={() => pianoRoll.onSnapToGridChange(!pianoRoll.snapToGrid())}
            />
            Snap to grid
          </label>
        </div>
      </div>
    </div>
  );
};

export default Demo;
