import { Midi } from "@tonejs/midi";

import {
  JSX,
  createMemo,
  splitProps,
  createSignal,
  onMount,
  onCleanup,
  Index,
  createEffect,
  Show,
} from "solid-js";
import { clamp } from "./helpers";
import useViewPortScaler from "./useViewPortScaler";

type Note = Pick<
  ReturnType<Midi["tracks"][number]["notes"][number]["toJSON"]>,
  "durationTicks" | "midi" | "ticks" | "velocity"
>;

type PianoRollProps = {
  ppq: number;
  notes: Note[];

  verticalPosition: number;
  verticalZoom: number;

  position: number;
  duration: number;
  zoom: number;

  onVerticalZoomChange?: (zoom: number) => void;
  onVerticalPositionChange?: (zoom: number) => void;
  onZoomChange?: (zoom: number) => void;
  onPositionChange?: (zoom: number) => void;

  onNoteChange?: (index: number, note: Note) => void;
} & JSX.IntrinsicElements["div"];

const PianoRoll = (allProps: PianoRollProps) => {
  let scrollContainerRef: HTMLDivElement | undefined;
  let scrollContentRef: HTMLDivElement | undefined;
  let notesContainerRef: HTMLDivElement | undefined;

  const [props, divProps] = splitProps(allProps, [
    "ppq",
    "notes",
    "position",
    "duration",
    "zoom",
    "verticalPosition",
    "verticalZoom",
    "onVerticalZoomChange",
    "onVerticalPositionChange",
    "onZoomChange",
    "onPositionChange",
    "onNoteChange",
  ]);

  const [dimensions, setDimensions] = createSignal<{
    left: number;
    width: number;
    top: number;
    height: number;
  }>({
    left: 0,
    width: 0,
    top: 0,
    height: 0,
  });

  const resizeObserver = new ResizeObserver((event) => {
    const { left, top, width, height } = scrollContainerRef?.getBoundingClientRect() ?? {
      left: 0,
      width: 0,
      top: 0,
      height: 0,
    };
    setDimensions({ left, top, width, height });
  });

  createEffect(() => {
    console.log(props.notes);
  });
  onMount(() => {
    if (!scrollContainerRef) return;
    resizeObserver.observe(scrollContainerRef);
  });

  onCleanup(() => {
    resizeObserver.disconnect();
  });

  const horizontalViewPort = useViewPortScaler(() => ({
    viewPortOffset: dimensions().left,
    viewPortSize: dimensions().width,
    virtualPosition: props.position,
    virtualRange: props.duration,
    zoom: props.zoom,
  }));

  const verticalViewPort = useViewPortScaler(() => ({
    viewPortOffset: dimensions().top,
    viewPortSize: dimensions().height,
    virtualPosition: props.verticalPosition,
    virtualRange: 128,
    zoom: props.verticalZoom,
  }));

  const handleScroll = (event: UIEvent & { currentTarget: Element }) => {
    event.preventDefault();

    if (didUpdateScroll) {
      didUpdateScroll = false;
      return;
    }
    const maxVerticalPosition = 128 - 128 / props.verticalZoom;
    const maxPosition = props.duration - props.duration / props.zoom;

    const { width, height } = dimensions();
    const { scrollTop, scrollLeft, scrollWidth, scrollHeight } = event.currentTarget;

    const scrollTopAmount = scrollTop / (scrollHeight - height);
    const scrollLeftAmount = scrollLeft / (scrollWidth - width);

    props.onVerticalPositionChange?.(maxVerticalPosition * scrollTopAmount);
    props.onPositionChange?.(maxPosition * scrollLeftAmount);
  };

  let didUpdateScroll = false;

  createEffect(() => {
    const maxVerticalPosition = 128 - 128 / props.verticalZoom;
    const maxPosition = props.duration - props.duration / props.zoom;

    const scrollTopAmount =
      maxVerticalPosition > 0 ? props.verticalPosition / maxVerticalPosition : 0;
    const scrollLeftAmount = maxPosition > 0 ? props.position / maxPosition : 0;

    const { height, width } = dimensions();

    if (!scrollContentRef?.parentElement) return;

    const scrollDivHeight = clamp(props.verticalZoom * height, height, 10000);
    const scrollTop = scrollTopAmount * (scrollDivHeight - height);

    const scrollDivWidth = clamp(props.zoom * width, width, 10000);
    const scrollLeft = scrollLeftAmount * (scrollDivWidth - width);

    didUpdateScroll = true;

    scrollContentRef.style.height = `${scrollDivHeight}px`;
    scrollContentRef.style.width = `${scrollDivWidth}px`;

    scrollContentRef.parentElement.scrollTo({
      left: scrollLeft,
      top: scrollTop,
    });
  });

  const forwardEventToNote = (event: MouseEvent | PointerEvent | TouchEvent) => {
    const x = "clientX" in event ? event.clientX : event.touches[0]?.clientX;
    const y = "clientY" in event ? event.clientY : event.touches[0]?.clientY;

    const elementUnderMouse = [...(notesContainerRef?.querySelectorAll?.("div") ?? [])].find(
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

  type NoteDragMode = "trimStart" | "move" | "trimEnd";
  const [noteDragMode, setNoteDragMode] = createSignal<NoteDragMode>();
  const [isDragging, setIsDragging] = createSignal(false);

  return (
    <div
      {...divProps}
      class="PianoRoll"
      style={{
        "box-sizing": "border-box",
        display: "flex",
        overflow: "hidden",
        "flex-direction": "column",
        padding: "16px",
        ...(typeof divProps.style === "object" && divProps.style),
      }}
    >
      <div
        style={{
          overflow: "hidden",
          height: "100%",
          display: "flex",
          "flex-direction": "row",
        }}
      >
        <div
          class="PianoRoll-Keys"
          style={{
            position: "relative",
            height: "100%",
            width: `${50}px`,
          }}
        >
          <Index each={keys}>
            {(key) => {
              const virtualDimensions = createMemo(() =>
                verticalViewPort.getVirtualDimensions(127 - key().number, 1),
              );

              return (
                <Show when={virtualDimensions().size > 0}>
                  <div
                    class="PianoRoll-Key"
                    title={key().name}
                    data-index={key().number % 12}
                    style={{
                      position: "absolute",
                      "box-sizing": "border-box",
                      left: 0,
                      top: `${virtualDimensions().offset}px`,
                      height: `${virtualDimensions().size}px`,
                      width: "100%",
                      "background-color": key().isBlack ? "#000" : "#fff",
                      "border-width": `${
                        !key().isBlack && !blackKeys.includes((key().number + 1) % 12) ? "0.1px" : 0
                      } 1px ${
                        !key().isBlack && !blackKeys.includes((key().number - 1) % 12) ? "0.1px" : 0
                      } 0`,
                      "border-color": "#000",

                      "border-style": "solid",
                    }}
                  ></div>
                </Show>
              );
            }}
          </Index>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            overflow: "hidden",
            flex: 1,
          }}
        >
          <div
            class="PianoRoll-Notes-Container"
            style={{
              position: "absolute",
              width: `${dimensions().width}px`,
              height: `${dimensions().height}px`,
            }}
          >
            <div
              class="PianoRoll-Notes"
              ref={notesContainerRef}
              style={{
                position: "relative",
                width: `${dimensions().width}px`,
                height: "100%",
              }}
            >
              <Index each={props.notes}>
                {(note, index) => {
                  const horizontalVirtualDimensions = createMemo(() =>
                    verticalViewPort.getVirtualDimensions(127 - note().midi, 1),
                  );

                  const verticalVirtualDimensions = createMemo(() =>
                    horizontalViewPort.getVirtualDimensions(note().ticks, note().durationTicks),
                  );

                  return (
                    <Show
                      when={
                        !!horizontalVirtualDimensions().size && !!verticalVirtualDimensions().size
                      }
                    >
                      <div
                        class="PianoRoll-Note"
                        onMouseMove={(event) => {
                          if (isDragging()) return;

                          const relativeX = horizontalViewPort.getScaledValue(
                            horizontalViewPort.getPosition(event.clientX),
                          );
                          const noteStartX = horizontalViewPort.getScaledValue(note().ticks);
                          const noteEndX = horizontalViewPort.getScaledValue(
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
                        onMouseDown={(event) => {
                          setIsDragging(true);
                          const initialPosition = horizontalViewPort.getPosition(event.clientX);
                          const diffPosition = initialPosition - note().ticks;

                          const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
                            const ticks = Math.max(
                              horizontalViewPort.getPosition(mouseMoveEvent.clientX) - diffPosition,
                              0,
                            );

                            props.onNoteChange?.(index, {
                              ...note(),
                              midi: Math.round(
                                127 - verticalViewPort.getPosition(mouseMoveEvent.clientY),
                              ),
                              ...((noteDragMode() === "move" || noteDragMode() === "trimStart") && {
                                ticks,
                              }),
                              ...(noteDragMode() === "trimStart" && {
                                durationTicks: note().durationTicks + note().ticks - ticks,
                              }),
                              ...(noteDragMode() === "trimEnd" && {
                                durationTicks:
                                  horizontalViewPort.getPosition(mouseMoveEvent.clientX) -
                                  note().ticks,
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
                          "z-index": 1,

                          position: "absolute",
                          "box-sizing": "border-box",
                          top: `${horizontalVirtualDimensions().offset}px`,
                          height: `${horizontalVirtualDimensions().size}px`,
                          left: `${verticalVirtualDimensions().offset}px`,
                          width: `${verticalVirtualDimensions().size}px`,
                          "border-width": "0.5px",
                          "border-style": "solid",
                          "background-color": "#f00",
                          "border-color": "#a00",
                        }}
                      ></div>
                    </Show>
                  );
                }}
              </Index>
            </div>
          </div>
          <div
            ref={scrollContainerRef}
            class="PianoRoll-Vertical-Scroller"
            style={{
              flex: 1,
              ...(noteDragMode() && {
                cursor:
                  noteDragMode() === "trimStart"
                    ? "w-resize"
                    : noteDragMode() === "trimEnd"
                    ? "e-resize"
                    : "pointer",
              }),
              //"box-sizing": "border-box",
              "z-index": 1,
              overflow: "scroll",
              "pointer-events": "auto",
            }}
            onScroll={handleScroll}
            onMouseDown={forwardEventToNote}
            onMouseMove={(event) => {
              if (forwardEventToNote(event)) return;
              if (isDragging()) return;
              setNoteDragMode(undefined);
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
        </div>

        <input
          value={props.verticalZoom}
          onInput={(event) => props.onVerticalZoomChange?.(event.currentTarget.valueAsNumber)}
          type="range"
          min="1"
          max="11"
          step={0.01}
          {...{ orient: "vertical" }}
          style={{
            width: "16px",
            ...({
              "writing-mode": "bt-lr" /* IE */,
              "-webkit-appearance": "slider-vertical" /* WebKit */,
            } as any),
          }}
        />
      </div>

      <input
        value={props.zoom}
        onInput={(event) => props.onZoomChange?.(event.currentTarget.valueAsNumber)}
        type="range"
        max="500"
        min="1"
        step={0.01}
        style={{
          "margin-left": "50px",
          "margin-right": "16px",
        }}
      />
    </div>
  );
};

const blackKeys = [1, 3, 6, 8, 10];
const keyNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const keys = Array.from({ length: 128 }).map((_, index) => ({
  number: index,
  name: `${keyNames[index % 12]} ${Math.floor(index / 12) - 2}`,
  isBlack: blackKeys.includes(index % 12),
}));

export default PianoRoll;
