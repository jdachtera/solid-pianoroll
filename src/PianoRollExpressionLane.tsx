import { createMemo, For, onCleanup, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import { clamp } from "./viewport/createViewPortDimension";
import styles from "./PianoRollExpressionLane.module.css";
import { Note, NoteExpressionField } from "./types";

type FieldConfig = {
  min: number;
  max: number;
  fallback: number;
  label: string;
  // Round a dragged value to the field's natural resolution.
  round: (value: number) => number;
};

// Per-field range + defaults for the lane. `velocity` doubles as per-note
// volume; `detune` is in cents; `playbackRate` is a speed multiplier; `reverse`
// is a 0/1 toggle.
export const expressionFieldConfig: Record<NoteExpressionField, FieldConfig> = {
  velocity: { min: 0, max: 127, fallback: 100, label: "Vel", round: Math.round },
  detune: { min: -1200, max: 1200, fallback: 0, label: "Detune", round: Math.round },
  playbackRate: {
    min: 0,
    max: 2,
    fallback: 1,
    label: "Rate",
    round: (value) => Math.round(value * 100) / 100,
  },
  reverse: { min: 0, max: 1, fallback: 0, label: "Rev", round: Math.round },
};

const noteFieldValue = (note: Note, field: NoteExpressionField) => {
  if (field === "reverse") return note.reverse ? 1 : 0;
  if (field === "velocity") return note.velocity;
  return note[field] ?? expressionFieldConfig[field].fallback;
};

const PianoRollExpressionLane = () => {
  const context = usePianoRollContext();
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));

  const field = () => context.expressionField ?? "velocity";
  const config = () => expressionFieldConfig[field()];
  const track = () => context.tracks[context.selectedTrackIndex];

  let laneElement: HTMLDivElement | undefined;

  // Drag bookkeeping: snapshot of each affected note's value at grab time, plus
  // the value under the cursor when the drag started, so the move applies a
  // delta to the whole selection (Ableton-style relative velocity editing).
  let dragSnapshot = new Map<string, number>();
  let dragGrabValue = 0;
  let dragField: NoteExpressionField = "velocity";

  const valueFromClientY = (clientY: number) => {
    const rect = laneElement?.getBoundingClientRect();
    if (!rect || !rect.height) return config().fallback;
    const ratio = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    return config().min + ratio * (config().max - config().min);
  };

  const ratioForValue = (value: number) => {
    const { min, max } = config();
    return max === min ? 0 : clamp((value - min) / (max - min), 0, 1);
  };

  const applyDrag = (clientY: number) => {
    const current = valueFromClientY(clientY);
    const delta = current - dragGrabValue;
    const { min, max, round } = expressionFieldConfig[dragField];

    context.updateTrackNotes((note) => {
      if (!note.id) return note;
      const base = dragSnapshot.get(note.id);
      if (base === undefined) return note;
      const next = clamp(base + delta, min, max);
      if (dragField === "reverse") return { ...note, reverse: next >= 0.5 };
      return { ...note, [dragField]: round(next) };
    });
  };

  const handleMouseMove = (event: MouseEvent) => {
    event.preventDefault();
    applyDrag(event.clientY);
  };

  const stopDragging = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", stopDragging);
    dragSnapshot = new Map();
  };

  onCleanup(stopDragging);

  // Begin editing `note`. If it isn't already part of a multi-selection, it
  // becomes the sole selection; the drag then edits every selected note.
  const beginEdit = (note: Note, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const id = note.id;
    if (!id) return;

    const editIds =
      context.isNoteSelected(id) && context.selectedNoteIds.length > 1
        ? [...context.selectedNoteIds]
        : [id];
    if (!(context.isNoteSelected(id) && context.selectedNoteIds.length > 1)) {
      context.selectNotes([id]);
    }

    dragField = field();
    const editSet = new Set(editIds);
    dragSnapshot = new Map(
      (track()?.notes ?? [])
        .filter((candidate) => candidate.id && editSet.has(candidate.id))
        .map((candidate) => [candidate.id as string, noteFieldValue(candidate, dragField)]),
    );

    // For the boolean reverse field a click just toggles; otherwise the grab
    // value anchors the relative drag.
    if (dragField === "reverse") {
      const toggled = noteFieldValue(note, "reverse") >= 0.5 ? 0 : 1;
      dragGrabValue = noteFieldValue(note, "reverse");
      context.updateTrackNotes((candidate) =>
        candidate.id && editSet.has(candidate.id)
          ? { ...candidate, reverse: toggled >= 0.5 }
          : candidate,
      );
      return;
    }

    dragGrabValue = valueFromClientY(event.clientY);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);
  };

  return (
    <div class={styles.ExpressionLane}>
      <div class={styles.Toolbar}>
        <For each={Object.keys(expressionFieldConfig) as NoteExpressionField[]}>
          {(name) => (
            <button
              type="button"
              classList={{
                [styles.ToolbarButton]: true,
                [styles.active]: field() === name,
              }}
              onClick={() => context.onExpressionFieldChange(name)}
            >
              {expressionFieldConfig[name].label}
            </button>
          )}
        </For>
      </div>
      <div class={styles.Bars} ref={laneElement}>
        <For each={track()?.notes ?? []}>
          {(note) => {
            const dimensions = createMemo(() =>
              horizontalViewPort().calculatePixelDimensions(note.ticks, note.durationTicks),
            );
            const ratio = createMemo(() => ratioForValue(noteFieldValue(note, field())));
            const selected = createMemo(() => context.isNoteSelected(note.id));

            return (
              <Show when={horizontalViewPort().isVisible(dimensions())}>
                <div
                  classList={{ [styles.Bar]: true, [styles.selected]: selected() }}
                  style={{ left: `${dimensions().offset}px`, "background-color": track()?.color }}
                  onMouseDown={(event) => beginEdit(note, event)}
                >
                  <div
                    class={styles.BarFill}
                    style={{
                      height: `${ratio() * 100}%`,
                      "background-color": track()?.color,
                    }}
                  ></div>
                </div>
              </Show>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default PianoRollExpressionLane;
