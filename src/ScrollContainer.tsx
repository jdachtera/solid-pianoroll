import { createEffect, Ref } from "solid-js";
import { clamp } from "./helpers";
import { usePianoRollContext } from "./PianoRollContext";

const ScrollContainer = (props: { ref: Ref<HTMLDivElement> }) => {
  let scrollContentRef: HTMLDivElement | undefined;
  const context = usePianoRollContext();

  const forwardEventToNote = (event: MouseEvent | PointerEvent | TouchEvent) => {
    const x = "clientX" in event ? event.clientX : event.touches[0]?.clientX;
    const y = "clientY" in event ? event.clientY : event.touches[0]?.clientY;

    const elementUnderMouse = [...(context.notesContainer?.querySelectorAll?.("div") ?? [])].find(
      (element) => {
        const rect = element.getBoundingClientRect();

        return (
          x >= rect.left &&
          rect.left + rect.width > x &&
          y >= rect.top &&
          rect.top + rect.height > y
        );
      },
    );

    if (elementUnderMouse) {
      return elementUnderMouse.dispatchEvent(new MouseEvent(event.type, event));
    }
  };

  const handleScroll = (event: UIEvent & { currentTarget: Element }) => {
    event.preventDefault();

    if (didUpdateScroll) {
      didUpdateScroll = false;
      return;
    }
    const maxVerticalPosition = 128 - 128 / context.verticalZoom;
    const maxPosition = context.duration - context.duration / context.zoom;

    const { width, height } = context.clientRect;
    const { scrollTop, scrollLeft, scrollWidth, scrollHeight } = event.currentTarget;

    const scrollTopAmount = scrollTop / (scrollHeight - height);
    const scrollLeftAmount = scrollLeft / (scrollWidth - width);

    context.onVerticalPositionChange?.(maxVerticalPosition * scrollTopAmount);
    context.onPositionChange?.(maxPosition * scrollLeftAmount);
  };

  let didUpdateScroll = false;

  createEffect(() => {
    const maxVerticalPosition = 128 - 128 / context.verticalZoom;
    const maxPosition = context.duration - context.duration / context.zoom;

    const scrollTopAmount =
      maxVerticalPosition > 0 ? context.verticalPosition / maxVerticalPosition : 0;
    const scrollLeftAmount = maxPosition > 0 ? context.position / maxPosition : 0;

    const { height, width } = context.clientRect;

    if (!scrollContentRef?.parentElement) return;

    const scrollDivHeight = clamp(context.verticalZoom * height, height, 10000);
    const scrollTop = scrollTopAmount * (scrollDivHeight - height);

    const scrollDivWidth = clamp(context.zoom * width, width, 10000);
    const scrollLeft = scrollLeftAmount * (scrollDivWidth - width);

    didUpdateScroll = true;

    scrollContentRef.style.height = `${scrollDivHeight}px`;
    scrollContentRef.style.width = `${scrollDivWidth}px`;

    scrollContentRef.parentElement.scrollTo({
      left: scrollLeft,
      top: scrollTop,
    });
  });

  return (
    <div
      ref={props.ref}
      class="PianoRoll-Vertical-Scroller"
      style={{
        flex: 1,
        ...(context.noteDragMode && {
          cursor:
            context.noteDragMode === "trimStart"
              ? "w-resize"
              : context.noteDragMode === "trimEnd"
              ? "e-resize"
              : "pointer",
        }),
        //"box-sizing": "border-box",
        "z-index": 4,
        overflow: "scroll",
        "pointer-events": "auto",
      }}
      onScroll={handleScroll}
      onMouseDown={forwardEventToNote}
      onMouseMove={(event) => {
        if (forwardEventToNote(event)) return;
        if (context.isDragging) return;
        context.onNoteDragModeChange(undefined);
      }}
      onClick={forwardEventToNote}
      onDblClick={(event) => {
        if (!forwardEventToNote(event)) {
          //TODO create new note with current gutter length
        }
      }}
      onMouseUp={forwardEventToNote}
      onTouchStart={forwardEventToNote}
      onTouchMove={forwardEventToNote}
      onTouchEnd={forwardEventToNote}
      onTouchCancel={forwardEventToNote}
      onDragStart={forwardEventToNote}
      onDrag={forwardEventToNote}
      onDragEnd={forwardEventToNote}
    >
      <div ref={scrollContentRef}></div>
    </div>
  );
};

export default ScrollContainer;
