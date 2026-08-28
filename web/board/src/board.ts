import type {
  Board,
  BorderGroup,
  Coord,
  Edge,
  Element,
  ElementKind,
  Face,
  Fit,
  Flip,
  Hit,
  HitTestOptions,
  Point,
  Vec2,
} from './types';
import { coordKey } from './types';

/**
 * What a generator produces: geometry in **unit space**, where one lattice step
 * is one unit. Generators never think about pixels, padding or centring --
 * {@link createBoard} owns all of that, so every lattice fits the same way.
 */
export interface UnitPoint {
  coord: Coord;
  x: number;
  y: number;
}

/** Endpoints are point coords, resolved against the lattice's own points. */
export interface UnitEdge {
  coord: Coord;
  a: Coord;
  b: Coord;
}

export interface UnitFace {
  coord: Coord;
  corners: readonly Vec2[];
}

/** Declared by the generator, since only it knows the board's extent. */
export interface UnitBorder {
  sides: ReadonlyArray<{ id: string; coords: readonly Coord[] }>;
  corners: ReadonlyArray<{ id: string; coords: readonly Coord[] }>;
}

export interface UnitLattice {
  primary: ElementKind;
  points: readonly UnitPoint[];
  edges: readonly UnitEdge[];
  faces: readonly UnitFace[];
  border?: UnitBorder;
}

export interface CreateBoardOptions {
  fit?: Fit;
  flip?: Flip;
}

const VERTEX_EPSILON = 1e-9;

/**
 * Snaps near-identical positions onto a single shared vertex index.
 *
 * Face adjacency is "these two polygons share a side", which means comparing
 * corner positions produced by two separate `cos`/`sin` evaluations. Rounding to
 * a fixed number of decimals would be a coin flip for any value that lands near
 * a rounding boundary, so instead each position is bucketed and matched against
 * the nine surrounding buckets -- exact regardless of where the value falls.
 */
class VertexIndex {
  private readonly buckets = new Map<string, number[]>();
  private readonly xs: number[] = [];
  private readonly ys: number[] = [];

  private bucketKey(x: number, y: number): string {
    return `${Math.floor(x / VERTEX_EPSILON)}:${Math.floor(y / VERTEX_EPSILON)}`;
  }

  idFor(x: number, y: number): number {
    const bx = Math.floor(x / VERTEX_EPSILON);
    const by = Math.floor(y / VERTEX_EPSILON);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const candidates = this.buckets.get(`${bx + dx}:${by + dy}`);
        if (!candidates) continue;
        for (const id of candidates) {
          if (Math.abs(this.xs[id] - x) <= VERTEX_EPSILON && Math.abs(this.ys[id] - y) <= VERTEX_EPSILON) {
            return id;
          }
        }
      }
    }

    const id = this.xs.length;
    this.xs.push(x);
    this.ys.push(y);
    const key = this.bucketKey(x, y);
    const bucket = this.buckets.get(key);
    if (bucket) bucket.push(id);
    else this.buckets.set(key, [id]);
    return id;
  }
}

/**
 * A compass id to a screen-space unit vector, y growing downward. Summing the
 * letters handles the blended points a hexagon needs (`'nne'`, `'sse'`) without
 * a lookup table.
 */
