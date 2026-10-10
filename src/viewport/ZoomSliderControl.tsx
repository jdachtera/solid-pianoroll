import { createMemo, mergeProps } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";
import { useViewPortDimension } from "./ScrollZoomViewPort";
import styles from "./ZoomSliderControl.module.css";

/**
 * A zoom slider for one viewport dimension, drawn by the roll itself rather
 * than as a native range input: a native slider looks like the platform's
 * (and, vertical, cannot be styled the same way everywhere), where this one
 * takes the host app's palette through the --pianoroll-slider-* variables.
 * Vertical sliders run bottom (least zoom) to top (most).
 */
const ZoomSliderControl = (props: {
  dimensionName?: string;
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  style?: JSX.CSSProperties;
}) => {
  const p = mergeProps({ orientation: "horizontal" as const }, props);
  const dimension = createMemo(() => useViewPortDimension(p.dimensionName ?? p.orientation));
  const vertical = () => p.orientation === "vertical";

  const fraction = () => {
    const d = dimension();
    const span = d.maxZoom - d.minZoom;
    return span > 0 ? Math.min(1, Math.max(0, (d.zoom - d.minZoom) / span)) : 0;
  };
  const setFraction = (f: number) => {
    const d = dimension();
    const clamped = Math.min(1, Math.max(0, f));
    d.onZoomChange?.(d.minZoom + clamped * (d.maxZoom - d.minZoom));
  };

  let track: HTMLDivElement | undefined;
  const fromPointer = (event: PointerEvent) => {
    if (track === undefined) return;
    const r = track.getBoundingClientRect();
    setFraction(
      vertical() ? 1 - (event.clientY - r.top) / r.height : (event.clientX - r.left) / r.width,
    );
  };

  return (
    <div
      class={styles.ZoomSlider}
      classList={{
        [styles.vertical]: vertical(),
        [styles.horizontal]: !vertical(),
        [styles.disabled]: p.disabled,
      }}
      style={p.style}
      role="slider"
      tabIndex={p.disabled ? -1 : 0}
      aria-orientation={p.orientation}
      aria-valuemin={dimension().minZoom}
      aria-valuemax={dimension().maxZoom}
      aria-valuenow={dimension().zoom}
      aria-disabled={p.disabled}
      onPointerDown={(event) => {
        if (p.disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        fromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) fromPointer(event);
      }}
      onKeyDown={(event) => {
        if (p.disabled) return;
        const up = event.key === "ArrowUp" || event.key === "ArrowRight";
        const down = event.key === "ArrowDown" || event.key === "ArrowLeft";
        if (!up && !down) return;
        event.preventDefault();
        setFraction(fraction() + (up ? 0.05 : -0.05));
      }}
    >
      <div ref={track} class={styles.track}>
        <div
          class={styles.fill}
          style={
            vertical() ? { height: `${fraction() * 100}%` } : { width: `${fraction() * 100}%` }
          }
        />
        <div
          class={styles.thumb}
          style={vertical() ? { bottom: `${fraction() * 100}%` } : { left: `${fraction() * 100}%` }}
        />
      </div>
    </div>
  );
};

export default ZoomSliderControl;
