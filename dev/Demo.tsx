import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import { Component, createEffect, createResource, createSignal, untrack } from "solid-js";
import { PianoRoll, PlayHead, usePianoRoll } from "../src";
import { GridDivision } from "src/PianoRoll";

import styles from "./Demo.module.css";
import { isNumber, PolySynth, TransportTime } from "tone";
import { Note, Track } from "src/types";

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

  const [tracks, setTracks] = createSignal<Track[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = createSignal<number>(0);

  const pianoRoll = usePianoRoll();

  createEffect(() => {
    const midi = parsedMidi();
    if (!midi) return;

    transport.PPQ = midi.header.ppq ?? transport.PPQ;
    transport.bpm.value = midi.header.tempos[0]?.bpm ?? transport.bpm.value;
    pianoRoll.onPpqChange(midi.header.ppq);

    setTracks(midi.tracks ?? []);
  });

  const updateNotes = async (trackIndex: number, getNotes: (notes: Note[]) => Note[]) => {
    const track = tracks()[trackIndex];
    if (!track) return;

    const notes = track.notes;

    setTracks([
      ...tracks().slice(0, trackIndex),
      { ...track, notes: getNotes(notes) },
      ...tracks().slice(trackIndex + 1),
    ]);
  };

  const onNoteChange = (trackIndex: number, noteIndex: number, note: Note) => {
    updateNotes(trackIndex, (notes) => [
      ...notes.slice(0, noteIndex),
      note,
      ...notes.slice(noteIndex + 1),
    ]);
  };

  const onInsertNote = (trackIndex: number, note: Note) => {
    const track = tracks()[trackIndex];
    if (!track) return -1;

    const notes = track.notes;

    const newNoteIndex = Math.max(
      notes.findIndex(({ ticks }) => ticks > note.ticks),
      0,
    );

    updateNotes(trackIndex, (notes) => [
      ...notes.slice(0, newNoteIndex),
      note,
      ...notes.slice(newNoteIndex),
    ]);

    return newNoteIndex;
  };

  const onRemoveNote = (trackIndex: number, noteIndex: number) => {
    updateNotes(trackIndex, (notes) => [
      ...notes.slice(0, noteIndex),
      ...notes.slice(noteIndex + 1),
    ]);
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

      <p>
        <a href="https://github.com/jdachtera/solid-pianoroll">
          https://github.com/jdachtera/solid-pianoroll
        </a>
      </p>

      <nav>
        <button onClick={() => pianoRoll.onModeChange("keys")}>Keys</button>
        <button onClick={() => pianoRoll.onModeChange("tracks")}>Tracks</button>
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
        {selectedTrackIndex()}
        <PianoRoll
          style={{ flex: 1, "border-top": "1px gray solid" }}
          gridDivision={pianoRoll.gridDivision()}
          snapToGrid={pianoRoll.snapToGrid()}
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
          tracks={tracks()}
          selectedTrackIndex={selectedTrackIndex()}
          onSelectedTrackIndexChange={setSelectedTrackIndex}
          onNoteChange={onNoteChange}
          onInsertNote={onInsertNote}
          onRemoveNote={onRemoveNote}
          mode={pianoRoll.mode()}
          showAllTracks={false}
          showTrackList
        >
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
