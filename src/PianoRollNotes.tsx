import { createEffect, createMemo, createSignal, For, onCleanup, Ref, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollNotes.module.css";
import { clamp } from "./viewport/createViewPortDimension";
import { createNoteId } from "./usePianoRollState";
import { Note } from "./types";

type NoteDragMode = "trimStart" | "move" | "trimEnd" | undefined;

// A marquee rectangle in *position space* (ticks horizontally, view rows
// vertically — i.e. 127 - midi in keys mode, track index in tracks mode).
type Marquee = { t0: number; t1: number; v0: number; v1: number };

const MARQUEE_THRESHOLD_PX = 3;
const MIN_DURATION_TICKS = 1;

const PianoRollNotes = (props: { ref?: Ref<HTMLDivElement | undefined> }) => {
  const context = usePianoRollContext();

  const verticalViewPort = createMemo(() =>
    useViewPortDimension(context.mode === "keys" ? "vertical" : "verticalTracks"),
  );
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));

  const gridDivisionTicks = createMemo(() => (context.ppq * 4) / context.gridDivision);

  // Consumer-supplied notes (loaded MIDI, randomized patterns, …) often arrive
  // without an id. Backfill ids so selection/multi-edit can track them. This is
  // idempotent: once every note has an id the effect stops writing.
  createEffect(() => {
    let changed = false;
    const next = context.tracks.map((track) => {
      let trackChanged = false;
      const notes = track.notes.map((note) => {
        if (note.id) return note;
        trackChanged = true;
        changed = true;
        return { ...note, id: createNoteId() };
      });
      return trackChanged ? { ...track, notes } : track;
    });
    if (changed) context.onTracksChange?.(next);
  });

  const [isDragging, setIsDragging] = createSignal(false);
  const [noteDragMode, setNoteDragMode] = createSignal<NoteDragMode>();
  const [currentNoteIndex, setCurrentNoteIndex] = createSignal(-1);
  const [currentNoteTrackIndex, setCurrentNoteTrackIndex] = createSignal(-1);

  const [diffPosition, setDiffPosition] = createSignal(0);
  const [getInitialNote, setInitialNote] = createSignal<Note>();

  // Multi-note drag: the snapshot of every selected note at grab time plus the
  // grab anchor, so each move applies an absolute (snapshot + delta) update.
  let multiSnapshot: { id: string; note: Note }[] = [];
  let grabTicks = 0;
  let grabMidi = 0;
  let multiDragMode: NoteDragMode;

  // Marquee selection bookkeeping.
  const [marquee, setMarquee] = createSignal<Marquee | undefined>();
  let marqueeStartClient = { x: 0, y: 0 };
  let marqueeStartPosition = { ticks: 0, v: 0 };
  let marqueeMoved = false;
  let marqueeAdditive = false;

  // The notes render below the time ruler (and the whole roll can be scrolled or
  // shifted by layout), so the viewport's cached scroller offset didn't line up
  // with where notes actually are — clicks/drags then landed off from the cursor
  // (e.g. a few semitones low). Map client coordinates against this element's
  // *live* bounding rect — the exact origin the notes are rendered from — so
  // hit-testing always matches the visuals.
  let rootElement: HTMLDivElement | undefined;

  const positionFromClient = (
    viewPort: ReturnType<typeof useViewPortDimension>,
    clientCoord: number,
    axis: "x" | "y",
  ) => {
    const rect = rootElement?.getBoundingClientRect();
    const origin = axis === "x" ? rect?.left ?? 0 : rect?.top ?? 0;
    const pixelsPerUnit = viewPort.calculatePixelValue(1);
    return pixelsPerUnit
      ? viewPort.position + (clientCoord - origin) / pixelsPerUnit
      : viewPort.position;
  };

  const calculateNoteDragValues = (event: MouseEvent) => {
    const targetTrackIndex =
      context.mode === "tracks"
        ? clamp(
            Math.floor(positionFromClient(verticalViewPort(), event.clientY, "y")),
            0,
            context.tracks.length - 1,
          )
        : currentNoteTrackIndex() > -1
        ? currentNoteTrackIndex()
        : context.selectedTrackIndex;

    const midi =
      context.mode === "keys"
        ? Math.floor(128 - positionFromClient(verticalViewPort(), event.clientY, "y"))
        : getInitialNote()?.midi ?? 60;

    const horiontalPosition = positionFromClient(horizontalViewPort(), event.clientX, "x");

    return {
      targetTrackIndex,
      midi,
      horiontalPosition,
    };
  };

  // --- Single-note drag (unchanged behaviour; keeps per-note callback sync) ---

  const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
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
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", stopDragging);
    setIsDragging(false);
    setCurrentNoteIndex(-1);
    setCurrentNoteTrackIndex(-1);
  };

  const startDragging = () => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);
  };

  // --- Multi-note drag (move / resize the whole selection together) ---------

  const handleMultiMouseMove = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!multiSnapshot.length) return;

    const rawDeltaTicks = positionFromClient(horizontalViewPort(), event.clientX, "x") - grabTicks;
    const deltaTicks = context.snapValueToGridIfEnabled(rawDeltaTicks, event.altKey);
    const currentMidi =
      context.mode === "keys"
        ? Math.floor(128 - positionFromClient(verticalViewPort(), event.clientY, "y"))
        : grabMidi;
    const deltaMidi = currentMidi - grabMidi;

    const snapById = new Map(multiSnapshot.map((entry) => [entry.id, entry.note]));

    context.onTracksChange?.(
      context.tracks.map((track) => ({
        ...track,
        notes: track.notes.map((note) => {
          if (!note.id) return note;
          const snap = snapById.get(note.id);
          if (!snap) return note;

          if (multiDragMode === "move") {
            return {
              ...note,
              ticks: Math.max(0, snap.ticks + deltaTicks),
              midi: context.mode === "keys" ? clamp(snap.midi + deltaMidi, 0, 127) : snap.midi,
            };
          }
          if (multiDragMode === "trimEnd") {
            return {
              ...note,
              durationTicks: Math.max(MIN_DURATION_TICKS, snap.durationTicks + deltaTicks),
            };
          }
          // trimStart: move the left edge, keep the right edge fixed.
          const newTicks = clamp(
            snap.ticks + deltaTicks,
            0,
            snap.ticks + snap.durationTicks - MIN_DURATION_TICKS,
          );
          return {
            ...note,
            ticks: newTicks,
            durationTicks: snap.ticks + snap.durationTicks - newTicks,
          };
        }),
      })),
    );
  };

  const stopMultiDragging = () => {
    window.removeEventListener("mousemove", handleMultiMouseMove);
    window.removeEventListener("mouseup", stopMultiDragging);
    setIsDragging(false);
    multiSnapshot = [];
  };

  const beginMultiDrag = (event: MouseEvent, ids: string[]) => {
    const selected = new Set(ids);
    multiSnapshot = context.tracks
      .flatMap((track) => track.notes)
      .filter((note) => note.id && selected.has(note.id))
      .map((note) => ({ id: note.id as string, note: { ...note } }));

    grabTicks = positionFromClient(horizontalViewPort(), event.clientX, "x");
    grabMidi =
      context.mode === "keys"
        ? Math.floor(128 - positionFromClient(verticalViewPort(), event.clientY, "y"))
        : 0;
    multiDragMode = noteDragMode() ?? "move";

    setIsDragging(true);
    window.addEventListener("mousemove", handleMultiMouseMove);
    window.addEventListener("mouseup", stopMultiDragging);
  };

  // --- Marquee selection + click-to-create on empty space -------------------

  const handleMarqueeMove = (event: MouseEvent) => {
    const dx = Math.abs(event.clientX - marqueeStartClient.x);
    const dy = Math.abs(event.clientY - marqueeStartClient.y);
    if (!marqueeMoved && dx < MARQUEE_THRESHOLD_PX && dy < MARQUEE_THRESHOLD_PX) return;
    marqueeMoved = true;

    const ticks = positionFromClient(horizontalViewPort(), event.clientX, "x");
    const v = positionFromClient(verticalViewPort(), event.clientY, "y");

    setMarquee({
      t0: Math.min(marqueeStartPosition.ticks, ticks),
      t1: Math.max(marqueeStartPosition.ticks, ticks),
      v0: Math.min(marqueeStartPosition.v, v),
      v1: Math.max(marqueeStartPosition.v, v),
    });
  };

  const finishMarquee = (event: MouseEvent) => {
    window.removeEventListener("mousemove", handleMarqueeMove);
    window.removeEventListener("mouseup", finishMarquee);

    const rect = marquee();
    if (marqueeMoved && rect) {
      const ids: string[] = [];
      context.tracks.forEach((track, trackIndex) => {
        if (context.mode === "keys" && trackIndex !== context.selectedTrackIndex) return;
        track.notes.forEach((note) => {
          if (!note.id) return;
          const vUnit = context.mode === "keys" ? 127 - note.midi : trackIndex;
          const overlapsTime = note.ticks < rect.t1 && note.ticks + note.durationTicks > rect.t0;
          const overlapsRows = vUnit + 1 > rect.v0 && vUnit < rect.v1;
          if (overlapsTime && overlapsRows) ids.push(note.id);
        });
      });
      context.selectNotes(ids, marqueeAdditive);
      setMarquee(undefined);
      return;
    }

    setMarquee(undefined);

    // A plain click on empty space creates a grid-length note and selects it.
    const { targetTrackIndex, midi, horiontalPosition } = calculateNoteDragValues(event);
    const ticks = context.snapValueToGridIfEnabled(horiontalPosition, event.altKey);
    const id = createNoteId();
    const newNote: Note = {
      id,
      midi,
      ticks,
      durationTicks: gridDivisionTicks(),
      velocity: 100,
    };
    context.onInsertNote(targetTrackIndex, newNote);
    context.selectNotes([id]);
  };

  // --- Keyboard actions ------------------------------------------------------

  const handleKeyDown = (event: KeyboardEvent) => {
    const meta = event.metaKey || event.ctrlKey;

    switch (event.key) {
      case "Backspace":
      case "Delete":
        event.preventDefault();
        context.deleteSelectedNotes();
        return;
      case "Escape":
        context.clearSelection();
        return;
      case "a":
      case "A":
        if (meta) {
          event.preventDefault();
          context.selectAllNotes();
        }
        return;
      case "c":
      case "C":
        if (meta) context.copySelectedNotes();
        return;
      case "x":
      case "X":
        if (meta) context.cutSelectedNotes();
        return;
      case "v":
      case "V":
        if (meta) context.pasteNotes();
        return;
      case "d":
      case "D":
        if (meta) {
          event.preventDefault();
          context.duplicateSelectedNotes();
        }
        return;
      case "ArrowLeft":
        event.preventDefault();
        context.nudgeSelectedNotes({
          ticks: -(event.shiftKey ? context.barTicks() : context.gridTicks()),
        });
        return;
      case "ArrowRight":
        event.preventDefault();
        context.nudgeSelectedNotes({
          ticks: event.shiftKey ? context.barTicks() : context.gridTicks(),
        });
        return;
      case "ArrowUp":
        event.preventDefault();
        context.nudgeSelectedNotes({ midi: event.shiftKey ? 12 : 1 });
        return;
      case "ArrowDown":
        event.preventDefault();
        context.nudgeSelectedNotes({ midi: event.shiftKey ? -12 : -1 });
        return;
      default:
        return;
    }
  };

  onCleanup(() => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", stopDragging);
    window.removeEventListener("mousemove", handleMultiMouseMove);
    window.removeEventListener("mouseup", stopMultiDragging);
    window.removeEventListener("mousemove", handleMarqueeMove);
    window.removeEventListener("mouseup", finishMarquee);
  });

  const getClasses = (mode: NoteDragMode, selected: boolean) => {
    const classes = mode ? [styles.Note, styles[mode]] : [styles.Note];
    if (selected) classes.push(styles.selected);
    return classes;
  };

  return (
    <div
      classList={{ [styles.PianoRollNotes]: true }}
      tabindex={0}
      onKeyDown={handleKeyDown}
      ref={(element) => {
        rootElement = element;
        if (typeof props.ref === "function") {
          (props.ref as (el: HTMLDivElement) => void)(element);
        }
      }}
      onMouseDown={(mouseDownEvent) => {
        mouseDownEvent.preventDefault();
        mouseDownEvent.stopPropagation();
        rootElement?.focus();

        // Start a potential marquee; if the pointer doesn't move it resolves to
        // a click that creates a note (see finishMarquee).
        marqueeStartClient = { x: mouseDownEvent.clientX, y: mouseDownEvent.clientY };
        marqueeStartPosition = {
          ticks: positionFromClient(horizontalViewPort(), mouseDownEvent.clientX, "x"),
          v: positionFromClient(verticalViewPort(), mouseDownEvent.clientY, "y"),
        };
        marqueeMoved = false;
        marqueeAdditive = mouseDownEvent.shiftKey;

        window.addEventListener("mousemove", handleMarqueeMove);
        window.addEventListener("mouseup", finishMarquee);
      }}
    >
      <Show when={marquee()}>
        {(rect) => {
          const dimensions = createMemo(() => {
            const horizontal = horizontalViewPort().calculatePixelDimensions(
              rect().t0,
              rect().t1 - rect().t0,
            );
            const vertical = verticalViewPort().calculatePixelDimensions(
              rect().v0,
              rect().v1 - rect().v0,
            );
            return { horizontal, vertical };
          });
          return (
            <div
              class={styles.Marquee}
              style={{
                left: `${dimensions().horizontal.offset}px`,
                width: `${dimensions().horizontal.size}px`,
                top: `${dimensions().vertical.offset}px`,
                height: `${dimensions().vertical.size}px`,
              }}
            ></div>
          );
        }}
      </Show>
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

                  const selected = createMemo(() => context.isNoteSelected(note.id));

                  return (
                    <Show
                      when={
                        verticalViewPort().isVisible(verticalVirtualDimensions()) &&
                        horizontalViewPort().isVisible(horizontalDimensions())
                      }
                    >
                      <div
                        class={getClasses(noteDragMode(), selected()).join(" ")}
                        draggable={false}
                        onMouseMove={(event) => {
                          if (isDragging()) return;
                          event.stopPropagation();

                          const relativeX = horizontalViewPort().calculatePixelValue(
                            positionFromClient(horizontalViewPort(), event.clientX, "x"),
                          );
                          const noteStartX = horizontalViewPort().calculatePixelValue(note.ticks);
                          const noteEndX = horizontalViewPort().calculatePixelValue(
                            note.ticks + note.durationTicks,
                          );

                          setNoteDragMode(
                            relativeX - noteStartX < 3
                              ? "trimStart"
                              : noteEndX - relativeX < 3
                              ? "trimEnd"
                              : "move",
                          );
                        }}
                        onDblClick={(event) => {
                          event.stopPropagation();
                          context.onRemoveNote?.(trackIndex(), noteIndex());
                        }}
                        onMouseDown={(event) => {
                          event.stopPropagation();
                          rootElement?.focus();

                          const id = note.id;
                          const additive = event.shiftKey || event.metaKey || event.ctrlKey;

                          // Resolve the selection this gesture acts on.
                          let activeIds: string[];
                          if (id && additive) {
                            const next = context.isNoteSelected(id)
                              ? context.selectedNoteIds.filter((existing) => existing !== id)
                              : [...context.selectedNoteIds, id];
                            context.selectNotes(next);
                            // Shift-clicking a selected note deselects it — no drag.
                            if (!next.includes(id)) return;
                            activeIds = next;
                          } else if (id) {
                            if (!context.isNoteSelected(id)) {
                              context.selectNotes([id]);
                              activeIds = [id];
                            } else {
                              activeIds = [...context.selectedNoteIds];
                            }
                          } else {
                            activeIds = [];
                          }

                          // Multi-selection → move/resize the whole group together.
                          if (activeIds.length > 1) {
                            setInitialNote(note);
                            beginMultiDrag(event, activeIds);
                            return;
                          }

                          // Single note → existing per-note drag path.
                          const initialPosition = positionFromClient(
                            horizontalViewPort(),
                            event.clientX,
                            "x",
                          );

                          setDiffPosition(
                            noteDragMode() === "trimEnd"
                              ? -(note.ticks + note.durationTicks - initialPosition)
                              : initialPosition - note.ticks,
                          );
                          setIsDragging(true);
                          setCurrentNoteIndex(noteIndex());
                          setCurrentNoteTrackIndex(trackIndex());
                          setInitialNote(note);

                          startDragging();
                        }}
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
