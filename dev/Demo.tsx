import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import {
  Component,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  mapArray,
  untrack,
} from "solid-js";
import { PianoRoll, PlayHead, createPianoRollstate } from "../src";
import { GridDivision } from "src/PianoRoll";

import styles from "./Demo.module.css";
import { isNumber, Time, TransportTime } from "tone";
import { Note } from "src/types";

const Demo: Component = () => {
  const [url, setUrl] = createSignal("./examples_bach_846.mid");
  const [inputUrl, setInputUrl] = createSignal(untrack(() => url()));

  const [isPlaying, setIsPlaying] = createSignal(false);
  const [syncToPlayHead, setSyncToPlayHead] = createSignal(false);
  const [showTrackList, setShowTrackList] = createSignal(true);

  const [parsedMidi] = createResource(url, async (url) => {
    const midi = await Midi.fromUrl(url);
    return midi.toJSON();
  });

  const pianoRollState = createPianoRollstate({
    onPlayHeadPositionChange: (value, originalEvent) => {
      if (originalEvent) {
        const seconds = Time(value, "i").toSeconds();
        transport.seconds = seconds;
      }
    },
  });

  const onNoteDown = (trackIndex: number, keyNumber: number) => {
    pianoRollState.onNoteDown(trackIndex, keyNumber);
    const synth = synths()?.[pianoRollState.selectedTrackIndex];

    if (synth) {
      synth.triggerAttack(Tone.Midi(keyNumber).toFrequency());
    }
  };

  const onNoteUp = (trackIndex: number, keyNumber: number) => {
    pianoRollState.onNoteUp(trackIndex, keyNumber);
    const synth = synths()?.[pianoRollState.selectedTrackIndex];

    if (synth) {
      synth.triggerRelease(Tone.Midi(keyNumber).toFrequency());
    }
  };

  const onNoteChange = (trackIndex: number, noteIndex: number, note: Note) => {
    const existingNote = pianoRollState.tracks[trackIndex]?.notes[noteIndex];
    if (existingNote) {
      parts()[trackIndex]?.remove(`${existingNote.ticks}i`, noteIndex);
      parts()[trackIndex]?.add(`${note.ticks}i`, noteIndex);
    }

    return pianoRollState.onNoteChange(trackIndex, noteIndex, note);
  };

  const onInsertNote = (trackIndex: number, note: Note) => {
    const noteIndex = pianoRollState.onInsertNote(trackIndex, note);
    parts()[trackIndex]?.add(`${note.ticks}i`, noteIndex);
    return noteIndex;
  };

  const onRemoveNote = (trackIndex: number, noteIndex: number) => {
    const existingNote = pianoRollState.tracks[trackIndex]?.notes[noteIndex];
    if (existingNote) {
      parts()[trackIndex]?.remove(`${existingNote.ticks}i`, noteIndex);
    }
    return pianoRollState.onRemoveNote(trackIndex, noteIndex);
  };

  createEffect(() => {
    const midi = parsedMidi();
    if (!midi) return;

    transport.PPQ = midi.header.ppq ?? transport.PPQ;
    transport.bpm.value = midi.header.tempos[0]?.bpm ?? transport.bpm.value;
    pianoRollState.onPpqChange(midi.header.ppq);
    pianoRollState.onTracksChange(
      [...(midi.tracks ?? [])].map((track, index) => ({
        ...track,
        color: stringToColor(track.name + index),
      })),
    );
  });

  const numberOfTracks = createMemo(() => pianoRollState.tracks.length);

  const synths = mapArray(
    () => Array.from({ length: numberOfTracks() }),
    () => {
      return new Tone.PolySynth(Tone.Synth, {
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 1,
        },
      }).toDestination();
    },
  );

  const parts = mapArray(
    () => Array.from({ length: numberOfTracks() }),
    (_, trackIndex) => {
      const synth = synths()?.[trackIndex()];

      if (!synth) return;

      return new Tone.Part(
        (time, noteIndex) => {
          const note = untrack(() => pianoRollState.tracks?.[trackIndex()]?.notes[noteIndex]);
          if (!note) return;

          Tone.Draw.schedule(() => pianoRollState.onNoteDown(trackIndex(), note.midi), time);

          synth.triggerAttackRelease(
            Tone.Midi(note.midi).toFrequency(),
            `${note.durationTicks}i`,
            time,
            note.velocity,
          );

          Tone.Draw.schedule(
            () => pianoRollState.onNoteUp(trackIndex(), note.midi),
            time + Time(`${note.durationTicks}i`).toSeconds(),
          );
        },
        untrack(() => pianoRollState.tracks?.[trackIndex()]?.notes ?? []).map(
          (note, index) => [`${note.ticks}i`, index] as [string, number],
        ),
      ).start();
    },
  );

  createEffect(() => {
    parts().forEach((part) => part?.start());
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

  let previousPlayheadPosition = 0;

  const updatePlayHeadPosition = () => {
    if (pianoRollState.playHeadPosition === previousPlayheadPosition) {
      pianoRollState.onPlayHeadPositionChange(TransportTime(transport.seconds).toTicks());
    }
    previousPlayheadPosition = pianoRollState.playHeadPosition;
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
      transport.start();
    } else {
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
        <PianoRoll
          {...pianoRollState}
          onNoteUp={onNoteUp}
          onNoteDown={onNoteDown}
          onInsertNote={onInsertNote}
          onNoteChange={onNoteChange}
          onRemoveNote={onRemoveNote}
          showTrackList={showTrackList()}
        >
          <PlayHead
            style={{ "z-index": 3 }}
            sync={syncToPlayHead()}
            position={pianoRollState.playHeadPosition}
            onPositionChange={pianoRollState.onPlayHeadPositionChange}
          />
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
          <label>
            <input
              type="checkbox"
              checked={syncToPlayHead()}
              onChange={() => setSyncToPlayHead(!syncToPlayHead())}
            />
            Sync to playback position
          </label>
          <label>
            <input
              type="checkbox"
              checked={showTrackList()}
              onChange={() => setShowTrackList(!showTrackList())}
            />
            Show Track List
          </label>
        </div>
      </div>
    </div>
  );
};

const stringToColor = function (str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += ("00" + value.toString(16)).substr(-2);
  }
  return colour;
};

export default Demo;
