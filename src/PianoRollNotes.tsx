import { createEffect, createMemo, Index, Ref, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";

const PianoRollNotes = (props: { ref: Ref<HTMLDivElement | undefined> }) => {
  const context = usePianoRollContext();

  createEffect(() => {
    console.log(context.clientRect.width);
  });

  return (
    <div
      class="PianoRoll-Notes-Container"
      style={{
        position: "absolute",
        width: `${context.clientRect.width}px`,
        height: `${context.clientRect.height}px`,
      }}
    >
      <div
        class="PianoRoll-Notes"
        ref={props.ref}
        style={{
          position: "relative",
          width: `${context.clientRect.width}px`,
          height: "100%",
        }}
      >
        <Index each={context.notes}>
          {(note, index) => {
            const horizontalVirtualDimensions = createMemo(() =>
              context.verticalViewPort.getVirtualDimensions(127 - note().midi, 1),
            );

            const verticalVirtualDimensions = createMemo(() =>
              context.horizontalViewPort.getVirtualDimensions(note().ticks, note().durationTicks),
            );

            return (
              <Show
                when={!!horizontalVirtualDimensions().size && !!verticalVirtualDimensions().size}
              >
                <div
                  class="PianoRoll-Note"
                  onMouseMove={(event) => {
                    if (context.isDragging) return;

                    const relativeX = context.horizontalViewPort.getScaledValue(
                      context.horizontalViewPort.getPosition(event.clientX),
                    );
                    const noteStartX = context.horizontalViewPort.getScaledValue(note().ticks);
                    const noteEndX = context.horizontalViewPort.getScaledValue(
                      note().ticks + note().durationTicks,
                    );

                    context.onNoteDragModeChange(
                      relativeX - noteStartX < 3
                        ? "trimStart"
                        : noteEndX - relativeX < 3
                        ? "trimEnd"
                        : "move",
                    );
                  }}
                  onMouseDown={(event) => {
                    context.onIsDraggingChange(true);
                    const initialPosition = context.horizontalViewPort.getPosition(event.clientX);
                    const diffPosition = initialPosition - note().ticks;

                    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
                      const ticks = Math.max(
                        context.horizontalViewPort.getPosition(mouseMoveEvent.clientX) -
                          diffPosition,
                        0,
                      );

                      context.onNoteChange?.(index, {
                        ...note(),
                        midi: Math.round(
                          127 - context.verticalViewPort.getPosition(mouseMoveEvent.clientY),
                        ),
                        ...((context.noteDragMode === "move" ||
                          context.noteDragMode === "trimStart") && {
                          ticks,
                        }),
                        ...(context.noteDragMode === "trimStart" && {
                          durationTicks: note().durationTicks + note().ticks - ticks,
                        }),
                        ...(context.noteDragMode === "trimEnd" && {
                          durationTicks:
                            context.horizontalViewPort.getPosition(mouseMoveEvent.clientX) -
                            note().ticks,
                        }),
                      });
                    };
                    const handleMouseUp = () => {
                      context.onIsDraggingChange(false);
                      window.removeEventListener("mousemove", handleMouseMove);
                      window.removeEventListener("mouseup", handleMouseUp);
                    };
                    window.addEventListener("mousemove", handleMouseMove);
                    window.addEventListener("mouseup", handleMouseUp);
                  }}
                  style={{
                    "z-index": 1,
                    position: "absolute",
                    "box-sizing": "border-box",
                    top: `${horizontalVirtualDimensions().offset}px`,
                    height: `${horizontalVirtualDimensions().size}px`,
                    left: `${verticalVirtualDimensions().offset}px`,
                    width: `${verticalVirtualDimensions().size}px`,
                    "border-width": "0.5px",
                    "border-style": "solid",
                    "background-color": `rgba(255,0,0, ${(128 + note().velocity) / 256})`,
                    "border-color": "#a00",
                  }}
                ></div>
              </Show>
            );
          }}
        </Index>
      </div>
    </div>
  );
};

export default PianoRollNotes;
