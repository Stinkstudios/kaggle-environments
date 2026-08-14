import { ReactNode } from 'react';
import { cn } from '@kaggle-environments/design-system-tools';

interface RibbonProps {
  children: ReactNode;
  className?: string;
}

interface FlagEndProps {
  className?: string;
}

export function FlagEnd({ className }: FlagEndProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 55 116"
      width="55"
      height="114"
      className={cn('absolute top-[10%] block h-[80%] w-auto stroke-2', className)}
    >
      <path
        className="fill-white"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        d="M52 113H3q-2-1-2-3l28-51v-4L1 4q0-2 2-3h49l2 2v108z"
      />
    </svg>
  );
}

/**
 * A ribbon banner (e.g. game-over winner text) with flag-shaped ends. Since
 * Ribbon always renders exactly two FlagEnds itself, "left" vs "right"
 * positioning is passed directly as a className per instance instead of an
 * nth-child selector — no CSS module needed at all.
 */
export function Ribbon({ children, className }: RibbonProps) {
  return (
    <div
      data-testid="ribbon"
      className={cn(
        'grid-pile relative mx-auto h-full w-fit text-center leading-[1.4] text-[length:var(--ribbon-font-size,1.5rem)]',
        '[--shadow-size:0.3125rem] [--shadow-color:rgb(0_0_0_/_35%)]',
        'drop-shadow-[calc(var(--shadow-size)*-1)_var(--shadow-size)_var(--shadow-color)]',
        '[transform:translateZ(0)]', // Fixes Safari filters.
        className
      )}
    >
      <FlagEnd className="left-0 translate-x-[-90%]" />
      <FlagEnd className="right-0 translate-x-[90%] -scale-100" />
      <div className="relative rounded-sm border-2 border-black bg-white px-[var(--ribbon-padding-inline,1.5em)] py-[var(--ribbon-padding-block,1em)]">
        {children}
      </div>
    </div>
  );
}
