export type GridDivision = 1 | 2 | 4 | 8 | 16 | 32 | 64;

/** One note, in ticks against the roll's own `ppq`.
 *
 * Declared structurally rather than derived from `@tonejs/midi`'s JSON shape,
 * which is what it used to be. That derivation cost this package a dependency on
 * a MIDI file parser — and, through the same optional entry, on `tone`, about a
 * megabyte of audio engine — purely so that four numbers could have names. Any
 * caller with notes in this shape can use the roll now, whether they parsed a
 * MIDI file, recorded a loop in a synth, or generated the notes outright.
 *
 * The names and units are deliberately identical to the Tone.js JSON they used
 * to alias, so `@tonejs/midi`'s own output still satisfies this type
 * structurally and no existing caller has to change:
 *
 *   ticks          start, in ticks from the beginning of the track
 *   durationTicks  length, in ticks
 *   midi           pitch, 0..127
 *   velocity       0..1
 */
export type Note = {
  ticks: number;
  durationTicks: number;
  midi: number;
  velocity: number;
};

export type Track = {
  name: string;
  notes: Note[];
  color: string;
};
