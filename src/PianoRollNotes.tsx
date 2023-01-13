import { batch, createMemo, createSignal, For, Ref, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollNotes.module.scss";
import { clamp } from "./viewport/createViewPortDimension";

type NoteDragMode = "trimStart" | "move" | "trimEnd" | undefined;

const PianoRollNotes = (props: { ref?: Ref<HTMLDivElement | undefined> }) => {
  const context = usePianoRollContext();

  const verticalViewPort = createMemo(() =>
    useViewPortDimension(context.mode === "keys" ? "vertical" : "verticalTracks"),
  );
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));

  const gridDivisionTicks = createMemo(() => (context.ppq * 4) / context.gridDivision);

  const snapValueToGridIfEnabled = (value: number, altKey: boolean) =>
    context.snapToGrid && !altKey
      ? Math.round(value / gridDivisionTicks()) * gridDivisionTicks()
      : value;

  const insertOrUpdateNote = (event: MouseEvent) => {
    const position = horizontalViewPort().calculatePosition(event.clientX);

    const existingNote = currentNote();

    const midi =
      context.mode === "keys"
        ? 127 - Math.floor(verticalViewPort().calculatePosition(event.clientY))
        : existingNote?.midi ?? 60;

    const targetTrackIndex =
      context.mode === "tracks"
        ? clamp(
            Math.floor(verticalViewPort().calculatePosition(event.clientY)),
            0,
            context.tracks.length - 1,
          )
        : context.selectedTrackIndex ?? 0;

    const eventPositionTicks = Math.floor(position / gridDivisionTicks()) * gridDivisionTicks();
    const velocity = 127;

    const ticks = existingNote?.ticks ?? eventPositionTicks;
    const durationTicks = existingNote?.ticks
      ? eventPositionTicks - existingNote?.ticks
      : gridDivisionTicks();

    const note = { midi, ticks, durationTicks, velocity };

    if (existingNote) {
      context.onNoteChange?.(currentNoteTrackIndex(), currentNoteIndex(), note);
      return currentNoteIndex();
    } else {
      return context.onInsertNote?.(targetTrackIndex, note) ?? -1;
    }
  };

  const [isDragging, setIsDragging] = createSignal(false);
  const [noteDragMode, setNoteDragMode] = createSignal<NoteDragMode>();
  const [currentNoteIndex, setCurrentNoteIndex] = createSignal(-1);
  const [currentNoteTrackIndex, setCurrentNoteTrackIndex] = createSignal(-1);
  const [isMouseDown, setIsMouseDown] = createSignal(false);

  const currentNote = createMemo(
    () => context.tracks[currentNoteTrackIndex()]?.notes[currentNoteIndex()],
  );

  const getClasses = (noteDragMode: NoteDragMode) => {
    return noteDragMode ? [styles.Note, styles[noteDragMode]] : [styles.Note];
  };

  return (
    <div
      classList={{ [styles.PianoRollNotes]: true }}
      ref={props.ref}
      onMouseDown={(event) => {
        batch(() => {
          setIsMouseDown(true);
          const index = insertOrUpdateNote(event);

          setCurrentNoteTrackIndex(context.selectedTrackIndex ?? 0);
          setCurrentNoteIndex(index);
        });
      }}
      onMouseMove={(event) => {
        if (isDragging()) return;

        if (!isMouseDown()) {
          setNoteDragMode(undefined);
          return;
        }

        const index = insertOrUpdateNote(event);

        setCurrentNoteIndex(index);
      }}
      onMouseUp={(event) => {
        setIsMouseDown(false);
        if (!event.altKey) return;
        insertOrUpdateNote(event);
      }}
      onDblClick={(event) => {
        insertOrUpdateNote(event);
      }}
      onClick={(event) => {
        if (currentNote()) {
          setCurrentNoteIndex(-1);
          return;
        }
        if (!event.altKey) return;
        insertOrUpdateNote(event);
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
                            horizontalViewPort().calculatePosition(event.clientX),
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

                          setIsDragging(true);

                          setCurrentNoteIndex(noteIndex());
                          setCurrentNoteTrackIndex(trackIndex());

                          const initialPosition = horizontalViewPort().calculatePosition(
                            event.clientX,
                          );
                          const diffPosition = initialPosition - note.ticks;

                          const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
                            const note = currentNote();
                            if (!note) return;

                            const ticks = snapValueToGridIfEnabled(
                              Math.max(
                                horizontalViewPort().calculatePosition(mouseMoveEvent.clientX) -
                                  diffPosition,
                                0,
                              ),
                              mouseMoveEvent.altKey,
                            );

                            const updatedNote = {
                              ...note,
                              ...(noteDragMode() === "move" &&
                                context.mode === "keys" && {
                                  midi: Math.round(
                                    127 -
                                      verticalViewPort().calculatePosition(mouseMoveEvent.clientY),
                                  ),
                                }),
                              ...((noteDragMode() === "move" || noteDragMode() === "trimStart") && {
                                ticks,
                              }),
                              ...(noteDragMode() === "trimStart" && {
                                durationTicks: note.durationTicks + note.ticks - ticks,
                              }),
                              ...(noteDragMode() === "trimEnd" && {
                                durationTicks: snapValueToGridIfEnabled(
                                  horizontalViewPort().calculatePosition(mouseMoveEvent.clientX) -
                                    note.ticks,
                                  mouseMoveEvent.altKey,
                                ),
                              }),
                            };

                            const previousTrackIndex = currentNoteTrackIndex();
                            const previousNoteIndex = currentNoteIndex();

                            const targetTrackIndex =
                              context.mode === "tracks"
                                ? clamp(
                                    Math.floor(
                                      verticalViewPort().calculatePosition(mouseMoveEvent.clientY),
                                    ),
                                    0,
                                    context.tracks.length - 1,
                                  )
                                : previousTrackIndex;

                            if (targetTrackIndex === previousTrackIndex) {
                              context.onNoteChange?.(
                                previousTrackIndex,
                                previousNoteIndex,
                                updatedNote,
                              );
                            } else {
                              batch(() => {
                                if (context.onInsertNote) {
                                  context.onRemoveNote?.(previousTrackIndex, previousNoteIndex);
                                  const newNoteIndex = context.onInsertNote(
                                    targetTrackIndex,
                                    updatedNote,
                                  );

                                  setCurrentNoteTrackIndex(targetTrackIndex);
                                  setCurrentNoteIndex(newNoteIndex);
                                }
                              });
                            }
                          };
                          const handleMouseUp = () => {
                            setIsDragging(false);
                            setCurrentNoteIndex(-1);
                            setCurrentNoteTrackIndex(-1);

                            window.removeEventListener("mousemove", handleMouseMove);
                            window.removeEventListener("mouseup", handleMouseUp);
                          };
                          window.addEventListener("mousemove", handleMouseMove);
                          window.addEventListener("mouseup", handleMouseUp);
                        }}
                        style={{
                          "background-color": `rgba(255,0,0, ${(128 + note.velocity) / 256})`,

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
