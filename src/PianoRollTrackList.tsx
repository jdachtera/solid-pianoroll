import styles from "./PianoRollTrackList.module.css";
import { createMemo, Index, Show } from "solid-js";
import { useAxis } from "solid-viewport";
import { usePianoRollContext } from "./PianoRollContext";

const PianoRollTrackList = () => {
  const viewPort = createMemo(() => useAxis("verticalTracks"));
  const context = usePianoRollContext();

  return (
    <div class={styles.PianoRollTrackList}>
      <Index each={context.tracks}>
        {(track, index) => {
          const virtualDimensions = createMemo(() => viewPort().dimensions(index, 1));

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
                  "--track-color": track().color,
                }}
                onClick={() => context.onSelectedTrackIndexChange?.(index)}
              >
                <span class={styles.Number}>{index + 1}</span>
                <span classList={{ [styles.Name]: true, [styles.unnamed]: !track().name }}>
                  {track().name || "Untitled"}
                </span>
                <span class={styles.Count}>{track().notes.length}</span>
              </div>
            </Show>
          );
        }}
      </Index>
    </div>
  );
};

export default PianoRollTrackList;
