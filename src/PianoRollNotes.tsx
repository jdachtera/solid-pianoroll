import { createMemo, createSignal, For, Ref, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollNotes.module.css";
import { clamp } from "./viewport/createViewPortDimension";
import { Note } from "./types";

type NoteDragMode = "trimStart" | "move" | "trimEnd" | undefined;

const PianoRollNotes = (props: { ref?: Ref<HTMLDivElement | undefined> }) => {
  const context = usePianoRollContext();

  /** This layer's own element. Pointer positions are converted to pitch against
   *  it, because it is the box the notes are positioned inside — see
   *  midiAtPointer. */
  let layer: HTMLDivElement | undefined;

  const verticalViewPort = createMemo(() =>
    useViewPortDimension(context.mode === "keys" ? "vertical" : "verticalTracks"),
  );
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));

  const gridDivisionTicks = createMemo(() => (context.ppq * 4) / context.gridDivision);

  const [isDragging, setIsDragging] = createSignal(false);
  const [noteDragMode, setNoteDragMode] = createSignal<NoteDragMode>();
  const [currentNoteIndex, setCurrentNoteIndex] = createSignal(-1);
  const [currentNoteTrackIndex, setCurrentNoteTrackIndex] = createSignal(-1);

  const [diffPosition, setDiffPosition] = createSignal(0);
  /** How far the pointer sat from the note's own pitch when it was grabbed.
   *
   * Time has always had this (diffPosition above) and pitch never did: the
   * pitch was recomputed from the pointer's absolute row on every move, so the
   * note jumped to whatever row the finger happened to be over the instant the
   * drag began, and a purely sideways drag transposed it. Keeping the offset
   * makes a drag move the note BY what the pointer moved, which is what a drag
   * means. Zero for a note being created, which is born under the pointer. */
  const [diffMidi, setDiffMidi] = createSignal(0);
  const [getInitialNote, setInitialNote] = createSignal<Note>();

  const editable = () => !context.readOnly;

  /** How close to a note's end counts as trimming it rather than moving it.
   *
   * A mouse pointer is effectively one pixel and can afford three. A fingertip
   * is about nine millimetres, so on touch the zone is sized off the note and
   * floored at something a finger can actually land on — capped at a third of
   * the note, so the middle of even a short note stays grabbable. */
  const edgeZonePx = (pointerType: string, noteWidthPx: number) =>
    pointerType === "mouse" ? 3 : Math.min(14, Math.max(6, noteWidthPx / 3));

  /** The pitch row under the pointer.
   *
   * Derived by inverting the very function the notes are drawn with, rather
   * than by re-deriving the geometry alongside it. Two sample rows give the
   * origin and the row height in this layer's own coordinates, and the pointer
   * is measured against the same layer — so the answer stays right whatever the
   * viewport is doing, including the two things that had previously made it
   * wrong:
   *
   *   - the scroll container wraps the time ruler as well as the notes, so
   *     mapping through ITS rectangle put every pointer a ruler-height low:
   *     about two semitones, enough that a sideways drag dropped a note a tone
   *     and a half and a new note was born on the wrong row;
   *   - the layer itself can be translated by scrolling, so an origin assumed
   *     to sit at the top row is not one that can be relied on.
   *
   * Sampling the render is immune to both: whatever offset the layer has, the
   * notes have it too, and it cancels.
   *
   * 127 - row, matching the 127 - midi the render uses a few lines below. */
  const midiAtPointer = (event: PointerEvent) => {
    const origin = verticalViewPort().calculatePixelDimensions(0, 1).offset;
    const next = verticalViewPort().calculatePixelDimensions(1, 1).offset;
    const rowHeight = next - origin;

    if (!layer || !Number.isFinite(rowHeight) || rowHeight === 0)
      return Math.floor(128 - verticalViewPort().calculatePosition(event.clientY));

    const local = event.clientY - layer.getBoundingClientRect().top;

    return 127 - Math.floor((local - origin) / rowHeight);
  };

  /** Which end of a note a press landed on, if either — the difference between
   *  dragging the note around and dragging its start or end. */
  const modeAt = (event: PointerEvent, note: Note): NoteDragMode => {
    const relativeX = horizontalViewPort().calculatePixelValue(
      horizontalViewPort().calculatePosition(event.clientX),
    );
    const noteStartX = horizontalViewPort().calculatePixelValue(note.ticks);
    const noteEndX = horizontalViewPort().calculatePixelValue(note.ticks + note.durationTicks);
    const zone = edgeZonePx(event.pointerType, noteEndX - noteStartX);

    return relativeX - noteStartX < zone
      ? "trimStart"
      : noteEndX - relativeX < zone
      ? "trimEnd"
      : "move";
  };

  /** Touch has neither hover nor a second button, so the two gestures a mouse
   *  gets from those have to come from somewhere. A press that stays still is
   *  the touch stand-in: on empty canvas it creates a note (what a mouse does
   *  immediately on press), on a note it deletes one (what a mouse does with a
   *  double click). 500ms is the platform convention; the slop keeps a shaky
   *  finger from cancelling it. */
  const longPressMs = 500;
  const longPressSlopPx = 10;

  let longPressTimer: ReturnType<typeof setTimeout> | undefined;
  let longPressOrigin: { x: number; y: number } | undefined;

  const cancelLongPress = () => {
    if (longPressTimer !== undefined) clearTimeout(longPressTimer);
    longPressTimer = undefined;
    longPressOrigin = undefined;
  };

  const startLongPress = (event: PointerEvent, action: () => void) => {
    cancelLongPress();
    longPressOrigin = { x: event.clientX, y: event.clientY };
    longPressTimer = setTimeout(() => {
      longPressTimer = undefined;
      action();
    }, longPressMs);
  };

  /** Cancel a pending long press once the finger has travelled far enough that
   *  the gesture is clearly a drag (or a scroll) instead. */
  const trackLongPressMovement = (event: PointerEvent) => {
    if (!longPressOrigin) return;
    const dx = event.clientX - longPressOrigin.x;
    const dy = event.clientY - longPressOrigin.y;
    if (Math.sqrt(dx * dx + dy * dy) > longPressSlopPx) cancelLongPress();
  };

  const calculateNoteDragValues = (event: PointerEvent) => {
    const targetTrackIndex =
      context.mode === "tracks"
        ? clamp(
            Math.floor(verticalViewPort().calculatePosition(event.clientY)),
            0,
            context.tracks.length - 1,
          )
        : currentNoteTrackIndex() > -1
        ? currentNoteTrackIndex()
        : context.selectedTrackIndex;

    const midi =
      context.mode === "keys"
        ? midiAtPointer(event) - diffMidi()
        : getInitialNote()?.midi ?? 60;

    const horiontalPosition = horizontalViewPort().calculatePosition(event.clientX);

    return {
      targetTrackIndex,
      midi,
      horiontalPosition,
    };
  };

  const handlePointerMove = (mouseMoveEvent: PointerEvent) => {
    mouseMoveEvent.preventDefault();
    mouseMoveEvent.stopPropagation();

    const note = getInitialNote();
    if (!note) return;

    const { targetTrackIndex, midi, horiontalPosition } = calculateNoteDragValues(mouseMoveEvent);

    const ticks = context.snapValueToGridIfEnabled(
      horiontalPosition - diffPosition(),
      mouseMoveEvent.altKey,
    );

    const updatedNote = {
      ...note,
      midi,
      ...(noteDragMode() === "move" && { ticks }),
      ...(noteDragMode() === "trimStart" && {
        ticks: ticks < note.ticks + note.durationTicks ? ticks : note.ticks + note.durationTicks,
        durationTicks:
          ticks < note.ticks + note.durationTicks
            ? note.ticks + note.durationTicks - ticks
            : context.snapValueToGridIfEnabled(
                horiontalPosition - note.ticks,
                mouseMoveEvent.altKey,
              ),
      }),
      ...(noteDragMode() === "trimEnd" && {
        ticks: ticks < note.ticks ? ticks : note.ticks,
        durationTicks:
          ticks < note.ticks
            ? note.ticks - ticks
            : context.snapValueToGridIfEnabled(
                horiontalPosition - note.ticks,
                mouseMoveEvent.altKey,
              ),
      }),
    };

    const previousTrackIndex = currentNoteTrackIndex();
    const previousNoteIndex = currentNoteIndex();


    if (targetTrackIndex === previousTrackIndex) {
      context.onNoteChange?.(previousTrackIndex, previousNoteIndex, updatedNote);
    } else {
      if (context.onInsertNote) {
        context.onRemoveNote?.(previousTrackIndex, previousNoteIndex);
        const newNoteIndex = context.onInsertNote(targetTrackIndex, updatedNote);

        setCurrentNoteTrackIndex(targetTrackIndex);
        setCurrentNoteIndex(newNoteIndex);
      }
    }
  };

  const stopDragging = () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopDragging);
    // A pointer can also END without an "up": the browser takes the gesture
    // over (a scroll it decided to own), the finger leaves the digitiser, a
    // pen is lifted out of range. Without this the drag would stay live with
    // nothing driving it, and the next unrelated move would keep editing.
    window.removeEventListener("pointercancel", stopDragging);
    setIsDragging(false);
    setCurrentNoteIndex(-1);
    setCurrentNoteTrackIndex(-1);
  };

  const startDragging = () => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  };

  const getClasses = (noteDragMode: NoteDragMode) => {
    // The resize cursors are a promise that the edge can be dragged, so they go
    // with the editing they advertise.
    if (!editable()) return [styles.Note];

    return noteDragMode
      ? [styles.Note, styles.editable, styles[noteDragMode]]
      : [styles.Note, styles.editable];
  };

  return (
    <div
      classList={{ [styles.PianoRollNotes]: true }}
      ref={(el) => {
        layer = el;
        // Still hand the element to whoever asked for it.
        const forwarded = props.ref;
        if (typeof forwarded === "function") (forwarded as (el: HTMLDivElement) => void)(el);
      }}
      onPointerDown={(mouseDownEvent) => {
        if (!editable()) return;

        const insertAndDrag = (dragAfterwards: boolean) => {
          const { targetTrackIndex, midi, horiontalPosition } =
            calculateNoteDragValues(mouseDownEvent);

          const ticks = context.snapValueToGridIfEnabled(horiontalPosition, mouseDownEvent.altKey);

          const durationTicks = gridDivisionTicks();

          const newNote: Note = {
            midi,
            ticks,
            durationTicks,
            velocity: 100,
          };

          const newNoteIndex = context.onInsertNote(targetTrackIndex, newNote);

          setCurrentNoteTrackIndex(targetTrackIndex);
          setCurrentNoteIndex(newNoteIndex);
          setInitialNote(newNote);
          setDiffPosition(0);
          setDiffMidi(0);
          setNoteDragMode("trimEnd");

          if (dragAfterwards) {
            setIsDragging(true);
            startDragging();
          }
        };

        // Empty canvas, and the two pointer kinds want opposite things from it.
        //
        // A mouse press here means "make a note and drag out its length" — it
        // always has, and there is nothing else a press on empty space could
        // mean when scrolling is a wheel away.
        //
        // A finger press here is almost always the start of a scroll: this
        // layer sits inside a native scroller, and panning the roll is the
        // single most common thing anyone does to it. Creating a note on
        // touchdown would make the roll un-scrollable and litter it with notes
        // nobody asked for. So touch gets the note on a long press instead, and
        // a plain drag is left to the browser to scroll with.
        if (mouseDownEvent.pointerType === "mouse") {
          mouseDownEvent.preventDefault();
          mouseDownEvent.stopPropagation();
          insertAndDrag(true);
          return;
        }

        startLongPress(mouseDownEvent, () => insertAndDrag(false));
      }}
      onPointerMove={trackLongPressMovement}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
    >
      <For each={context.tracks}>
        {(track, trackIndex) => {
          return (
            <Show
              when={
                trackIndex() === context.selectedTrackIndex ||
                context.showAllTracks ||
                context.mode === "tracks"
              }
            >
              <For each={track.notes}>
                {(note, noteIndex) => {
                  const verticalVirtualDimensions = createMemo(() =>
                    verticalViewPort().calculatePixelDimensions(
                      context.mode === "keys" ? 127 - note.midi : trackIndex(),
                      1,
                    ),
                  );

                  const horizontalDimensions = createMemo(() =>
                    horizontalViewPort().calculatePixelDimensions(note.ticks, note.durationTicks),
                  );

                  return (
                    <Show
                      when={
                        verticalViewPort().isVisible(verticalVirtualDimensions()) &&
                        horizontalViewPort().isVisible(horizontalDimensions())
                      }
                    >
                      <div
                        class={getClasses(noteDragMode()).join(" ")}
                        draggable={false}
                        onPointerMove={(event) => {
                          trackLongPressMovement(event);
                          if (isDragging() || !editable()) return;
                          // Hover, so mouse only — this exists to put the right
                          // cursor under the pointer before anything is pressed,
                          // and a finger is never "over" a note without touching
                          // it. Touch picks its mode on press instead, below.
                          if (event.pointerType !== "mouse") return;
                          event.stopPropagation();

                          setNoteDragMode(modeAt(event, note));
                        }}
                        onDblClick={(event) => {
                          if (!editable()) return;
                          event.stopPropagation();
                          context.onRemoveNote?.(trackIndex(), noteIndex());
                        }}
                        onPointerDown={(event) => {
                          if (!editable()) return;
                          event.stopPropagation();

                          // Decided here rather than taken from the hover state:
                          // on touch there was no hover to set it, and on mouse
                          // this reaches the same answer the hover already showed.
                          const mode = modeAt(event, note);
                          setNoteDragMode(mode);

                          const initialPosition = horizontalViewPort().calculatePosition(
                            event.clientX,
                          );

                          setDiffPosition(
                            mode === "trimEnd"
                              ? -(note.ticks + note.durationTicks - initialPosition)
                              : initialPosition - note.ticks,
                          );
                          setDiffMidi(midiAtPointer(event) - note.midi);
                          setIsDragging(true);
                          setCurrentNoteIndex(noteIndex());
                          setCurrentNoteTrackIndex(trackIndex());
                          setInitialNote(note);

                          // The touch equivalent of double-clicking a note. The
                          // drag is armed either way: whichever the finger turns
                          // out to be doing, it is already set up to do it, and
                          // moving far enough cancels the delete.
                          if (event.pointerType !== "mouse")
                            startLongPress(event, () => {
                              stopDragging();
                              context.onRemoveNote?.(trackIndex(), noteIndex());
                            });

                          startDragging();
                        }}
                        onPointerUp={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        style={{
                          "background-color": `${track.color}`,

                          opacity: (note.velocity / 128 + 2) / 3,

                          top: `${verticalVirtualDimensions().offset}px`,
                          height: `${verticalVirtualDimensions().size}px`,

                          left: `${horizontalDimensions().offset}px`,
                          width: `${horizontalDimensions().size}px`,
                        }}
                      ></div>
                    </Show>
                  );
                }}
              </For>
            </Show>
          );
        }}
      </For>
    </div>
  );
};

export default PianoRollNotes;
