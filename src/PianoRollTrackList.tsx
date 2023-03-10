import styles from "./PianoRollTrackList.module.css";
import { createMemo, Index, Show } from "solid-js";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";
import { usePianoRollContext } from "./PianoRollContext";

const PianoRollTrackList = () => {
  const viewPort = createMemo(() => useViewPortDimension("verticalTracks"));
  const context = usePianoRollContext();

  return (
    <div class={styles.PianoRollTrackList}>
      <Index each={context.tracks}>
        {(track, index) => {
          const virtualDimensions = createMemo(() => viewPort().calculatePixelDimensions(index, 1));

          return (
            <Show when={virtualDimensions().size > 0}>
              <div
                classList={{
                  [styles["Track"]]: true,
                  [styles["selected"]]: index === context.selectedTrackIndex,
                }}
                title={track().name}
                style={{
                  top: `${virtualDimensions().offset}px`,
                  height: `${virtualDimensions().size}px`,
                }}
                onClick={() => context.onSelectedTrackIndexChange?.(index)}
              >
                {index} {track().name || "[unnamed track]"}
              </div>
            </Show>
          );
        }}
      </Index>
    </div>
  );
};

export default PianoRollTrackList;
