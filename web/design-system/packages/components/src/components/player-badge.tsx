import * as React from 'react';
import { cn } from '@kaggle-environments/design-system-tools';
import geminiLogoPath from '../assets/gemini.svg';
import playerBlankBlack from '../assets/player-blank-b.webp';
import playerBlankWhite from '../assets/player-blank-w.webp';
import playerReflectionBlack from '../assets/player-reflection-b.webp';
import playerReflectionWhite from '../assets/player-reflection-w.webp';
import { getAgentBrand } from '@kaggle-environments/design-system-tools';

export type PlayerBadgeType = 'black' | 'white';
export type PlayerBadgeRotate = 'none' | 'left' | 'right';

interface PlayerBadgeContextValue {
  active: boolean;
  type: PlayerBadgeType;
  rotate: PlayerBadgeRotate;
}

// Broadcasts the two "theme-like" config values to every part so consumers set them
// once on the root instead of repeating them on PlayerBadgeIcon/PlayerBadgeLabel/etc.
const PlayerBadgeContext = React.createContext<PlayerBadgeContextValue>({
  active: false,
  type: 'black',
  rotate: 'none',
});

function usePlayerBadgeContext() {
  return React.useContext(PlayerBadgeContext);
}

// --- Root -------------------------------------------------------------
export interface PlayerBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether this player is the active one — swaps the label to an accent fill. Defaults to `false`. */
  active?: boolean;
  type?: PlayerBadgeType;
  /** Small decorative tilt — `left` or `right`. Defaults to `none`. */
  rotate?: PlayerBadgeRotate;
}

/**
 * A player avatar + name badge, composed from `PlayerBadgeIcon` and `PlayerBadgeLabel`
 * (with optional `PlayerBadgeLabelIcon` / `PlayerBadgeLabelText` / `PlayerBadgeSparkle`
 * inside it). The icon overlaps whichever side of the label it's placed on — swap the
 * JSX order of `PlayerBadgeIcon` and `PlayerBadgeLabel` to flip sides; `PlayerBadgeLabel`
 * picks up its own `:first-child`/`:last-child` position via CSS, no prop needed.
 */
export const PlayerBadge = React.forwardRef<HTMLDivElement, PlayerBadgeProps>(
  ({ active = false, type = 'black', rotate = 'none', className, children, ...props }, ref) => (
    <PlayerBadgeContext.Provider value={{ active, type, rotate }}>
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center',
          rotate === 'left' && '-rotate-2',
          rotate === 'right' && 'rotate-2',
          active && 'scale-105',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </PlayerBadgeContext.Provider>
  )
);
PlayerBadge.displayName = 'PlayerBadge';

// --- Icon ---------------------------------------------------------------
export type PlayerBadgeIconProps = React.HTMLAttributes<HTMLDivElement>;

/** The circular avatar slot — a provider logo, or a plain game piece. */
export const PlayerBadgeIcon = React.forwardRef<HTMLDivElement, PlayerBadgeIconProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'grid-pile relative z-10 flex size-16.5 shrink-0 items-center justify-items-center overflow-hidden',
          className
        )}
        {...props}
      />
    );
  }
);
PlayerBadgeIcon.displayName = 'PlayerBadgeIcon';

export type PlayerBadgeIconBackgroundVariant = 'blank' | 'reflection';

const playerIconBackgrounds: Record<PlayerBadgeType, Record<PlayerBadgeIconBackgroundVariant, string>> = {
  black: { blank: playerBlankBlack, reflection: playerReflectionBlack },
  white: { blank: playerBlankWhite, reflection: playerReflectionWhite },
};

export interface PlayerBadgeIconBackgroundProps extends Omit<React.HTMLAttributes<HTMLImageElement>, 'src'> {
  /** `blank` is the plain stone; `reflection` is the glossy highlight layered on top. */
  variant: PlayerBadgeIconBackgroundVariant;
}

