import { useEffect, useRef, useState } from 'react';
import { createBoardRenderer, isAbortError, type BoardRenderer, type BoardRendererOptions } from '../index';

export interface BoardCanvasProps<L extends string> {
  options: BoardRendererOptions<L>;
  /** Draw the static furniture once, after textures are loaded. */
  setup: (renderer: BoardRenderer<L>) => void | Promise<void>;
  /** Re-run whenever `step` changes. */
  update?: (renderer: BoardRenderer<L>, step: number) => void;
  step?: number;
  /** CSS size. The drawing surface is sized from the board; this only scales it. */
  display?: number;
}

/**
 * Mounts a renderer for one story and tears it down again.
 *
 * The `AbortController` is not ceremony: React 18 StrictMode double-mounts
 * every effect in development, so without it the first `createBoardRenderer`
 * resolves into an unmounted component and leaves an orphaned WebGL context
 * behind. Storybook runs in exactly that mode, which makes these stories a real
 * test of the abort path rather than a decorative one.
 */
export function BoardCanvas<L extends string>({ options, setup, update, step = 0, display }: BoardCanvasProps<L>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<BoardRenderer<L> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const controller = new AbortController();
    let created: BoardRenderer<L> | null = null;

    (async () => {
      const next = await createBoardRenderer(host, { ...options, signal: controller.signal });
      created = next;
      await setup(next);
      if (controller.signal.aborted) return;
      setRenderer(next);
    })().catch((cause) => {
      if (isAbortError(cause)) return;
      console.error(cause);
      setError(String(cause));
    });

    return () => {
      controller.abort();
      created?.destroy();
      setRenderer(null);
    };
    // Stories rebuild the whole scene when their board changes, which is the
    // honest thing for a resize too -- `fit` produces a different Board.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.board]);

  useEffect(() => {
    if (renderer && update) update(renderer, step);
  }, [renderer, update, step]);

  if (error) return <pre style={{ color: '#b00', maxWidth: 480, whiteSpace: 'pre-wrap' }}>{error}</pre>;

  return <div ref={hostRef} style={{ width: display, height: display, lineHeight: 0 }} />;
}

/** A step slider, so the sprite reconciler can be watched doing its job. */
export function StepControl({
  step,
  count,
  onChange,
  label,
}: {
  step: number;
  count: number;
  onChange: (step: number) => void;
  label?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
      <input
        type="range"
        min={0}
        max={count - 1}
        value={step}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ minWidth: 140, fontVariantNumeric: 'tabular-nums' }}>
        {label ?? `step ${step} / ${count - 1}`}
      </span>
    </div>
  );
}
