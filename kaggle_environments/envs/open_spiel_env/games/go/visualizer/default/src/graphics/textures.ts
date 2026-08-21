import { Assets, Spritesheet, type SpritesheetData, type Texture } from 'pixi.js';
import { ASSET_FAMILIES } from './constants';

/**
 * Textures keyed by stable asset id ('go:b-stone', 'fx:puff1') rather than by
 * filename. Nothing downstream knows where the artwork came from.
 */
export type TextureMap = Record<string, Texture>;

/**
 * Load every asset family this game needs from the shared design-system package.
 * The families are the modules imported in ./constants — one atlas each, and
 * nothing else from the package gets bundled.
 *
 * Each family is a separate atlas. That costs nothing here: board, shadows,
 * stones and particles already render into separate Pixi containers, so they
 * were never batched into one draw call anyway.
 *
 * @see {@link https://pixijs.download/dev/docs/assets.Spritesheet.html}
 */
export async function loadGameTextures(): Promise<TextureMap> {
  const textures: TextureMap = {};

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

      const atlasTexture = await Assets.load(atlasUrl);
      // Stones are 256px masters drawn at roughly a fifth of that on a 19x19
      // board; without mipmaps the downscale aliases badly.
      atlasTexture.source.autoGenerateMipmaps = true;

      const sheet = new Spritesheet(atlasTexture, atlasData as SpritesheetData);
      await sheet.parse();

      for (const piece of pieces) {
        // Frame names in the atlas are the bare id ('b-stone'); the registry
        // key is family-qualified ('go:b-stone').
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
