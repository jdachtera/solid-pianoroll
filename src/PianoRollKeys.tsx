import styles from "./PianoRollKeys.module.css";
import { createEffect, createMemo, createSignal, Index, Show } from "solid-js";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import { usePianoRollContext } from "./PianoRollContext";

const PianoRollKeys = () => {
  const viewPort = createMemo(() => useViewPortDimension("vertical"));
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
    <div class={styles.PianoRollKeys}>
      <Index each={keys}>
        {(key) => {
          const isDown = createMemo(() => context.pressedKeys.includes(key().number));

          const handleKeyDown = () => {
            context.onPressedKeysChange?.([...context.pressedKeys, key().number]);
          };

          const handleKeyUp = () => {
            context.onPressedKeysChange?.(
              [...context.pressedKeys].filter((number) => number !== key().number),
            );
          };

          const virtualDimensions = createMemo(() =>
            viewPort().calculatePixelDimensions(127 - key().number, 1),
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
                  handleKeyDown();
                }}
                onMouseUp={() => {
                  handleKeyUp();
                }}
                onMouseEnter={() => {
                  if (isMouseDown()) {
                    handleKeyDown();
                  }
                }}
                onMouseLeave={() => {
                  if (isMouseDown()) {
                    handleKeyUp();
                  }
                }}
                title={key().name}
                data-index={key().number % 12}
                style={{
                  top: `${
                    virtualDimensions().offset -
                    (!key().isBlack && nextIsBlack ? virtualDimensions().size / 2 : 0)
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
              >
                <Show when={key().isBlack && false}>
                  <div
                    class={styles["black-separator"]}
                    style={{
                      top: `${virtualDimensions().offset}px`,
                      height: `${virtualDimensions().size / 2 - 0.25}px`,
                    }}
                  ></div>
                </Show>
              </div>
            </Show>
          );
        }}
      </Index>
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
