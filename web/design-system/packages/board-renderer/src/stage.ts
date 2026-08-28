import { Application, Container } from 'pixi.js';

export interface StageOptions<L extends string> {
  /**
   * Layer names in back-to-front order. Fixing the z-order once, by name, is
   * what stops "why is the shadow on top of the stone" from being debugged per
   * game -- `go` uses `shadow, territory, stone, effects` and `chess` uses
   * `background, highlights, pieces, vfx, animating`.
   */
  layers: readonly L[];
  width: number;
  height: number;
  /** Defaults to `window.devicePixelRatio`. */
  resolution?: number;
  /** Defaults to false. Pixel art and crisp grid lines both want it off. */
  antialias?: boolean;
  /** Defaults to 0 -- the page's own background shows through. */
  backgroundAlpha?: number;
  backgroundColor?: number;
  /**
   * Abort a bring-up that is no longer wanted.
   *
   * `createStage` is async, so a React effect can unmount before it resolves --
   * which under StrictMode's double-mount is not an edge case but the first
   * thing that happens. Without this the orphaned `Application` keeps its WebGL
   * context and its canvas stays in the DOM. `go` guards this by hand with a
   * `destroyed` flag; `chess` does not guard it at all.
   */
  signal?: AbortSignal;
}

export interface Stage<L extends string> {
  app: Application;
  canvas: HTMLCanvasElement;
  /** The layer containers, by name, already added to the stage in order. */
  layers: Record<L, Container>;
  resize(width: number, height: number): void;
  destroy(): void;
}

/** True for the rejection `createStage` throws when its `signal` aborts. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Bring up a Pixi `Application` with named layers, sized for a board.
 *
 * Pass an existing `<canvas>` to render into it, or any other element to have
 * one created and appended.
 *
 * ```ts
 * const stage = await createStage(canvasRef.current, {
 *   layers: ['board', 'shadows', 'stones', 'effects'],
 *   width: 512,
 *   height: 512,
 *   signal: controller.signal,
 * });
 * ```
 */
export async function createStage<L extends string>(
  target: HTMLCanvasElement | HTMLElement,
  options: StageOptions<L>
): Promise<Stage<L>> {
  const {
    layers,
    width,
    height,
    resolution,
    antialias = false,
    backgroundAlpha = 0,
    backgroundColor,
    signal,
  } = options;

  if (signal?.aborted) throw new DOMException('Stage creation aborted', 'AbortError');

  const app = new Application();
  const ownsCanvas = !(target instanceof HTMLCanvasElement);
  const canvas = ownsCanvas ? document.createElement('canvas') : target;

  await app.init({
    canvas,
    width,
    height,
    antialias,
    backgroundAlpha,
    ...(backgroundColor === undefined ? {} : { background: backgroundColor }),
    resolution: resolution ?? (typeof window === 'undefined' ? 1 : window.devicePixelRatio),
    autoDensity: true,
  });

  // Unmounted while `init` was in flight: tear down rather than leak a WebGL
  // context, and let the caller's `catch` distinguish this from a real failure.
  if (signal?.aborted) {
    app.destroy({ removeView: true }, { children: true });
    throw new DOMException('Stage creation aborted', 'AbortError');
  }

  // Pixi sets `touch-action: none` on the canvas, which blocks page scrolling
  // on touch devices. A replay board is something you scroll past, not
  // something you drag. https://github.com/pixijs/pixijs/issues/4824
  app.canvas.style.removeProperty('touch-action');

  if (ownsCanvas) target.appendChild(app.canvas);

  const containers = {} as Record<L, Container>;
  for (const name of layers) {
    const container = new Container({ label: name });
    containers[name] = container;
    app.stage.addChild(container);
  }

  let destroyed = false;

  return {
    app,
    canvas: app.canvas,
    layers: containers,
    resize(nextWidth, nextHeight) {
      // Only the drawing surface. Refitting the board is the caller's call --
      // it needs a new `Board` from the geometry package, and whether that
      // means a redraw or a full rebuild is game-specific.
      app.renderer.resize(nextWidth, nextHeight);
    },
    destroy() {
      // Idempotent: an abort path and a React cleanup can both reach here.
      if (destroyed) return;
      destroyed = true;
      app.destroy({ removeView: ownsCanvas }, { children: true });
    },
  };
}
