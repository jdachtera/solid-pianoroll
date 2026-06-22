export type GridDivision = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export type Note = {
  // Stable identity used for selection and multi-note editing. The roll
  // auto-assigns one when a note is created or first touched, and it round-trips
  // through the consumer's store (so a selection survives re-sorting on move).
  // Optional for backwards compatibility with consumers that build plain notes.
  id?: string;
  ticks: number;
  durationTicks: number;
  midi: number;
  velocity: number;
  // Per-note expression fields for sample/slice consumers. All optional and
  // backwards compatible — `undefined` means "neutral" (no detune, 1x rate,
  // forward playback). Edited via the expression lanes.
  // Fine pitch offset in cents, applied on top of the integer `midi`.
  detune?: number;
  // Playback speed multiplier (independent of pitch for grain/slice players).
  playbackRate?: number;
  // Reverse playback of the triggered slice/sample.
  reverse?: boolean;
};

export type Track = {
  name: string;
  notes: Note[];
  color: string;
};

// Parameters of a note that the expression lanes can edit. `velocity` doubles
// as the per-note volume/gain in sample consumers.
export type NoteExpressionField = "velocity" | "detune" | "playbackRate" | "reverse";
