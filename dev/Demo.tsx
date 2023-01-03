import { Component, createEffect, createResource, createSignal, Index, untrack } from "solid-js";

import styles from "./Demo.module.css";
import { PianoRoll, usePianoRoll } from "../src";
import { Midi, MidiJSON } from "@tonejs/midi";
import { GridDivision } from "src/PianoRoll";

const Demo: Component = () => {
  const audioCtx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: AudioContext }).webkitAudioContext)();

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
  const [parsedMidi] = createResource(url, async (url) => {
    const midi = await Midi.fromUrl(url);
    return midi.toJSON();
  });

  const [selectedTrack, setSelectedTrack] = createSignal<MidiJSON["tracks"][number]>();

  const pianoRoll = usePianoRoll();

  createEffect(() => {
    const midi = parsedMidi();
    if (!midi) return;

    pianoRoll.onPpqChange(midi.header.ppq);
    const track = midi.tracks.find(({ notes }) => notes.length);

    setSelectedTrack(track);
  });

  createEffect(() => {
    pianoRoll.onNotesChange(selectedTrack()?.notes ?? []);

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

      <div style={{ flex: 1, display: "flex", "flex-direction": "row", overflow: "hidden" }}>
        <div style={{ "max-width": "300px" }}>
          <ul style={{ "margin-block": 0, "padding-inline": 0, margin: " 0 10px" }}>
            <Index each={parsedMidi()?.tracks}>
              {(track) => (
                <li
                  style={{
                    "list-style": "none",
                    padding: "5px",
                    margin: 0,
                    cursor: "pointer",
                    background: track() === selectedTrack() ? "lightgray" : "none",
                  }}
                  onClick={() => setSelectedTrack(track())}
                >
                  Channel {track().channel}: {track().name}
                </li>
              )}
            </Index>
          </ul>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            "flex-direction": "column",
            overflow: "hidden",
          }}
        >
          <div style={{ background: "gray", flex: 1, position: "relative", overflow: "hidden" }}>
            <PianoRoll
              style={{ height: "100%" }}
              gridDivision={pianoRoll.gridDivision()}
              snapToGrid={pianoRoll.snapToGrid()}
              notes={pianoRoll.notes()}
              ppq={pianoRoll.ppq()}
              duration={pianoRoll.duration()}
              position={pianoRoll.position()}
              verticalPosition={pianoRoll.verticalPosition()}
              verticalZoom={pianoRoll.verticalZoom()}
              zoom={pianoRoll.zoom()}
              onPositionChange={pianoRoll.onPositionChange}
              onZoomChange={pianoRoll.onZoomChange}
              onVerticalZoomChange={pianoRoll.onVerticalZoomChange}
              onVerticalPositionChange={pianoRoll.onVerticalPositionChange}
              onNoteChange={pianoRoll.onNoteChange}
              onInsertNote={pianoRoll.onInsertNote}
              onRemoveNote={pianoRoll.onRemoveNote}
            />
            ;
          </div>
        </div>
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
