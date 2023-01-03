import { createMemo, createSignal, Index, Ref, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import styles from "./PianoRollNotes.module.scss";

type NoteDragMode = "trimStart" | "move" | "trimEnd" | undefined;

const PianoRollNotes = (props: { ref?: Ref<HTMLDivElement | undefined> }) => {
  const context = usePianoRollContext();

  const verticalViewPort = createMemo(() => useViewPortDimension("vertical"));
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));

  const gridDivisionTicks = createMemo(() => (context.ppq * 4) / context.gridDivision);

  const snapValueToGridIfEnabled = (value: number, altKey: boolean) =>
    context.snapToGrid && !altKey
      ? Math.round(value / gridDivisionTicks()) * gridDivisionTicks()
      : value;

  const insertOrUpdateNote = (event: MouseEvent) => {
    const position = horizontalViewPort().calculatePosition(event.clientX);
    const midi = 127 - Math.floor(verticalViewPort().calculatePosition(event.clientY));
    const eventPositionTicks = Math.floor(position / gridDivisionTicks()) * gridDivisionTicks();
    const velocity = 127;

    const existingNote = newNote();

    const ticks = existingNote?.ticks ?? eventPositionTicks;
    const durationTicks = existingNote?.ticks
      ? eventPositionTicks - existingNote?.ticks
      : gridDivisionTicks();

    const note = { midi, ticks, durationTicks, velocity };

    if (existingNote) {
      context.onNoteChange?.(newNoteIndex(), note);
      return newNoteIndex();
    } else {
      return context.onInsertNote?.(note) ?? -1;
    }
  };

  const [isDragging, setIsDragging] = createSignal(false);
  const [noteDragMode, setNoteDragMode] = createSignal<NoteDragMode>();
  const [newNoteIndex, setNewNoteIndex] = createSignal(-1);
  const [isMouseDown, setIsMouseDown] = createSignal(false);

  const newNote = createMemo(() => context.notes[newNoteIndex()]);

  const getClasses = (noteDragMode: NoteDragMode) => {
    return noteDragMode ? [styles.Note, styles[noteDragMode]] : [styles.Note];
  };

  return (
    <div
      class={styles.PianoRollNotes}
      ref={props.ref}
      onMouseDown={() => {
        console.log("down");
        setIsMouseDown(true);
      }}
      onMouseMove={(event) => {
        if (isDragging()) return;

        if (!isMouseDown()) {
          setNoteDragMode(undefined);
          return;
        }

        const index = insertOrUpdateNote(event);

        console.log({ index });

        setNewNoteIndex(index);
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
        if (newNote()) {
          setNewNoteIndex(-1);
          return;
        }
        if (!event.altKey) return;
        insertOrUpdateNote(event);
      }}
    >
      <Index each={context.notes}>
        {(note, index) => {
          const verticalVirtualDimensionss = createMemo(() =>
            verticalViewPort().calculatePixelDimensions(127 - note().midi, 1),
          );

          const horizontalDimensions = createMemo(() =>
            horizontalViewPort().calculatePixelDimensions(note().ticks, note().durationTicks),
          );

          return (
            <Show when={!!verticalVirtualDimensionss().size && !!horizontalDimensions().size}>
              <div
                class={getClasses(noteDragMode()).join(" ")}
                onMouseMove={(event) => {
                  if (isDragging()) return;
                  event.stopPropagation();

                  const relativeX = horizontalViewPort().calculatePixelValue(
                    horizontalViewPort().calculatePosition(event.clientX),
                  );
                  const noteStartX = horizontalViewPort().calculatePixelValue(note().ticks);
                  const noteEndX = horizontalViewPort().calculatePixelValue(
                    note().ticks + note().durationTicks,
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
                  context.onRemoveNote?.(index);
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();

                  setIsDragging(true);
                  const initialPosition = horizontalViewPort().calculatePosition(event.clientX);
                  const diffPosition = initialPosition - note().ticks;

                  const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
                    const ticks = snapValueToGridIfEnabled(
                      Math.max(
                        horizontalViewPort().calculatePosition(mouseMoveEvent.clientX) -
                          diffPosition,
                        0,
                      ),
                      mouseMoveEvent.altKey,
                    );

                    context.onNoteChange?.(index, {
                      ...note(),
                      ...(noteDragMode() === "move" && {
                        midi: Math.round(
                          127 - verticalViewPort().calculatePosition(mouseMoveEvent.clientY),
                        ),
                      }),
                      ...((noteDragMode() === "move" || noteDragMode() === "trimStart") && {
                        ticks,
                      }),
                      ...(noteDragMode() === "trimStart" && {
                        durationTicks: note().durationTicks + note().ticks - ticks,
                      }),
                      ...(noteDragMode() === "trimEnd" && {
                        durationTicks: snapValueToGridIfEnabled(
                          horizontalViewPort().calculatePosition(mouseMoveEvent.clientX) -
                            note().ticks,
                          mouseMoveEvent.altKey,
                        ),
                      }),
                    });
                  };
                  const handleMouseUp = () => {
                    setIsDragging(false);
                    window.removeEventListener("mousemove", handleMouseMove);
                    window.removeEventListener("mouseup", handleMouseUp);
                  };
                  window.addEventListener("mousemove", handleMouseMove);
                  window.addEventListener("mouseup", handleMouseUp);
                }}
                style={{
                  "background-color": `rgba(255,0,0, ${(128 + note().velocity) / 256})`,
                  top: `${verticalVirtualDimensionss().offset}px`,
                  height: `${verticalVirtualDimensionss().size}px`,
                  left: `${horizontalDimensions().offset}px`,
                  width: `${horizontalDimensions().size}px`,
                }}
              ></div>
            </Show>
          );
        }}
      </Index>
    </div>
  );
};

export default PianoRollNotes;
