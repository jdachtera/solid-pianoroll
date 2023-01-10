import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import {
  Component,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Match,
  Switch,
  untrack,
} from "solid-js";
import { usePianoRoll } from "../src";
import { GridDivision } from "src/PianoRoll";

import styles from "./Demo.module.css";
import SingleTrackDemo from "./SingleTrackDemo";
import { isNumber, PolySynth, TransportTime } from "tone";
import { Note, Track } from "src/types";
import MultiTrackDemo from "./MultiTrackDemo";

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

  const [tracks, setTracks] = createSignal<Track[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = createSignal<number>(-1);
  const selectedTrack = createMemo(() => tracks()[selectedTrackIndex()]);

  const pianoRoll = usePianoRoll();

  createEffect(() => {
    const midi = parsedMidi();
    if (!midi) return;

    transport.PPQ = midi.header.ppq ?? transport.PPQ;
    transport.bpm.value = midi.header.tempos[0]?.bpm ?? transport.bpm.value;
    pianoRoll.onPpqChange(midi.header.ppq);

    setTracks(midi.tracks ?? []);
  });

  const updateNotes = (trackIndex: number, getNotes: (notes: Note[]) => Note[]) => {
    setTracks((allTracks) => {
      const track = allTracks[trackIndex];
      if (!track) return allTracks;

      const notes = track.notes;
      return [
        ...allTracks.slice(0, trackIndex),
        { ...track, notes: getNotes(notes) },
        ...allTracks.slice(trackIndex + 1),
      ];
    });
  };

  const onNoteChange = (trackIndex: number, noteIndex: number, note: Note) => {
    updateNotes(trackIndex, (notes) => [
      ...notes.slice(0, noteIndex),
      note,
      ...notes.splice(noteIndex + 1),
    ]);
  };

  const onInsertNote = (trackIndex: number, note: Note) => {
    const track = tracks()[trackIndex];
    if (!track) return -1;

    const notes = track.notes;

    const index = Math.max(
      notes.findIndex(({ ticks }) => ticks > note.ticks),
      0,
    );

    updateNotes(trackIndex, (notes) => {
      return [...notes.slice(0, index), note, ...notes.splice(index)];
    });

    return index;
  };

  const onRemoveNote = (trackIndex: number, index: number) => {
    updateNotes(trackIndex, (notes) => [...notes.slice(0, index), ...notes.splice(index + 1)]);
  };

  createEffect(() => {
    const longestTrackLength = Math.max(
      ...(tracks().map(
        (track) =>
          (track.notes[track.notes.length - 1]?.ticks ?? 0) +
          (track.notes[track.notes.length - 1]?.durationTicks ?? 0),
      ) ?? [0]),
    );

    pianoRoll.onDurationChange(longestTrackLength || pianoRoll.ppq() * 4);
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
              notes={selectedTrack()?.notes ?? []}
              playHeadPosition={playHeadPosition()}
              onInsertNote={(note) => {
                const trackIndex = selectedTrackIndex();
                return onInsertNote(trackIndex, note);
              }}
              onNoteChange={(index, note) => {
                const trackIndex = selectedTrackIndex();
                return onNoteChange(trackIndex, index, note);
              }}
              onRemoveNote={(index) => {
                const trackIndex = selectedTrackIndex();
                return onRemoveNote(trackIndex, index);
              }}
            />
          </Match>
          <Match when={demo() === "multiTrack"}>
            <MultiTrackDemo
              pianoRoll={pianoRoll}
              tracks={tracks() ?? []}
              selectedTrackIndex={selectedTrackIndex()}
              onSelectedTrackIndexChange={setSelectedTrackIndex}
              onInsertNote={onInsertNote}
              onNoteChange={onNoteChange}
              onRemoveNote={onRemoveNote}
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
