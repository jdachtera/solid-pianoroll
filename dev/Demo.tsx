import { Midi, MidiJSON, TrackJSON } from "@tonejs/midi";
import * as Tone from "tone";
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
import { isNumber, PolySynth, TransportTime } from "tone";

const Demo: Component = () => {
  const [demo, setDemo] = createSignal("singleTrack");

  const [url, setUrl] = createSignal("./examples_bach_846.mid");
  const [inputUrl, setInputUrl] = createSignal(untrack(() => url()));

  const [playHeadPosition, setPlayHeadPosition] = createSignal(0);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [synths, setSynths] = createSignal<PolySynth[]>();

  const [parsedMidi] = createResource(url, async (url) => {
    const midi = await Midi.fromUrl(url);
    return midi.toJSON();
  });

  const [tracks, setTracks] = createSignal<TrackJSON[]>();

  createEffect(() => {
    setTracks(parsedMidi()?.tracks);
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
  const transport = Tone.getTransport();

  transport.stop();

  createEffect(() => {
    transport.PPQ = parsedMidi()?.header.ppq ?? transport.PPQ;
    transport.bpm.value = parsedMidi()?.header.tempos[0]?.bpm ?? transport.bpm.value;
  });

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
            <SingleTrackDemo
              pianoRoll={pianoRoll}
              notes={notes}
              playHeadPosition={playHeadPosition()}
            />
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
          <button onClick={() => setIsPlaying(!isPlaying())}>
            {isPlaying() ? "Stop" : "Play"}
          </button>
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
