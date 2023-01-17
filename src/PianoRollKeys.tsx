import styles from "./PianoRollKeys.module.css";
import { createEffect, createMemo, createSignal, Index, Show } from "solid-js";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import { usePianoRollContext } from "./PianoRollContext";
import ScrollZoomContainer from "./viewport/ScrollZoomContainer";

const PianoRollKeys = () => {
  const verticalViewPort = createMemo(() => useViewPortDimension("vertical"));
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontalKeys"));
  const [isMouseDown, setIsMouseDown] = createSignal(false);
  const context = usePianoRollContext();

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  createEffect(() => {
    if (isMouseDown()) {
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mouseup", handleMouseUp);
    }
  });

  return (
    <div class={styles.PianoRollKeys} style={{ width: `${horizontalViewPort().pixelSize}px` }}>
      <ScrollZoomContainer horizontalDimensionName="horizontalKeys" showScrollbar={false}>
        <Index each={keys}>
          {(key) => {
            const isDown = createMemo(() =>
              context.isKeyDown(context.selectedTrackIndex, key().number),
            );
            const virtualDimensions = createMemo(() =>
              verticalViewPort().calculatePixelDimensions(127 - key().number, 1),
            );

            const previousIsBlack = blackKeys.includes((key().number - 1) % 12);
            const nextIsBlack = blackKeys.includes((key().number + 1) % 12);

            return (
              <Show when={virtualDimensions().size > 0}>
                <div
                  classList={{
                    [styles["Key"]]: true,
                    [styles["black"]]: key().isBlack,
                    [styles["white"]]: !key().isBlack,
                    [styles["down"]]: isDown(),
                  }}
                  onMouseDown={() => {
                    setIsMouseDown(true);
                    context.onNoteDown(context.selectedTrackIndex, key().number);
                  }}
                  onMouseUp={() => {
                    context.onNoteUp(context.selectedTrackIndex, key().number);
                  }}
                  onMouseEnter={() => {
                    if (isMouseDown()) {
                      context.onNoteDown(context.selectedTrackIndex, key().number);
                    }
                  }}
                  onMouseLeave={() => {
                    if (isMouseDown()) {
                      context.onNoteUp(context.selectedTrackIndex, key().number);
                    }
                  }}
                  title={key().name}
                  data-index={key().number % 12}
                  style={{
                    top: `${
                      virtualDimensions().offset -
                      virtualDimensions().size * (!key().isBlack ? (nextIsBlack ? 1 / 2 : 0) : 0)
                    }px`,
                    height: `${
                      virtualDimensions().size +
                      (!key().isBlack && nextIsBlack ? virtualDimensions().size / 2 : 0) +
                      (!key().isBlack && previousIsBlack ? virtualDimensions().size / 2 : 0)
                    }px`,
                    "box-shadow": [
                      `0px 0px ${Math.min(virtualDimensions().size / 20, 1)}px ${Math.min(
                        virtualDimensions().size / 50,
                        1,
                      )}px rgba(0, 0, 0, 0.5) ${key().isBlack ? "" : "inset"}`,
                      isDown() &&
                        `0px 0px ${Math.min(virtualDimensions().size / 8, 2)}px ${Math.min(
                          virtualDimensions().size / 20,
                          2,
                        )}px rgba(0, 0, 0, 0.5) inset`,
                    ]
                      .filter((item) => !!item)
                      .join(", "),
                  }}
                ></div>
              </Show>
            );
          }}
        </Index>
      </ScrollZoomContainer>
    </div>
  );
};

export const blackKeys = [1, 3, 6, 8, 10];
export const keyNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const keys = Array.from({ length: 128 }).map((_, index) => ({
  number: index,
  name: `${keyNames[index % 12]} ${Math.floor(index / 12) - 2}`,
  isBlack: blackKeys.includes(index % 12),
}));

export default PianoRollKeys;
