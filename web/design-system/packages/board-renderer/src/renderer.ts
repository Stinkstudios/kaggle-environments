import type { Board } from '@kaggle-environments/board';
import type { FamilyInfo } from '@kaggle-environments/design-system-assets';
import type { ContainerChild } from 'pixi.js';
import { createAnimationSet, type AnimationSet } from './animations';
import { createSpriteLayer, type Disposable, type SpriteLayer, type SpriteLayerOptions } from './sprites';
import { createStage, type Stage, type StageOptions } from './stage';
import { loadFamilies, requireTexture, type TextureMap } from './textures';

export interface BoardRendererOptions<L extends string>
  extends Omit<StageOptions<L>, 'width' | 'height'>, Partial<Pick<StageOptions<L>, 'width' | 'height'>> {
  /** Already fitted. This package never decides how big your board is. */
  board: Board;
  /** Asset families to load. Import each one directly -- never the barrel. */
  families?: readonly FamilyInfo[];
  /** Generate atlas mipmaps; see {@link loadFamilies}. */
  mipmaps?: boolean;
}

export interface BoardRenderer<L extends string> extends Stage<L> {
  board: Board;
  textures: TextureMap;
  /** One-shot animations, cancelled together at the top of each update. */
  animations: AnimationSet;
  /** Fail loudly on a missing asset id rather than drawing Pixi's white box. */
  texture(id: string): ReturnType<typeof requireTexture>;
  /**
   * A keyed sprite layer bound to one of this renderer's containers. The layer
   * inherits the board, so `create` receives resolved elements.
   */
  spriteLayer<T, S extends Disposable & ContainerChild>(
    layer: L,
    options: Omit<SpriteLayerOptions<T, S>, 'board' | 'container'>
  ): SpriteLayer<T, S>;
}

/**
 * The common case, wired: a Pixi app, named layers, loaded textures, and
 * animation bookkeeping, all sized from a `Board`.
 *
 * This is a convenience over the primitives, not a replacement for them --
 * `createStage`, `loadFamilies`, `drawGrid`, `drawFaces`, `drawLabels`,
 * `createSpriteLayer` and `createAnimationSet` each stand alone and can be used
 * without ever calling this. That matters because the interesting parts of a
 * game are the parts this cannot know about: `go`'s atari wobble and territory
 * marks, `chess`'s motion trails and castling pairs. `app` and `layers` are
 * plain Pixi, so those stay reachable.
 *
 * ```ts
 * const board = squareLattice({ points: { rows: 19, cols: 19 }, fit: { width: 512, height: 512, padding: 56 } });
 * const renderer = await createBoardRenderer(canvas, {
 *   board,
 *   layers: ['board', 'shadows', 'stones', 'effects'],
 *   families: [goFamily, fxFamily],
 *   mipmaps: true,
 *   signal: controller.signal,
 * });
 * ```
 */
export async function createBoardRenderer<L extends string>(
  target: HTMLCanvasElement | HTMLElement,
  options: BoardRendererOptions<L>
): Promise<BoardRenderer<L>> {
  const { board, families = [], mipmaps, width, height, ...stageOptions } = options;

  const stage = await createStage(target, {
    ...stageOptions,
    // A board fitted with `padding` is centred in its box, so the margin it
    // left on one side is the margin it left on the other -- which recovers the
    // original box exactly. Both existing visualizers check out: go's 512 box
    // with 56 padding gives a 400 extent at origin 56, and 56*2+400 is 512.
    width: width ?? board.origin.x * 2 + board.width,
    height: height ?? board.origin.y * 2 + board.height,
  });

  const textures = await loadFamilies(families, { mipmaps });

  // Families load after the stage, so an unmount during that second await has
  // to be caught too -- otherwise this leaks exactly the context the signal
  // exists to protect.
  if (stageOptions.signal?.aborted) {
    stage.destroy();
    throw new DOMException('Renderer creation aborted', 'AbortError');
  }

  const animations = createAnimationSet();
  const spriteLayers: SpriteLayer<unknown, Disposable>[] = [];

  return {
    ...stage,
    board,
    textures,
    animations,
    texture: (id) => requireTexture(textures, id),
    spriteLayer<T, S extends Disposable & ContainerChild>(
      layer: L,
      layerOptions: Omit<SpriteLayerOptions<T, S>, 'board' | 'container'>
    ) {
      const created = createSpriteLayer<T, S>({ ...layerOptions, board, container: stage.layers[layer] });
      spriteLayers.push(created as SpriteLayer<unknown, Disposable>);
      return created;
    },
    destroy() {
      // Order matters: cancel tweens before tearing down the sprites they are
      // still writing to, and drop the sprites before the app that owns them.
      animations.stopAll();
      for (const layer of spriteLayers) layer.destroy();
      stage.destroy();
    },
  };
}
