import { Assets, Sprite, Spritesheet, type SpritesheetData, type Texture } from 'pixi.js';
import { Chess } from 'chess.js';
import { animate, AnimationOptions } from 'motion';
import type { Engine } from '../engine';
import { squareToPixel } from '../coordinates';
import { ASSET_FAMILIES, pieceId } from '../constants';

/**
 * Load every asset family this game needs from the shared design-system
 * package and return them keyed by stable id ('chess:w-king', 'board:dark-tile',
 * 'fx:puff1') rather than by filename.
 *
 * Each family is a separate atlas. That costs nothing here: tiles, pieces and
 * particles already render into separate Pixi containers (background / pieces /
 * vfx), so they were never batched into one draw call anyway.
 *
 * @see {@link https://pixijs.download/dev/docs/assets.Spritesheet.html}
 */
export async function loadGameTextures(): Promise<Record<string, Texture>> {
  const textures: Record<string, Texture> = {};

  await Promise.all(
    ASSET_FAMILIES.map(async ({ family, atlasUrl, atlasData, pieces, missing, targets }) => {
      // An atlas-less family (one built for DOM only, like cards) has nothing
      // Pixi can load. Silently skipping it renders an empty board with no
      // clue why, so say what's wrong and how to fix it.
      if (!atlasUrl || !atlasData) {
        throw new Error(
          `[assets] family "${family}" has no atlas, so PixiJS cannot render it ` +
            `(targets: ${targets.join(', ')}). Either set "atlas": true and add "pixi" to ` +
            `its targets in families.json, or stop loading it here.`
        );
      }

      const sheet = new Spritesheet(await Assets.load(atlasUrl), atlasData as SpritesheetData);
      await sheet.parse();

      for (const piece of pieces) {
        // Frame names in the atlas are the bare id ('w-king'); the registry
        // key is family-qualified ('chess:w-king').
        const frameName = piece.id.slice(piece.id.indexOf(':') + 1);
        const texture = sheet.textures[frameName];
        if (texture) textures[piece.id] = texture;
      }

      if (missing.length && import.meta.env.DEV) {
        console.warn(`[assets] ${family}: no artwork for ${missing.join(', ')} — rendering will fall back.`);
      }
    })
  );

  return textures;
}

// Motion config.
const SPRING_CONFIG: AnimationOptions = { type: 'spring' as const, stiffness: 180, damping: 22, mass: 1 };

// Get where every piece starts, and were every piece ends.
function getAnimationSources(chess: Chess): Map<string, string> | null {
  const lastMove = chess.history({ verbose: true }).at(-1);
  if (!lastMove) return null;

  const sources = new Map<string, string>([[lastMove.to, lastMove.from]]);

  // https://en.wikipedia.org/wiki/Castling#Description
  const row = lastMove.to[1];
  if (lastMove.isKingsideCastle()) {
    sources.set(`f${row}`, `h${row}`);
  } else if (lastMove.isQueensideCastle()) {
    sources.set(`d${row}`, `a${row}`);
  }

  return sources;
}

export function syncPieces(engine: Engine, chess: Chess, snap: boolean) {
  const { squareSize, textures, resources } = engine;

  resources.pieces.removeChildren();
  resources.animating.removeChildren();

  const sources = snap ? null : getAnimationSources(chess);

  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;

      const texture = textures[pieceId(cell.color, cell.type)];
      if (!texture) continue;

      const sprite = new Sprite({ texture, anchor: 0.5 });
      sprite.label = cell.type;
      sprite.scale.set(squareSize / texture.width);

      const target = squareToPixel(cell.square, squareSize, 'white', engine.boardOffset);
      const isAnimating = sources?.get(cell.square);

      if (isAnimating) {
        const start = squareToPixel(isAnimating, squareSize, 'white', engine.boardOffset);
        sprite.position.set(start.x, start.y);
        resources.animating.addChild(sprite);
        engine.animations.add(animate(sprite.position, target, SPRING_CONFIG));
      } else {
        sprite.position.set(target.x, target.y);
        resources.pieces.addChild(sprite);
      }
    }
  }
}
