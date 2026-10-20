import { useEffect, useState, useSyncExternalStore } from "react";
import { CircleAlertIcon, LoaderCircleIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getAssetProgress,
  retryFailedAssets,
  subscribeToAssets,
} from "@/lib/asset-loader";
import { cn } from "@/lib/utils";

// Loads from the browser cache finish well within this, so returning visitors
// never see the overlay flash.
const SHOW_DELAY_MS = 200;
const FADE_MS = 300;

function megabytes(bytes: number) {
  return (bytes / 1_000_000).toFixed(1);
}

// Covers the app while the tracked assets download, with a byte-accurate bar
// and the file currently downloading. Fades out once everything is in.
export function LoadingOverlay() {
  const assets = useSyncExternalStore(subscribeToAssets, getAssetProgress);
  const done =
    assets.length > 0 && assets.every((asset) => asset.status === "done");
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
  const failed = assets.find((asset) => asset.status === "error");
  // Name the largest file still downloading; the small ones finish first.
  const current = assets
    .filter((asset) => asset.status === "loading")
    .reduce<(typeof assets)[number] | undefined>(
      (largest, asset) =>
        !largest || asset.total > largest.total ? asset : largest,
      undefined,
    );

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
              value={total > 0 ? Math.min((loaded / total) * 100, 100) : null}
              aria-label="Loading assets"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {/* Announce file changes only, not every byte count. */}
              <span role="status">{current?.name ?? "Finishing up"}</span>
              {current && (
                <span aria-hidden>
                  {" — "}
                  {megabytes(current.loaded)} / {megabytes(current.total)} MB
                </span>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
