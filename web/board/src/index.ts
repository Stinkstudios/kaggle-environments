// Geometry: coords <-> pixels, board fitting, adjacency, and the two
// renderer-agnostic derivations every board draws from -- merged lattice
// strokes and coordinate-label placement. No runtime dependencies: not React,
// not Pixi, not the DOM.
//
// Drawing lives in @kaggle-environments/design-system-board-renderer, which
// wraps these for PixiJS. The Canvas2D renderers consume them directly -- which
// is the whole reason they are here rather than in that package.

export * from './types';
export { createBoard } from './board';
export type { UnitLattice, UnitPoint, UnitEdge, UnitFace, CreateBoardOptions } from './board';

export { squareLattice } from './square';
export type { SquareLatticeOptions, LatticeOptions, Dimensions } from './square';

export { hexLattice } from './hex';
export type { HexLatticeOptions, HexOrientation, HexExtent } from './hex';

export { graphLattice } from './graph';
export type { GraphLatticeOptions } from './graph';

export { latticeStrokes } from './strokes';
export type { Stroke } from './strokes';

export { labelPlacements, COLUMN_LETTERS, GO_COLUMN_LETTERS } from './labels';
export type { LabelPlacement, LabelOptions } from './labels';

export { diffOccupancy, occupancyFromGrid, occupancyFromList } from './diff';
export type { Occupancy, Occupant, OccupancyDiff, DiffOptions } from './diff';
