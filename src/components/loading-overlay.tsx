import { useEffect, useState, useSyncExternalStore } from "react";
import { CircleAlertIcon, LoaderCircleIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getAssetProgress,
  retryFailedAssets,
  subscribeToAssets,
} from "@/lib/asset-loader";
import {
  getLoadStages,
  subscribeToStages,
  type Steps,
} from "@/lib/load-stages";
import { cn } from "@/lib/utils";

// Loads from the browser cache finish well within this, so returning visitors
// never see the overlay flash.
const SHOW_DELAY_MS = 200;
const FADE_MS = 300;

// Each stage's share of the bar. Rough estimates of their relative time on a
// first visit, not measurements; the bar fills to 100% only when the first
// frame is on screen.
const STAGE_WEIGHTS = {
  download: 0.7,
  textures: 0.15,
  shaders: 0.12,
  firstFrame: 0.03,
};

function fraction({ done, total }: Steps) {
  return total > 0 ? Math.min(done / total, 1) : 0;
}

function isComplete(steps: Steps & { pending?: number }) {
  return !steps.pending && steps.total > 0 && steps.done >= steps.total;
}

function megabytes(bytes: number) {
  return (bytes / 1_000_000).toFixed(1);
}

// Covers the app until the model is on screen: while the tracked assets
// download, their textures decode, the shaders compile and the first frame
// renders. One bar spans all four stages, and the line below names the
// current one. Fades out once the first frame is drawn.
export function LoadingOverlay() {
  const assets = useSyncExternalStore(subscribeToAssets, getAssetProgress);
  const stages = useSyncExternalStore(subscribeToStages, getLoadStages);
  const done = stages.firstFrame;
  const [shown, setShown] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setShown(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [done]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(timer);
  }, [done]);

  if (!shown || gone) return null;

  const loaded = assets.reduce((sum, asset) => sum + asset.loaded, 0);
  const total = assets.reduce((sum, asset) => sum + asset.total, 0);
  const progress =
    STAGE_WEIGHTS.download * fraction({ done: loaded, total }) +
    // Counted only once every total is known, so the bar never moves back.
    STAGE_WEIGHTS.textures *
      (stages.textures.pending > 0 ? 0 : fraction(stages.textures)) +
    STAGE_WEIGHTS.shaders * fraction(stages.shaders) +
    STAGE_WEIGHTS.firstFrame * (stages.firstFrame ? 1 : 0);
  const failed = assets.find((asset) => asset.status === "error");
  // Name the largest file still downloading; the small ones finish first.
  const current = assets
    .filter((asset) => asset.status === "loading")
    .reduce<(typeof assets)[number] | undefined>(
      (largest, asset) =>
        !largest || asset.total > largest.total ? asset : largest,
      undefined,
    );
  // The current stage and its count. Small downloads can finish while
  // textures already decode, so downloads take precedence.
  const [label, detail] = current
    ? [
        current.name,
        `${megabytes(current.loaded)} / ${megabytes(current.total)} MB`,
      ]
    : !isComplete(stages.textures)
      ? [
          "Decoding textures",
          stages.textures.pending === 0 &&
            stages.textures.total > 0 &&
            `${stages.textures.done} / ${stages.textures.total}`,
        ]
      : !isComplete(stages.shaders)
        ? [
            "Preparing shaders",
            stages.shaders.total > 0 &&
              `${stages.shaders.done} / ${stages.shaders.total}`,
          ]
        : ["Rendering", false];

  return (
    <div
      className={cn(
        "fixed inset-0 z-60 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#f3f3f3_55%,#e2e2e2_100%)] px-4 transition-opacity duration-300 motion-reduce:transition-none",
        done && "pointer-events-none opacity-0",
      )}
    >
      <div className="flex w-full max-w-64 flex-col items-center gap-4">
        {failed ? (
          <>
            <CircleAlertIcon className="size-6 text-destructive" />
            <p role="alert" className="text-center text-sm">
              Couldn't load {failed.name}
            </p>
            <Button variant="outline" onClick={retryFailedAssets}>
              <RotateCwIcon data-icon="inline-start" />
              Retry
            </Button>
          </>
        ) : (
          <>
            <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground motion-reduce:animate-[spin_2s_linear_infinite]" />
            <Progress
              value={Math.round(progress * 100)}
              aria-label="Loading"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {/* Announce stage changes only, not every count. */}
              <span role="status">{label}</span>
              {detail && <span aria-hidden>{` — ${detail}`}</span>}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