/** A stone image layer for `PlayerBadgeIcon` — picks black/white from the badge's `type`. */
export const PlayerBadgeIconBackground = React.forwardRef<HTMLImageElement, PlayerBadgeIconBackgroundProps>(
  ({ variant, ...props }, ref) => {
    const { type } = usePlayerBadgeContext();
    return (
      <img
        ref={ref}
        src={playerIconBackgrounds[type][variant]}
        alt=""
        aria-hidden="true"
        width="128"
        height="128"
        {...props}
      />
    );
  }
);
PlayerBadgeIconBackground.displayName = 'PlayerBadgeIconBackground';

// --- Label ----------------------------------------------------------------
export type PlayerBadgeLabelProps = React.HTMLAttributes<HTMLSpanElement>;

/**
 * The pill/block that carries the name — overlaps `PlayerBadgeIcon` by half its width.
 * Assumes it's composed as a sibling of `PlayerBadgeIcon` inside `PlayerBadge`: which
 * side it pulls toward is read directly off its own `:first-child`/`:last-child`
 * position, so no `iconSide` prop is needed.
 */
export const PlayerBadgeLabel = React.forwardRef<HTMLSpanElement, PlayerBadgeLabelProps>(
  ({ className, ...props }, ref) => {
    const { active } = usePlayerBadgeContext();
    return (
      <span
        ref={ref}
        className={cn(
          'group/badge-label relative flex items-center gap-2 font-sans text-black squiggle-border',
          'h-15.5 rounded-none',
          active ? 'bg-highlight-blue' : 'bg-white',
          'last:-ml-8 last:pl-10 last:pr-5',
          'first:-mr-8 first:pr-10 first:pl-5',
          className
        )}
        {...props}
      />
    );
  }
);
PlayerBadgeLabel.displayName = 'PlayerBadgeLabel';

// --- Label parts ------------------------------------------------------
export type PlayerBadgeLabelIconProps = React.HTMLAttributes<HTMLSpanElement>;

/** A small icon inline before the label text — for badges whose avatar doesn't carry identity (e.g. a plain game piece). */
export const PlayerBadgeLabelIcon = React.forwardRef<HTMLSpanElement, PlayerBadgeLabelIconProps>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn('flex size-6 shrink-0 items-center justify-center', className)} {...props} />
  )
);

PlayerBadgeLabelIcon.displayName = 'PlayerBadgeLabelIcon';

export type PlayerBadgeLabelTextProps = React.HTMLAttributes<HTMLSpanElement>;

/** The label's name text — pass multiple children (e.g. two `<span>`s) for a stacked label. */
export const PlayerBadgeLabelText = React.forwardRef<HTMLSpanElement, PlayerBadgeLabelTextProps>(
  ({ className, ...props }, ref) => {
    return (
      <span ref={ref} className={cn('flex flex-col justify-center text-lg', 'leading-none', className)} {...props} />
    );
  }
);

PlayerBadgeLabelText.displayName = 'PlayerBadgeLabelText';

export type PlayerBadgeLogoProps = { name: string; className?: string };

export const PlayerBadgeLogo = React.forwardRef<HTMLDivElement, PlayerBadgeLogoProps>(({ name, className }, ref) => {
  const brand = getAgentBrand(name);
  // There is a bug on MacOS (and iOS) 26+, where `url()` inside svg
  // symbol sets don't work. We need this to render Gemini's gradient. So until
  // that's resolved we have to render an image as a special case for svg's
  // with gradients in them.
  if (brand === 'gemini') {
    return (
      <img
        src={geminiLogoPath}
        width="128"
        height="128"
        alt=""
        aria-hidden="true"
        className={cn('size-10 shrink-0', className)}
      />
    );
  }

  return (
    <div ref={ref} className={cn('size-10 shrink-0', className)}>
      <svg
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        width="128"
        height="128"
        viewBox="0 0 128 128"
        className="size-full"
      >
        <use href={`#${brand}`} />
      </svg>
    </div>
  );
});

PlayerBadgeLogo.displayName = 'PlayerBadgeLogo';
