// Geometry: coords <-> pixels, board fitting, adjacency, hit-testing. No runtime
// dependencies -- not React, not Pixi, not the DOM.
//
// The canvas host (creation scoped to a parent, devicePixelRatio scaling,
// ResizeObserver) lands in a separate `./canvas` entry point in the next phase,
// so that this one stays usable from PixiJS.

export * from './types';
export { createBoard } from './board';
export type { UnitLattice, UnitPoint, UnitEdge, UnitFace, CreateBoardOptions } from './board';

export { squareLattice } from './square';
export type { SquareLatticeOptions, LatticeOptions, Dimensions } from './square';

export { hexLattice } from './hex';
export type { HexLatticeOptions, HexOrientation, HexExtent } from './hex';

export { graphLattice } from './graph';
export type { GraphLatticeOptions } from './graph';

export { diffOccupancy, occupancyFromGrid, occupancyFromList } from './diff';
export type { Occupancy, Occupant, OccupancyDiff, DiffOptions } from './diff';
