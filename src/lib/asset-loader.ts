import assetSizes from "virtual:asset-sizes";

export type AssetStatus = "loading" | "done" | "error";

export type AssetProgress = {
  name: string;
  loaded: number;
  total: number;
  status: AssetStatus;
};

type TrackedAsset = {
  url: string;
  // Settles once a download succeeds, however many retries that takes, so
  // components suspending on it never see a failure. Failures surface through
  // the progress snapshot instead, where the overlay offers a retry.
  ready: Promise<Blob>;
  resolve: (blob: Blob) => void;
};

const tracked = new Map<string, TrackedAsset>();
const listeners = new Set<() => void>();
let snapshot: AssetProgress[] = [];

function setProgress(name: string, update: Partial<AssetProgress>) {
  snapshot = snapshot.map((asset) =>
    asset.name === name ? { ...asset, ...update } : asset,
  );
  for (const listener of listeners) listener();
}

async function download(name: string) {
  const asset = tracked.get(name)!;
  setProgress(name, { loaded: 0, status: "loading" });
  try {
    const response = await fetch(asset.url);
    if (!response.ok || !response.body) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    // The stream yields decompressed bytes, which match the on-disk size.
    const reader = response.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      setProgress(name, { loaded });
    }
    const type = response.headers.get("Content-Type") ?? "";
    asset.resolve(new Blob(chunks, { type }));
    setProgress(name, { status: "done" });
  } catch (error) {
    console.error(`Failed to load ${name}`, error);
    setProgress(name, { status: "error" });
  }
}

// Starts downloading an asset right away and returns a promise for its bytes.
// `name` is the source file name, which keys its size in `virtual:asset-sizes`.
export function loadAsset(url: string, name: string): Promise<Blob> {
  const existing = tracked.get(name);
  if (existing) return existing.ready;

  let resolve!: (blob: Blob) => void;
  const ready = new Promise<Blob>((res) => (resolve = res));
  tracked.set(name, { url, ready, resolve });
  snapshot = [
    ...snapshot,
    { name, loaded: 0, total: assetSizes[name] ?? 0, status: "loading" },
  ];
  void download(name);
  return ready;
}

// Restarts every failed download; finished ones are kept.
export function retryFailedAssets() {
  for (const asset of snapshot) {
    if (asset.status === "error") void download(asset.name);
  }
}

export function subscribeToAssets(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAssetProgress() {
  return snapshot;
}
