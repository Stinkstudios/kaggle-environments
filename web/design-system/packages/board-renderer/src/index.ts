// A standard way to draw a @kaggle-environments/board with PixiJS.
//
// Composable primitives first -- a stage, a texture loader, geometry-driven
// drawing, a keyed sprite reconciler, an animation set -- each usable on its
// own. `createBoardRenderer` wires the common case on top of them, and hands
// back the raw `app` and `layers` so the bespoke parts of a game (go's atari
// wobble, chess's motion trails) stay reachable.
//
// PixiJS is a peer dependency. The geometry package it builds on has no runtime
// dependencies at all, and stays that way -- Canvas2D visualizers consume the
// identical Board object without ever loading this.

export { createStage, isAbortError } from './stage';
export type { Stage, StageOptions } from './stage';

export { loadFamilies, requireTexture } from './textures';
export type { TextureMap, LoadFamiliesOptions } from './textures';

// The pure derivations these wrap -- `latticeStrokes`, `labelPlacements` and
// the column-letter constants -- live in @kaggle-environments/board, so that a
// Canvas2D renderer can use them without pulling PixiJS into its bundle.
// Import them from there; this package deliberately does not re-export them.
export { drawGrid, drawFaces, drawFaceSprites, drawBorder } from './lattice';
export type { GridOptions, GridStyleName, FacesOptions, FaceSpritesOptions, FaceStyleName } from './lattice';

export { drawLabels } from './labels';
export type { DrawLabelsOptions } from './labels';

export { createSpriteLayer, elementAt } from './sprites';
export type { SpriteLayer, SpriteLayerOptions, ContainerLike, Disposable } from './sprites';

export { createAnimationSet } from './animations';
export type { AnimationSet, Stoppable } from './animations';

export { createBoardRenderer } from './renderer';
export type { BoardRenderer, BoardRendererOptions } from './renderer';
