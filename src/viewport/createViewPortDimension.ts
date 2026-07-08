import { createViewPortAxis } from "solid-viewport";

// One piano-roll axis, now backed by solid-viewport's createViewPortAxis. This is an
// adapter: the method names below (calculatePixel*/calculatePosition/isVisible) are
// kept so PianoRollNotes/Keys/Grid/Scale/PlayHead and the scroll container are
// untouched, while the math comes from the shared library. Mapping:
//   calculatePixelValue     = toPixels
//   calculatePixelOffset    = toPixelOffset
//   calculatePosition       = toPosition
//   calculatePixelDimensions= dimensions     (raw offset/size, culled via isVisible)
//   calculateVisibleRange   = visibleRange
//   calculateMaxPosition    = maxPosition
//   isVisible               = isVisible
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

  minZoom: number;
  maxZoom: number;
};

export default function createViewPortDimension(getState: () => ViewPortDimensionState) {
  const axis = createViewPortAxis(() => {
    const s = getState();
    return {
      name: s.name,
      position: s.position,
      range: s.range,
      pixelOffset: s.pixelOffset,
      pixelSize: s.pixelSize,
      zoom: s.zoom,
      minZoom: s.minZoom,
      maxZoom: s.maxZoom,
      onPositionChange: s.onPositionChange,
      onZoomChange: s.onZoomChange,
    };
  });

  // Getters delegate to the axis store so reads stay reactive; methods delegate to
  // the axis's (rebuilt-on-change) scalers.
  return {
    get name() {
      return axis.name;
    },
    get position() {
      return axis.position;
    },
    get range() {
      return axis.range;
    },
    get pixelOffset() {
      return axis.pixelOffset;
    },
    get pixelSize() {
      return axis.pixelSize;
    },
    get zoom() {
      return axis.zoom;
    },
    get minZoom() {
      return axis.minZoom;
    },
    get maxZoom() {
      return axis.maxZoom;
    },
    onPositionChange: (position: number) => axis.onPositionChange?.(position),
    onZoomChange: (zoom: number) => axis.onZoomChange?.(zoom),
    calculatePixelValue: (position?: number) => axis.toPixels(position),
    calculatePixelOffset: (position: number) => axis.toPixelOffset(position),
    calculatePosition: (offset: number) => axis.toPosition(offset),
    calculatePixelDimensions: (position: number, length: number) =>
      axis.dimensions(position, length),
    calculateVisibleRange: () => axis.visibleRange(),
    calculateMaxPosition: () => axis.maxPosition(),
    isVisible: (dimensions: { offset: number; size: number }) => axis.isVisible(dimensions),
  };
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
