// Progress through the steps that follow the downloads: decoding the KTX2
// textures, compiling the scene's shaders, and rendering the first frame. The
// loading overlay reads this alongside the download progress.

export type Steps = { done: number; total: number };

export type LoadStages = {
  // `pending` counts sources whose texture count isn't known yet, like a
  // model still downloading; until it's 0, the total can still grow.
  textures: Steps & { pending: number };
  shaders: Steps;
  firstFrame: boolean;
};

const listeners = new Set<() => void>();
let snapshot: LoadStages = {
  textures: { done: 0, total: 0, pending: 0 },
  shaders: { done: 0, total: 0 },
  firstFrame: false,
};

function update(next: Partial<LoadStages>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

// Adds textures to the count expected to decode.
export function expectTextures(count: number) {
  const { textures } = snapshot;
  update({ textures: { ...textures, total: textures.total + count } });
}

// For a source whose texture count is only known later; call the returned
// function with the count once it is.
export function expectTexturesLater() {
  const { textures } = snapshot;
  update({ textures: { ...textures, pending: textures.pending + 1 } });
  return (count: number) => {
    const { textures } = snapshot;
    update({
      textures: {
        ...textures,
        total: textures.total + count,
        pending: textures.pending - 1,
      },
    });
  };
}

export function textureDecoded() {
  const { textures } = snapshot;
  update({ textures: { ...textures, done: textures.done + 1 } });
}

export function shadersProgress(done: number, total: number) {
  update({ shaders: { done, total } });
}

export function firstFrameRendered() {
  if (!snapshot.firstFrame) update({ firstFrame: true });
}

export function subscribeToStages(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLoadStages() {
  return snapshot;
}
