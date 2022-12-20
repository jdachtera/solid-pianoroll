import { createMemo } from "solid-js";

export type ViewPortScaler = ReturnType<typeof useViewPortScaler>;

export default function useViewPortScaler(
  getState: () => {
    virtualPosition: number;
    virtualRange: number;

    viewPortOffset: number;
    viewPortSize: number;

    zoom: number;
  },
) {
  const state = createMemo(() => getState());

  function getScaledValue(position: number) {
    const virtualSize = state().viewPortSize * state().zoom;
    return (position / state().virtualRange) * virtualSize;
  }

  function getCoordinates(position: number) {
    return getScaledValue(position) - getScaledValue(state().virtualPosition);
  }

  function getVisibleRange() {
    return state().virtualRange / state().zoom;
  }

  function getPosition(offset: number) {
    const percentX = (offset - state().viewPortOffset) / state().viewPortSize;
    const position = state().virtualPosition + percentX * getVisibleRange();

    return position;
  }

  function getMaxPosition() {
    return state().virtualRange - state().virtualRange / state().zoom;
  }

  function getScrollSize() {
    return clamp(state().zoom * state().viewPortSize, state().viewPortSize, 100000);
  }

  function getVirtualDimensions(position: number, length: number) {
    const virtualLeft = getCoordinates(position);
    const virtualWidth = getScaledValue(length);

    const offset = clamp(virtualLeft, 0, state().viewPortSize);
    const size = clamp(virtualWidth - (offset - virtualLeft), 0, state().viewPortSize - offset);

    return { offset, size };
  }

  return {
    getScaledValue,
    getCoordinates,
    getPosition,
    getVirtualDimensions,
    getVisibleRange,
    getMaxPosition,
    getScrollSize,
  };
}

export const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};
