import { createMemo, createSignal, For, Ref, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollNotes.module.css";
import { clamp } from "./viewport/createViewPortDimension";
import { Note } from "./types";

type NoteDragMode = "trimStart" | "move" | "trimEnd" | undefined;

const PianoRollNotes = (props: { ref?: Ref<HTMLDivElement | undefined> }) => {
  const context = usePianoRollContext();

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
  const [getInitialNote, setInitialNote] = createSignal<Note>();

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

  const getClasses = (noteDragMode: NoteDragMode) => {
    return noteDragMode ? [styles.Note, styles[noteDragMode]] : [styles.Note];
  };

  return (
    <div
      classList={{ [styles.PianoRollNotes]: true }}
      ref={(element) => {
        rootElement = element;
        if (typeof props.ref === "function") {
          (props.ref as (el: HTMLDivElement) => void)(element);
        }
      }}
      onMouseDown={(mouseDownEvent) => {
        mouseDownEvent.preventDefault();
        mouseDownEvent.stopPropagation();

        const { targetTrackIndex, midi, horiontalPosition } =
          calculateNoteDragValues(mouseDownEvent);

        const ticks = context.snapValueToGridIfEnabled(
          horiontalPosition,
          mouseDownEvent.altKey,
          context,
        );

        const durationTicks = gridDivisionTicks();

        const newNote: Note = {
          midi,
          ticks,
          durationTicks,
          velocity: 100,
        };

        const newNoteIndex = context.onInsertNote(targetTrackIndex, newNote);

        setIsDragging(true);
        setCurrentNoteTrackIndex(targetTrackIndex);
        setCurrentNoteIndex(newNoteIndex);
        setInitialNote(newNote);
        setDiffPosition(0);
        setNoteDragMode("trimEnd");

        startDragging();
      }}
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