function compassDirection(id: string): Vec2 {
  let x = 0;
  let y = 0;
  for (const letter of id) {
    if (letter === 'n') y -= 1;
    else if (letter === 's') y += 1;
    else if (letter === 'e') x += 1;
    else if (letter === 'w') x -= 1;
  }
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Ray casting. Points exactly on a shared side may resolve to either face. */
function isInsidePolygon(px: number, py: number, corners: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const { x: xi, y: yi } = corners[i];
    const { x: xj, y: yj } = corners[j];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Lay a unit-space lattice out into final coordinates.
 *
 * Every generator funnels through here, so fitting, flipping, adjacency and
 * hit-testing are written once rather than per topology.
 */
export function createBoard(unit: UnitLattice, options: CreateBoardOptions = {}): Board {
  const { fit, flip } = options;

  // 1. Unit extent, over points and face corners alike -- a hex board has no
  //    points at all, so points are not enough on their own.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const observe = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const point of unit.points) observe(point.x, point.y);
  for (const face of unit.faces) for (const corner of face.corners) observe(corner.x, corner.y);
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

  const unitWidth = maxX - minX;
  const unitHeight = maxY - minY;

  // 2. Scale and centre. Without `fit` this is the identity, which is what makes
  //    unit space the thing the tests can assert against.
  let scale = 1;
  if (fit) {
    const padding = fit.padding ?? 0;
    const availableWidth = Math.max(0, fit.width - padding * 2);
    const availableHeight = Math.max(0, fit.height - padding * 2);
    const scaleX = unitWidth > 0 ? availableWidth / unitWidth : Infinity;
    const scaleY = unitHeight > 0 ? availableHeight / unitHeight : Infinity;
    const fitted = Math.min(scaleX, scaleY);
    scale = Number.isFinite(fitted) ? fitted : 1;
    if (fit.minScale !== undefined) scale = Math.max(fit.minScale, scale);
  }

  const width = unitWidth * scale;
  const height = unitHeight * scale;
  const origin: Vec2 = fit ? { x: (fit.width - width) / 2, y: (fit.height - height) / 2 } : { x: 0, y: 0 };

  // Normalised (flipped, origin-at-zero) unit coordinates. Adjacency is computed
  // in this space rather than final space so it is independent of `fit`.
  const normalize = (x: number, y: number): Vec2 => ({
    x: (flip?.x ? minX + maxX - x : x) - minX,
    y: (flip?.y ? minY + maxY - y : y) - minY,
  });
  const place = (normalized: Vec2): Vec2 => ({
    x: origin.x + normalized.x * scale,
    y: origin.y + normalized.y * scale,
  });

  // 3. Points.
  const points: Point[] = [];
  const pointsByCoord = new Map<string, Point>();
  for (const source of unit.points) {
    const key = coordKey(source.coord);
    const { x, y } = place(normalize(source.x, source.y));
    const point: Point = { kind: 'point', id: `point:${key}`, coord: source.coord, x, y };
    points.push(point);
    pointsByCoord.set(key, point);
  }

  // 4. Edges, resolved against the points the generator declared.
  const edges: Edge[] = [];
  const edgesByCoord = new Map<string, Edge>();
  for (const source of unit.edges) {
    const a = pointsByCoord.get(coordKey(source.a));
    const b = pointsByCoord.get(coordKey(source.b));
    if (!a || !b) {
      throw new Error(
        `Edge ${coordKey(source.coord)} references a point that does not exist ` +
          `(${coordKey(source.a)} -> ${coordKey(source.b)}). This is a generator bug.`
      );
    }
    const key = coordKey(source.coord);
    const edge: Edge = {
      kind: 'edge',
      id: `edge:${key}`,
      coord: source.coord,
      a,
      b,
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      length: Math.hypot(b.x - a.x, b.y - a.y),
    };
    edges.push(edge);
    edgesByCoord.set(key, edge);
  }

  // 5. Faces, plus the shared-side table their adjacency comes from.
  const vertices = new VertexIndex();
  const facesBySide = new Map<string, { faces: number[]; a: Vec2; b: Vec2 }>();
  const faces: Face[] = [];
  const facesByCoord = new Map<string, Face>();
  const faceIndexById = new Map<string, number>();

  unit.faces.forEach((source, faceIndex) => {
    // Mirroring one axis reverses a polygon's winding. Re-reversing keeps the
    // winding the generator chose stable regardless of `flip`, which matters to
    // anything directional along the path -- dash phase, gradients, arrowheads.
    // Reverse before deriving anything, so corners and vertex ids stay in step.
    const normalized = source.corners.map((corner) => normalize(corner.x, corner.y));
    if (!!flip?.x !== !!flip?.y) normalized.reverse();
    const vertexIds = normalized.map((corner) => vertices.idFor(corner.x, corner.y));
    const corners = normalized.map(place);
    for (let i = 0; i < vertexIds.length; i++) {
      const from = vertexIds[i];
      const to = vertexIds[(i + 1) % vertexIds.length];
      const sideKey = from < to ? `${from}-${to}` : `${to}-${from}`;
      const entry = facesBySide.get(sideKey);
      if (entry) entry.faces.push(faceIndex);
      else facesBySide.set(sideKey, { faces: [faceIndex], a: corners[i], b: corners[(i + 1) % corners.length] });
    }

    const key = coordKey(source.coord);
    const face: Face = {
      kind: 'face',
      id: `face:${key}`,
      coord: source.coord,
      x: corners.reduce((sum, corner) => sum + corner.x, 0) / corners.length,
      y: corners.reduce((sum, corner) => sum + corner.y, 0) / corners.length,
      corners,
    };
    faces.push(face);
    facesByCoord.set(key, face);
    faceIndexById.set(face.id, faceIndex);
  });

  // 6. Adjacency: points via edges, faces via a shared side.
  const neighbors = new Map<string, Element[]>();
  const link = (from: Element, to: Element) => {
    const existing = neighbors.get(from.id);
    if (existing) existing.push(to);
    else neighbors.set(from.id, [to]);
  };
  for (const edge of edges) {
    link(edge.a, edge.b);
    link(edge.b, edge.a);
  }
  const faceAdjacencyDistances: number[] = [];
  for (const { faces: sharing } of facesBySide.values()) {
    if (sharing.length !== 2) continue;
    const [first, second] = sharing.map((index) => faces[index]);
    link(first, second);
    link(second, first);
    faceAdjacencyDistances.push(Math.hypot(second.x - first.x, second.y - first.y));
  }

  const pitch = edges.length > 0 ? median(edges.map((edge) => edge.length)) : median(faceAdjacencyDistances);

  // 7. Border groups, resolved against whichever element kind the board plays on.
  const byCoord = unit.primary === 'face' ? facesByCoord : pointsByCoord;

  // Generators name border groups from the unflipped lattice, but a compass id
  // is a claim about where a side ends up *on screen*. Mirroring the letters
  // keeps that claim true under `flip` -- and matters twice over, because the
  // direction derived from the id is what assigns a corner cell's outward
  // facets to the right side.
  const mirrorId = (id: string) =>
    [...id]
      .map((letter) => {
        if (flip?.y && letter === 'n') return 's';
        if (flip?.y && letter === 's') return 'n';
        if (flip?.x && letter === 'e') return 'w';
        if (flip?.x && letter === 'w') return 'e';
        return letter;
      })
      .join('');

  const resolveBorder = (groups: UnitBorder['sides']): BorderGroup[] => {
    const resolved = groups.map((group) => ({
      id: mirrorId(group.id),
      direction: compassDirection(mirrorId(group.id)),
      elements: group.coords.map((coord) => {
        const element = byCoord.get(coordKey(coord));
        if (!element) {
          throw new Error(
            `Border group '${group.id}' references ${coordKey(coord)}, which is not a ${unit.primary} ` +
              `on this board. This is a generator bug.`
          );
        }
        return element;
      }),
      segments: [] as Array<readonly [Vec2, Vec2]>,
    }));

    // A corner cell belongs to two sides, so its outward facets have to be
    // split between them: each facet goes to whichever of its cell's groups
    // points the same way the facet faces.
    const groupsByFace = new Map<number, typeof resolved>();
    for (const group of resolved) {
      for (const element of group.elements) {
        const index = faceIndexById.get(element.id);
        if (index === undefined) continue;
        const bucket = groupsByFace.get(index);
        if (bucket) bucket.push(group);
        else groupsByFace.set(index, [group]);
      }
    }

    for (const { faces: sharing, a, b } of facesBySide.values()) {
      if (sharing.length !== 1) continue;
      const candidates = groupsByFace.get(sharing[0]);
      if (!candidates?.length) continue;
      const face = faces[sharing[0]];
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const outward = { x: midpoint.x - face.x, y: midpoint.y - face.y };
      const length = Math.hypot(outward.x, outward.y) || 1;
      outward.x /= length;
      outward.y /= length;

      let best = candidates[0];
      let bestAlignment = -Infinity;
      for (const candidate of candidates) {
        const alignment = candidate.direction.x * outward.x + candidate.direction.y * outward.y;
        if (alignment > bestAlignment) {
          bestAlignment = alignment;
          best = candidate;
        }
      }
      best.segments.push([a, b] as const);
    }

    return resolved.map(({ id, elements, segments }) => ({ id, elements, segments }));
  };

  return {
    points,
    edges,
    faces,
    primary: unit.primary,
    sides: unit.border ? resolveBorder(unit.border.sides) : [],
    corners: unit.border ? resolveBorder(unit.border.corners) : [],
    origin,
    width,
    height,
    scale,
    pitch,

    pointAt: (coord: Coord) => pointsByCoord.get(coordKey(coord)) ?? null,
    edgeAt: (coord: Coord) => edgesByCoord.get(coordKey(coord)) ?? null,
    faceAt: (coord: Coord) => facesByCoord.get(coordKey(coord)) ?? null,

    neighborsOf: (element) => (neighbors.get(element.id) ?? []) as readonly (Point | Face)[],

    hitTest(x: number, y: number, hitOptions: HitTestOptions = {}): Hit | null {
      const kinds = hitOptions.kinds ?? [unit.primary];

      for (const kind of kinds) {
        if (kind === 'face') {
          const found = faces.find((face) => isInsidePolygon(x, y, face.corners));
          if (found) return { element: found, distance: 0 };
          continue;
        }

        const candidates: Element[] = kind === 'point' ? points : edges;
        const limit = hitOptions.maxDistance ?? (kind === 'point' ? pitch / 2 : pitch / 3);
        let best: Hit | null = null;
        for (const candidate of candidates) {
          const distance =
            kind === 'point'
              ? Math.hypot(x - candidate.x, y - candidate.y)
              : distanceToSegment(
                  x,
                  y,
                  (candidate as Edge).a.x,
                  (candidate as Edge).a.y,
                  (candidate as Edge).b.x,
                  (candidate as Edge).b.y
                );
          if (distance <= limit && (best === null || distance < best.distance)) {
            best = { element: candidate, distance };
          }
        }
        if (best) return best;
      }

      return null;
    },
  };
}
