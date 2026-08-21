import { pixiPipes } from '@assetpack/core/pixi';

/**
 * Reads the staging tree that scripts/build-assets.mjs writes, not `src/`.
 * AssetPack decides what to pack from folder-name tags (`chess{tps}`), and we
 * keep that syntax out of the committed source tree — `src/chess/` stays a
 * clean design deliverable.
 *
 * Everything here is scratch: the committed output is `packed/`, which
 * build-assets.mjs normalises out of `.packer-work/out`.
 */
export default {
  entry: './.packer-work/staging',
  output: './.packer-work/out',
  cache: false,
  pipes: [
    ...pixiPipes({
      cacheBust: false,
      resolutions: { default: 1 },
      compression: { png: false, jpg: false, webp: true },
      texturePacker: {
        texturePacker: {
          // Untrimmed is mandatory. DOM reads these frames via CSS
          // background-position; a trimmed frame would need spriteSourceSize
          // offsets re-applied, which is the inconsistency that makes the
          // existing go atlas awkward to reuse.
          allowTrim: false,
          allowRotation: false,
          removeFileExtension: true,
        },
      },
      manifest: { createShortcuts: true },
    }),
  ],
};
