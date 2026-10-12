import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import {
  Component,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Index,
  mapArray,
  Show,
  untrack,
} from "solid-js";
import { PianoRoll, PlayHead, createPianoRollstate, Note, GridDivision } from "../src";

import styles from "./Demo.module.css";
import { isNumber, Time, TransportTime } from "tone";

const EXAMPLES = [
  { label: "Bach — Prelude in C (BWV 846)", url: "./examples_bach_846.mid" },
  { label: "MIDI sample", url: "./MIDI_sample.mid" },
];

const GRID_DIVISIONS: GridDivision[] = [1, 2, 4, 8, 16, 32, 64];

type Theme = "dark" | "classic";

const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${m}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
};

const Demo: Component = () => {
  const [source, setSource] = createSignal<string | File>(EXAMPLES[0]!.url);
  const [inputUrl, setInputUrl] = createSignal(EXAMPLES[0]!.url);

  const [isPlaying, setIsPlaying] = createSignal(false);
  const [syncToPlayHead, setSyncToPlayHead] = createSignal(false);
  const [showTrackList, setShowTrackList] = createSignal(true);
  const [readOnly, setReadOnly] = createSignal(false);
  const [theme, setTheme] = createSignal<Theme>("dark");

  const [parsedMidi] = createResource(source, async (source) => {
    const midi =
      typeof source === "string"
        ? await Midi.fromUrl(source)
        : new Midi(await source.arrayBuffer());
    return midi.toJSON();
  });

  const sourceName = () => {
    const current = source();
    if (typeof current !== "string") return current.name;
    return EXAMPLES.find(({ url }) => url === current)?.label ?? current.split("/").pop();
  };

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
      void Tone.start();
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

  const [bpm, setBpm] = createSignal(120);
  const [beatsPerBar, setBeatsPerBar] = createSignal(4);

  createEffect(() => {
    const midi = parsedMidi();
    if (!midi) return;

    transport.PPQ = midi.header.ppq ?? transport.PPQ;
    transport.bpm.value = midi.header.tempos[0]?.bpm ?? transport.bpm.value;
    setBpm(transport.bpm.value);
    setBeatsPerBar(midi.header.timeSignatures[0]?.timeSignature[0] ?? 4);
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

  const togglePlay = async () => {
    // Browsers keep the audio context suspended until a user gesture resumes it.
    await Tone.start();
    setIsPlaying(!isPlaying());
  };

  const rewind = () => {
    setIsPlaying(false);
    transport.stop();
    transport.seconds = 0;
    previousPlayheadPosition = 0;
    pianoRollState.onPlayHeadPositionChange(0);
  };

  const ppq = () => pianoRollState.ppq || 480;

  // bar.beat.sixteenth, all 1-based, the way a DAW counts.
  const barsBeats = (ticks: number) => {
    const beats = ticks / ppq();
    const bar = Math.floor(beats / beatsPerBar()) + 1;
    const beat = Math.floor(beats % beatsPerBar()) + 1;
    const sixteenth = Math.floor((beats % 1) * 4) + 1;
    return `${bar}.${beat}.${sixteenth}`;
  };

  const ticksToSeconds = (ticks: number) => (ticks / ppq()) * (60 / bpm());

  const totalNotes = () =>
    pianoRollState.tracks.reduce((sum, track) => sum + track.notes.length, 0);

  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <h1 class={styles.title}>Solid Pianoroll</h1>
        <p class={styles.subtitle}>
          Editable, zoomable piano roll & MIDI note editor for SolidJS.
        </p>
      </header>

      <div class={styles.board}>
        <div class={styles.boardMain}>
          <div class={`${styles.panel} ${styles.panelRoll}`}>
            <div class={styles.panelHead}>
              <span class={styles.panelTitle}>{sourceName()}</span>
              <span class={styles.panelMeta}>
                <span class={styles.time}>{barsBeats(pianoRollState.playHeadPosition)}</span>
                <span class={styles.metaSep}>·</span>
                <span class={styles.time}>
                  {fmtTime(ticksToSeconds(pianoRollState.playHeadPosition))}
                </span>
                <span class={styles.metaSep}>/</span>
                <span class={styles.timeMuted}>
                  {fmtTime(ticksToSeconds(pianoRollState.duration))}
                </span>
              </span>
            </div>
            <div
              class={styles.stage}
              classList={{ [styles.themeDark]: theme() === "dark" }}
            >
              <Show
                when={!parsedMidi.error}
                fallback={<div class={styles.stagePlaceholder}>Failed to load MIDI file</div>}
              >
                <PianoRoll
                  {...pianoRollState}
                  onNoteUp={onNoteUp}
                  onNoteDown={onNoteDown}
                  onInsertNote={onInsertNote}
                  onNoteChange={onNoteChange}
                  onRemoveNote={onRemoveNote}
                  showTrackList={showTrackList()}
                  readOnly={readOnly()}
                >
                  <PlayHead
                    style={{ "z-index": 3 }}
                    sync={syncToPlayHead()}
                    position={pianoRollState.playHeadPosition}
                    onPositionChange={pianoRollState.onPlayHeadPositionChange}
                  />
                </PianoRoll>
              </Show>
            </div>
          </div>
        </div>

        <div class={styles.boardSide}>
          <div class={styles.panel}>
            <h2 class={styles.sectionTitle}>Controls</h2>

            <div class={styles.transport}>
              <button class={`${styles.button} ${styles.primary}`} onClick={togglePlay}>
                {isPlaying() ? "⏸ Pause" : "▶ Play"}
              </button>
              <button class={styles.iconButton} title="Back to start" onClick={rewind}>
                ⏮
              </button>
              <div class={styles.transportTime}>
                <span class={styles.time}>{barsBeats(pianoRollState.playHeadPosition)}</span>
                <span class={styles.metaSep}>·</span>
                <span class={styles.timeMuted}>{Math.round(bpm())} BPM</span>
              </div>
            </div>

            <div class={styles.controls}>
              <div class={styles.control} style={{ "grid-column": "1 / -1" }}>
                <label>MIDI file</label>
                <select
                  value={typeof source() === "string" ? (source() as string) : ""}
                  onChange={(event) => {
                    const url = event.currentTarget.value;
                    if (!url) return;
                    rewind();
                    setInputUrl(url);
                    setSource(url);
                  }}
                >
                  <For each={EXAMPLES}>
                    {(example) => <option value={example.url}>{example.label}</option>}
                  </For>
                  <Show when={!EXAMPLES.some(({ url }) => url === source())}>
                    <option value="">{sourceName()}</option>
                  </Show>
                </select>
              </div>

              <div class={`${styles.control} ${styles.urlRow}`} style={{ "grid-column": "1 / -1" }}>
                <input
                  value={inputUrl()}
                  onChange={(event) => setInputUrl(event.currentTarget.value)}
                  placeholder="MIDI URL"
                />
                <button
                  class={styles.button}
                  onClick={() => {
                    rewind();
                    setSource(inputUrl());
                  }}
                >
                  Load
                </button>
              </div>

              <label class={`${styles.button} ${styles.fileButton}`} style={{ "grid-column": "1 / -1" }}>
                Open .mid file…
                <input
                  type="file"
                  accept=".mid,.midi,audio/midi"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (!file) return;
                    rewind();
                    setSource(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <div class={styles.control} style={{ "grid-column": "1 / -1" }}>
                <label>Grid — 1/{pianoRollState.gridDivision}</label>
                <div class={styles.segmented}>
                  <For each={GRID_DIVISIONS}>
                    {(division) => (
                      <button
                        class={`${styles.seg} ${
                          pianoRollState.gridDivision === division ? styles.segActive : ""
                        }`}
                        onClick={() => pianoRollState.onGridDivisionChange(division)}
                      >
                        {division}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <div class={styles.control}>
                <label>View</label>
                <div class={styles.segmented}>
                  <button
                    class={`${styles.seg} ${pianoRollState.mode === "keys" ? styles.segActive : ""}`}
                    onClick={() => pianoRollState.onModeChange("keys")}
                  >
                    Keys
                  </button>
                  <button
                    class={`${styles.seg} ${
                      pianoRollState.mode === "tracks" ? styles.segActive : ""
                    }`}
                    onClick={() => pianoRollState.onModeChange("tracks")}
                  >
                    Tracks
                  </button>
                </div>
              </div>

              <div class={styles.control}>
                <label>Theme</label>
                <div class={styles.segmented}>
                  <button
                    class={`${styles.seg} ${theme() === "dark" ? styles.segActive : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    Dark
                  </button>
                  <button
                    class={`${styles.seg} ${theme() === "classic" ? styles.segActive : ""}`}
                    onClick={() => setTheme("classic")}
                  >
                    Classic
                  </button>
                </div>
              </div>

              <div class={styles.checks}>
                <label class={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={pianoRollState.snapToGrid}
                    onChange={() => pianoRollState.onSnapToGridChange(!pianoRollState.snapToGrid)}
                  />
                  Snap to grid
                </label>
                <label class={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={syncToPlayHead()}
                    onChange={() => setSyncToPlayHead(!syncToPlayHead())}
                  />
                  Follow playhead
                </label>
                <label class={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={showTrackList()}
                    onChange={() => setShowTrackList(!showTrackList())}
                  />
                  Show track list
                </label>
                <label class={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={readOnly()}
                    onChange={() => setReadOnly(!readOnly())}
                  />
                  Read-only
                </label>
              </div>
            </div>
          </div>

          <div class={`${styles.panel} ${styles.panelTracks}`}>
            <div class={styles.panelHead}>
              <span class={styles.sectionTitle} style={{ margin: 0 }}>
                Tracks
              </span>
              <span class={styles.panelMeta}>{totalNotes()} notes</span>
            </div>
            <Show
              when={pianoRollState.tracks.length > 0}
              fallback={
                <p class={styles.empty}>{parsedMidi.loading ? "Loading MIDI…" : "No tracks."}</p>
              }
            >
              <div class={styles.tableWrap}>
                <table class={styles.table}>
                  <thead>
                    <tr>
                      <th></th>
                      <th>#</th>
                      <th>Name</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Index each={pianoRollState.tracks}>
                      {(track, index) => (
                        <tr
                          classList={{
                            [styles.row]: true,
                            [styles.rowSelected]: pianoRollState.selectedTrackIndex === index,
                          }}
                          onClick={() => pianoRollState.onSelectedTrackIndexChange(index)}
                        >
                          <td>
                            <span class={styles.swatch} style={{ background: track().color }} />
                          </td>
                          <td class={styles.timeMuted}>{index + 1}</td>
                          <td class={styles.trackName}>{track().name || "Untitled"}</td>
                          <td>{track().notes.length}</td>
                        </tr>
                      )}
                    </Index>
                  </tbody>
                </table>
              </div>
            </Show>
            <p class={styles.hint}>
              Click the grid to add a note, drag to move, drag its end to resize, double-click (or
              long-press) to delete. Hold ⌥/Alt while dragging to skip the grid. Pinch to zoom,
              or ⌥/Alt+scroll to zoom one axis.
            </p>
          </div>
        </div>
      </div>

      <footer class={styles.footer}>
        <a class={styles.link} href="https://github.com/jdachtera/solid-pianoroll" target="_blank">
          GitHub
        </a>
        <a class={styles.link} href="https://www.npmjs.com/package/solid-pianoroll" target="_blank">
          npm
        </a>
        <span class={styles.footerMuted}>Piano roll UI control for SolidJS</span>
      </footer>
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
