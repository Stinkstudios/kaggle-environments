import type { FamilyInfo } from '@kaggle-environments/design-system-assets';
import { Assets, Spritesheet, type SpritesheetData, type Texture } from 'pixi.js';

/**
 * Textures keyed by stable asset id (`'go:b-stone'`, `'chess:w-king'`) rather
 * than by filename. Nothing downstream knows where the artwork came from.
 */
export type TextureMap = Record<string, Texture>;

export interface LoadFamiliesOptions {
  /**
   * Generate mipmaps for each atlas. Worth it whenever the artwork is drawn
   * well below its natural size -- `go`'s stones are 256px masters rendered at
   * roughly a fifth of that on a 19x19 board, and without mipmaps the downscale
   * aliases badly. `chess` draws close to 1:1 and does not need them.
   */
  mipmaps?: boolean;
  /** Report declared-but-undrawn pieces. Defaults to warning in dev only. */
  onMissing?: (family: string, missing: string[]) => void;
}

/**
 * Bring up every asset family a game needs, as one texture map.
 *
 * Each family is a separate atlas. That costs nothing: board furniture, pieces
 * and particles already render into separate containers, so they were never
 * batched into one draw call anyway.
 *
 * Import families one at a time -- `.../design-system-assets/go`, not the
 * package root. The root is a barrel over every family, so importing from it
 * bundles the chess set and the 54-card deck into a Go board. Naming each
 * family as an import keeps the bundle honest: what you see is what ships.
 *
 * @see {@link https://pixijs.download/dev/docs/assets.Spritesheet.html}
 */
export async function loadFamilies(
  families: readonly FamilyInfo[],
  options: LoadFamiliesOptions = {}
): Promise<TextureMap> {
  const { mipmaps = false, onMissing } = options;
  const textures: TextureMap = {};

  await Promise.all(
    families.map(async ({ family, atlasUrl, atlasData, pieces, missing, targets }) => {
      // An atlas-less family (one built for DOM only, like cards) has nothing
      // Pixi can load. Silently skipping it renders an empty board with no clue
      // why, so say what's wrong and how to fix it.
      if (!atlasUrl || !atlasData) {
        throw new Error(
          `[board-renderer] family "${family}" has no atlas, so PixiJS cannot render it ` +
            `(targets: ${targets.join(', ')}). Either set "atlas": true and add "pixi" to ` +
            `its targets in families.json, or stop loading it here.`
        );
      }

      const atlasTexture = await Assets.load(atlasUrl);
      if (mipmaps) atlasTexture.source.autoGenerateMipmaps = true;

      const sheet = new Spritesheet(atlasTexture, atlasData as SpritesheetData);
      await sheet.parse();

      for (const piece of pieces) {
        // Frame names in the atlas are the bare id ('b-stone'); the registry
        // key is family-qualified ('go:b-stone').
        const frameName = piece.id.slice(piece.id.indexOf(':') + 1);
        const texture = sheet.textures[frameName];
        if (texture) textures[piece.id] = texture;
      }

      if (missing.length) {
        if (onMissing) onMissing(family, missing);
        else if (import.meta.env?.DEV) {
          console.warn(`[board-renderer] ${family}: no artwork for ${missing.join(', ')} — rendering will fall back.`);
        }
      }
    })
  );

  return textures;
}

/**
 * Look a texture up and fail loudly if it is absent.
 *
 * A missing texture renders as Pixi's white square, which reads as a deliberate
 * piece and can survive review. Prefer this over `textures[id]` anywhere the
 * artwork is required.
 */
export function requireTexture(textures: TextureMap, id: string): Texture {
  const texture = textures[id];
  if (!texture) {
    throw new Error(
      `[board-renderer] no texture for "${id}". Loaded ids: ${Object.keys(textures).join(', ') || '(none)'}.`
    );
  }
  return texture;
}
