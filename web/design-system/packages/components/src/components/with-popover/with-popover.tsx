import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@kaggle-environments/design-system-tools';
import { useTransition } from '../../hooks/use-transition';
import popoverBg from '../../assets/images/popover.webp';

interface WithPopoverProps {
  children: ReactNode;
  /** A symbol ID in the consumer's own SVG symbolset. */
  icon: string;
  id: string;
  label: string;
  onChange?: (open: boolean) => void;
  reducedMotion?: boolean;
}

/** A trigger button that opens a positioned popover panel. */
export function WithPopover({ children, icon, id, label, onChange, reducedMotion = false }: WithPopoverProps) {
  const [open, setOpen] = useState(false);
  const prevOpenRef = useRef(open);
  const onChangeRef = useRef(onChange);
  const transition = useTransition({ duration: 0.2, ease: 'easeOut' }, reducedMotion);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (prevOpenRef.current !== open) {
      prevOpenRef.current = open;
      onChangeRef.current?.(open);
    }

    if (!open) return;

    // Wait a frame, then focus the popover.
    window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        className={cn(
          'size-11 cursor-pointer appearance-none rounded-full border-2 bg-white p-2 text-black',
          'shadow-[-0.125rem_0.125rem_0_#000] [transition:box-shadow_100ms,scale_200ms] [will-change:scale]',
          'hover:scale-[var(--scale-hover)]',
          'active:scale-[var(--scale-press)] active:shadow-[0_0_#000]',
          'data-[open]:scale-[var(--scale-press)] data-[open]:shadow-[0_0_#000]',
          // Shrink to an icon-only button once the container narrows below 600px.
          '@max-[600px]:grid @max-[600px]:size-[30px] @max-[600px]:place-items-center @max-[600px]:p-0',
          '@max-[600px]:shadow-[-1px_1px_0_#000] @max-[600px]:[&>svg]:size-4'
        )}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((prev) => !prev)}
        data-open={open || undefined}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <use xlinkHref={`#${icon}`} />
        </svg>
        <span className="sr-only">{label}</span>
      </button>
      <motion.div
        ref={panelRef}
        id={id}
        className={cn(
          'absolute left-full top-1/2 z-10 aspect-[611/443] w-[300px] overflow-hidden',
          'bg-transparent bg-cover bg-left bg-no-repeat text-left text-inherit',
          '[will-change:transform,opacity]',
          '@max-[600px]:w-[240px] @max-[600px]:text-[13px] @max-[600px]:leading-normal'
        )}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        aria-hidden={!open || undefined}
        initial={{ opacity: 0, scale: 0.95, display: 'none' }}
        animate={
          open
            ? { display: 'block', opacity: 1, scale: 1 }
            : { opacity: 0, scale: 0.95, transitionEnd: { display: 'none' } }
        }
        transition={transition}
        style={{
          backgroundImage: `url(${popoverBg})`,
          transformOrigin: 'left center',
          // Framer Motion drives `transform` directly via inline style for the
          // scale animation, which would clobber Tailwind's transform-based
          // translate-* utilities — the standalone `translate` property
          // composes independently of `transform`, so it survives motion's
          // animation writes.
          translate: '0.5rem -50%',
        }}
      >
        <button
          className="sr-only absolute right-0 top-0 z-[1] border border-black bg-white p-2 focus:not-sr-only"
          onClick={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        >
          Close
        </button>
        <div className="box-border size-full overflow-auto [padding:2.5%_3%_3%_11%]">
          <div className="grid h-full items-center px-[1em] py-[0.5em]">{children}</div>
        </div>
      </motion.div>
    </div>
  );
}
