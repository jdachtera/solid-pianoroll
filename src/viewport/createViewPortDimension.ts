import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";

export type ViewPortDimension = ReturnType<typeof createViewPortDimension>;
export type ViewPortDimensionName = string;
export type ViewPortDimensionState = {
  position: number;
  range: number;

  pixelOffset: number;
  pixelSize: number;

  name: ViewPortDimensionName;

  onZoomChange?: (zoom: number) => void;
  onPositionChange?: (zoom: number) => void;

  zoom: number;
};

export default function createViewPortDimension(getState: () => ViewPortDimensionState) {
  const getStateWithFunctions = () => ({
    ...getState(),
    calculatePixelOffset,
    calculatePixelValue,
    calculatePosition,
    calculatePixelDimensions,
    calculateVisibleRange,
    calculateMaxPosition,
    isVisible,
  });

  const [state, setState] = createStore(getStateWithFunctions());

  createEffect(() => setState(getStateWithFunctions()));

  function calculatePixelValue(position: number = state.position) {
    const virtualSize = state.pixelSize * state.zoom;
    return (position / state.range) * virtualSize;
  }

  function calculatePixelOffset(position: number) {
    return calculatePixelValue(position) - calculatePixelValue(state.position);
  }

  function calculatePosition(offset: number) {
    const percentX = (offset - state.pixelOffset) / state.pixelSize;
    const position = state.position + percentX * calculateVisibleRange();

    return position;
  }

  function calculateVisibleRange() {
    return state.range / state.zoom;
  }

  function calculateMaxPosition() {
    return state.range - state.range / state.zoom;
  }

  function calculatePixelDimensions(position: number, length: number) {
    const offset = calculatePixelOffset(position);
    const size = calculatePixelValue(length);

    return { offset, size };
  }

  function isVisible({ offset, size }: { offset: number; size: number }) {
    return offset + size > 0 && offset < state.pixelSize;
  }

  return state;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
