import { createMemo, For, onCleanup, onMount, Show } from "solid-js";
import { createSignal } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import { clamp } from "./viewport/createViewPortDimension";
import styles from "./PianoRollAutomationLane.module.css";
import { AutomationParam, AutomationPoint } from "./types";

type ParamConfig = { min: number; max: number; fallback: number; label: string };

// Range + neutral default for each automatable parameter.
export const automationParamConfig: Record<AutomationParam, ParamConfig> = {
  volume: { min: 0, max: 1, fallback: 1, label: "Vol" },
  detune: { min: -1200, max: 1200, fallback: 0, label: "Detune" },
  playbackRate: { min: 0, max: 2, fallback: 1, label: "Rate" },
};

// Sample the piecewise-linear automation curve at `ticks`. Before the first
// point holds the first value, after the last holds the last; `fallback` is
// used when there are no points. Consumers read this at the playhead to drive
// a parameter.
export const automationValueAtTicks = (
  points: AutomationPoint[] | undefined,
  ticks: number,
  fallback: number,
): number => {
  if (!points || !points.length) return fallback;
  const sorted = [...points].sort((a, b) => a.ticks - b.ticks);
  const firstPoint = sorted[0];
  const lastPoint = sorted[sorted.length - 1];
  if (!firstPoint || !lastPoint) return fallback;
  if (ticks <= firstPoint.ticks) return firstPoint.value;
  if (ticks >= lastPoint.ticks) return lastPoint.value;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (!a || !b) continue;
    if (ticks >= a.ticks && ticks <= b.ticks) {
      const span = b.ticks - a.ticks;
      if (span <= 0) return b.value;
      return a.value + ((b.value - a.value) * (ticks - a.ticks)) / span;
    }
  }
  return fallback;
};

const PianoRollAutomationLane = () => {
  const context = usePianoRollContext();
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));

  const param = () => context.automationParam ?? "volume";
  const config = () => automationParamConfig[param()];
  const track = () => context.tracks[context.selectedTrackIndex];
  const points = () => track()?.automation?.[param()] ?? [];

  let laneElement: HTMLDivElement | undefined;
  const [laneHeight, setLaneHeight] = createSignal(100);

  const measure = () => laneElement && setLaneHeight(laneElement.clientHeight || 100);
  onMount(() => {
    measure();
    window.addEventListener("resize", measure);
  });
  onCleanup(() => window.removeEventListener("resize", measure));

  const ratioForValue = (value: number) => {
    const { min, max } = config();
    return max === min ? 0 : clamp((value - min) / (max - min), 0, 1);
  };

  const xForTicks = (ticks: number) => horizontalViewPort().calculatePixelOffset(ticks);
  const yForValue = (value: number) => (1 - ratioForValue(value)) * laneHeight();

  const ticksFromClientX = (clientX: number) => {
    const rect = laneElement?.getBoundingClientRect();
    const pixelsPerUnit = horizontalViewPort().calculatePixelValue(1);
    return pixelsPerUnit
      ? horizontalViewPort().position + (clientX - (rect?.left ?? 0)) / pixelsPerUnit
      : horizontalViewPort().position;
  };

  const valueFromClientY = (clientY: number) => {
    const rect = laneElement?.getBoundingClientRect();
    if (!rect || !rect.height) return config().fallback;
    const ratio = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    return config().min + ratio * (config().max - config().min);
  };

  // Local working copy + index of the point being dragged. Editing in place
  // keeps the dragged point stable even though the committed list is re-sorted.
  let workingPoints: AutomationPoint[] = [];
  let draggingIndex = -1;

  const commit = () => context.setSelectedTrackAutomation(param(), workingPoints);

  const handleMouseMove = (event: MouseEvent) => {
    event.preventDefault();
    if (draggingIndex < 0) return;
    const ticks = Math.max(
      0,
      context.snapValueToGridIfEnabled(ticksFromClientX(event.clientX), event.altKey),
    );
    const value = clamp(valueFromClientY(event.clientY), config().min, config().max);
    workingPoints = workingPoints.map((point, index) =>
      index === draggingIndex ? { ticks, value } : point,
    );
    commit();
  };

  const stopDragging = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", stopDragging);
    draggingIndex = -1;
    workingPoints = [];
  };

  onCleanup(stopDragging);

  const startDragging = () => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);
  };

  const addPointAt = (event: MouseEvent) => {
    event.preventDefault();
    const ticks = Math.max(
      0,
      context.snapValueToGridIfEnabled(ticksFromClientX(event.clientX), event.altKey),
    );
    const value = clamp(valueFromClientY(event.clientY), config().min, config().max);
    workingPoints = [...points(), { ticks, value }];
    draggingIndex = workingPoints.length - 1;
    commit();
    startDragging();
  };

  const grabPoint = (index: number, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    workingPoints = [...points()];
    draggingIndex = index;
    startDragging();
  };

  const removePoint = (index: number, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    context.setSelectedTrackAutomation(
      param(),
      points().filter((_, i) => i !== index),
    );
  };

  // The polyline through the points, extended flat to both edges so the curve
  // reads as a held value before the first / after the last breakpoint.
  const polyline = createMemo(() => {
    const list = points();
    const width = horizontalViewPort().pixelSize;
    if (!list.length) {
      const y = yForValue(config().fallback);
      return `0,${y} ${width},${y}`;
    }
    const segments = list.map((point) => `${xForTicks(point.ticks)},${yForValue(point.value)}`);
    const first = list[0];
    const last = list[list.length - 1];
    if (!first || !last) {
      const y = yForValue(config().fallback);
      return `0,${y} ${width},${y}`;
    }
    return [`0,${yForValue(first.value)}`, ...segments, `${width},${yForValue(last.value)}`].join(
      " ",
    );
  });

  return (
    <div class={styles.AutomationLane}>
      <div class={styles.Toolbar}>
        <For each={Object.keys(automationParamConfig) as AutomationParam[]}>
          {(name) => (
            <button
              type="button"
              classList={{
                [styles.ToolbarButton]: true,
                [styles.active]: param() === name,
              }}
              onClick={() => context.onAutomationParamChange(name)}
            >
              {automationParamConfig[name].label}
            </button>
          )}
        </For>
      </div>
      <div class={styles.Canvas} ref={laneElement} onMouseDown={addPointAt}>
        <svg
          class={styles.Svg}
          width="100%"
          height="100%"
          viewBox={`0 0 ${horizontalViewPort().pixelSize} ${laneHeight()}`}
          preserveAspectRatio="none"
        >
          <polyline
            points={polyline()}
            fill="none"
            stroke={track()?.color ?? "#ff9100"}
            stroke-width="1.5"
          />
        </svg>
        <For each={points()}>
          {(point, index) => (
            <Show
              when={horizontalViewPort().isVisible({ offset: xForTicks(point.ticks), size: 0 })}
            >
              <div
                class={styles.Point}
                style={{
                  left: `${xForTicks(point.ticks)}px`,
                  top: `${yForValue(point.value)}px`,
                  "background-color": track()?.color,
                }}
                onMouseDown={(event) => grabPoint(index(), event)}
                onDblClick={(event) => removePoint(index(), event)}
              ></div>
            </Show>
          )}
        </For>
      </div>
    </div>
  );
};

export default PianoRollAutomationLane;
