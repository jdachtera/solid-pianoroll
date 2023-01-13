import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import { Component, createEffect, createResource, createSignal, untrack } from "solid-js";
import { PianoRoll, PlayHead, createPianoRollstate } from "../src";
import { GridDivision } from "src/PianoRoll";

import styles from "./Demo.module.css";
import { isNumber, PolySynth, TransportTime } from "tone";

const Demo: Component = () => {
  const [url, setUrl] = createSignal("./MIDI_sample.mid");
  const [inputUrl, setInputUrl] = createSignal(untrack(() => url()));

  const [playHeadPosition, setPlayHeadPosition] = createSignal(0);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [synths, setSynths] = createSignal<PolySynth[]>();

  const [parsedMidi] = createResource(url, async (url) => {
    const midi = await Midi.fromUrl(url);
    return midi.toJSON();
  });

  const pianoRollState = createPianoRollstate();

  createEffect(() => {
    const midi = parsedMidi();
    if (!midi) return;

    transport.PPQ = midi.header.ppq ?? transport.PPQ;
    transport.bpm.value = midi.header.tempos[0]?.bpm ?? transport.bpm.value;
    pianoRollState.onPpqChange(midi.header.ppq);
    pianoRollState.onTracksChange(midi.tracks ?? []);
  });

  createEffect(() => {
    const longestTrackLength = Math.max(
      ...(pianoRollState.tracks.map(
        (track) =>
          (track.notes[track.notes.length - 1]?.ticks ?? 0) +
          (track.notes[track.notes.length - 1]?.durationTicks ?? 0),
      ) ?? [0]),
    );

    pianoRollState.onDurationChange(longestTrackLength || pianoRollState.ppq * 4);
  });
  const transport = Tone.getTransport();

  transport.stop();

  let animationFrame: number | undefined;

  const updatePlayHeadPosition = () => {
    setPlayHeadPosition(TransportTime(transport.seconds).toTicks());
    animationFrame = requestAnimationFrame(updatePlayHeadPosition);
  };

  createEffect(() => {
    if (isNumber(animationFrame)) {
      cancelAnimationFrame(animationFrame);
    }

    if (isPlaying()) {
      updatePlayHeadPosition();
    }
  });

  createEffect(() => {
    if (isPlaying()) {
      setSynths(
        parsedMidi()?.tracks.map((track) => {
          //create a synth for each track
          const synth = new Tone.PolySynth(Tone.Synth, {
            envelope: {
              attack: 0.02,
              decay: 0.1,
              sustain: 0.3,
              release: 1,
            },
          }).toDestination();

          //schedule all of the events
          track.notes.forEach((note) => {
            transport.schedule((time) => {
              synth.triggerAttackRelease(
                Tone.Midi(note.midi).toFrequency(),
                `${note.durationTicks}i`,
                time,
                note.velocity,
              );
            }, `${note.ticks}i`);
          });

          return synth;
        }) ?? [],
      );
      transport.start();
    }
  });

  createEffect(() => {
    if (!isPlaying()) {
      synths()?.forEach((synth) => {
        synth.releaseAll();
      });
      transport.cancel();
      setSynths(undefined);

      transport.pause();
    }
  });

  return (
    <div class={styles.Demo}>
      <h1>Solid Pianoroll</h1>

      <p>
        <a href="https://github.com/jdachtera/solid-pianoroll">
          https://github.com/jdachtera/solid-pianoroll
        </a>
      </p>

      <nav>
        <button onClick={() => pianoRollState.onModeChange("keys")}>Keys</button>
        <button onClick={() => pianoRollState.onModeChange("tracks")}>Tracks</button>
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
        {pianoRollState.selectedTrackIndex}
        <PianoRoll {...pianoRollState} showTrackList>
          <PlayHead playHeadPosition={playHeadPosition()} style={{ "z-index": 3 }} />
        </PianoRoll>
      </div>

      <div>
        <h2>Info:</h2>
        <div>
          <label>MIDI URL:</label>
          <input value={inputUrl()} onChange={(event) => setInputUrl(event.currentTarget.value)} />
          <button onClick={() => setUrl(inputUrl())}>Update</button>
        </div>
        <div>
          <button onClick={() => setIsPlaying(!isPlaying())}>
            {isPlaying() ? "Stop" : "Play"}
          </button>
          <label>Grid:</label>
          <select
            value={pianoRollState.gridDivision}
            onChange={(event) => {
              const option = event.currentTarget.options[event.currentTarget.selectedIndex];
              if (!option) return;

              pianoRollState.onGridDivisionChange(+option.value as GridDivision);
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
              checked={pianoRollState.snapToGrid}
              onChange={() => pianoRollState.onSnapToGridChange(!pianoRollState.snapToGrid)}
            />
            Snap to grid
          </label>
        </div>
      </div>
    </div>
  );
};

export default Demo;
