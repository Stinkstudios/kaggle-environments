import * as React from 'react';
import { cn } from '@kaggle-environments/design-system-tools';
import { pieceAsset } from '@kaggle-environments/design-system-assets';

/** Sizes map to Tailwind's default scale — no arbitrary values. */
const SIZES = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-16',
  /** Fill the parent — the normal choice on a board, where the cell sets size. */
  full: 'size-full',
  /**
   * No box sizing: the caller sets one dimension and the artwork's natural
   * aspect fills in the other. Use for non-square art —
   * `<Piece id="card:a-spade" size="auto" className="h-48" />`.
   */
  auto: '',
} as const;

export type PieceSize = keyof typeof SIZES;

export interface PieceProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Stable asset id, e.g. `chess:w-king`, `card:a-spade`, `fx:puff1`. */
  id: string;
  size?: PieceSize;
  /** Rendered when no artwork exists. A fallback is a declared gap, never a substitute piece. */
  fallback?: React.ReactNode;
  /** Override the manifest's alt text. Ignored for decorative pieces, which stay hidden. */
  label?: string;
}

/**
 * Renders one game piece from the shared asset manifest.
 *
 * Two paths, chosen by the family rather than the caller:
 *  - **Atlas** (default) — one sheet serves every piece, positioned with CSS.
 *    A board showing 32 pieces costs one request. Frames are packed untrimmed
 *    precisely so this needs no offset maths.
 *  - **Individual file** — when the family sets `"individual": true` (cards:
 *    you show a hand, and shouldn't fetch all 54 faces to do it).
 *
 * Both paths size themselves from the artwork's natural aspect ratio, so a
 * 462x643 card fills its box instead of letterboxing inside a square one.
 *
 * Accessibility comes from the manifest either way: informational pieces are
 * labelled, decorative ones (particles, board textures) are never announced.
 *
 * Tinting for `tintable` families isn't implemented — no tintable family exists
 * yet. It lands with the first one (discs/stones); see skills/assets.md.
 */
export const Piece = React.forwardRef<HTMLSpanElement, PieceProps>(
  ({ id, size = 'full', fallback = null, label, className, style, ...props }, ref) => {
    const asset = pieceAsset(id);

    if (!asset) {
      if (import.meta.env?.DEV) {
        console.warn(`[Piece] no artwork for "${id}" — rendering fallback. Declare it in families.json.`);
      }
      return (
        <span ref={ref} className={cn('inline-block', SIZES[size], className)} data-piece-missing={id} {...props}>
          {fallback}
        </span>
      );
    }

    const alt = asset.decorative ? '' : (label ?? asset.label);
    const box = cn('inline-block', SIZES[size], className);
    // Natural aspect: the atlas frame for packed families, the declared
    // sourceSize for individual ones.
    const ratio = asset.sourceSize ? `${asset.sourceSize.w} / ${asset.sourceSize.h}` : undefined;

    if (asset.url) {
      return (
        <span
          ref={ref}
          className={cn(box, 'overflow-hidden')}
          data-piece={id}
          style={{ aspectRatio: ratio, ...style }}
          {...props}
        >
          <img
            src={asset.url}
            alt={alt}
            aria-hidden={asset.decorative || undefined}
            draggable={false}
            loading="lazy"
            className="size-full object-contain select-none"
          />
        </span>
      );
    }

    const { atlasUrl, atlasSize, frame } = asset;
    if (!atlasUrl || !atlasSize || !frame) {
      return (
        <span ref={ref} className={box} data-piece-missing={id} {...props}>
          {fallback}
        </span>
      );
    }

    // Percentage background-position so the sprite scales with its box rather
    // than needing pixel maths at the call site. Guard the degenerate case
    // where a frame spans the whole sheet, which would divide by zero.
    const posX = atlasSize.w === frame.w ? 0 : (frame.x / (atlasSize.w - frame.w)) * 100;
    const posY = atlasSize.h === frame.h ? 0 : (frame.y / (atlasSize.h - frame.h)) * 100;
    // A background image stretches to its element and CSS has no background
    // equivalent of object-contain, so letterbox manually: the outer box keeps
    // the caller's size, the inner element takes the frame's aspect and fits.
    const wide = frame.w >= frame.h;

    return (
      <span
        ref={ref}
        className={cn(box, 'flex items-center justify-center overflow-hidden')}
        data-piece={id}
        role={asset.decorative ? undefined : 'img'}
        aria-label={asset.decorative ? undefined : alt}
        aria-hidden={asset.decorative || undefined}
        style={{ aspectRatio: ratio, ...style }}
        {...props}
      >
        <span
          aria-hidden
          style={{
            width: wide ? '100%' : 'auto',
            height: wide ? 'auto' : '100%',
            aspectRatio: `${frame.w} / ${frame.h}`,
            backgroundImage: `url(${atlasUrl})`,
            backgroundPosition: `${posX}% ${posY}%`,
            backgroundSize: `${(atlasSize.w / frame.w) * 100}% ${(atlasSize.h / frame.h) * 100}%`,
            backgroundRepeat: 'no-repeat',
          }}
        />
      </span>
    );
  }
);

Piece.displayName = 'Piece';
