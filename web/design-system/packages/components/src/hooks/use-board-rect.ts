import { useEffect } from 'react';

/**
 * Tracks a board element's viewport-relative position and exposes it as CSS
 * custom properties (`--area-top/left/width/height`, `--board-top/left/width/height`)
 * on the element with id `areaId`. Consumers use `position: fixed` with these
 * values. Replaces CSS Anchor Positioning, which lacks cross-browser support.
 */
export function useBoardRect(areaId: string, boardId = 'board'): void {
  useEffect(() => {
    const area = document.getElementById(areaId);
    const board = document.getElementById(boardId);
    if (!area || !board) return;

    const sync = () => {
      const a = area.getBoundingClientRect();
      area.style.setProperty('--area-top', `${a.top}px`);
      area.style.setProperty('--area-left', `${a.left}px`);
      area.style.setProperty('--area-width', `${a.width}px`);
      area.style.setProperty('--area-height', `${a.height}px`);

      const r = board.getBoundingClientRect();
      area.style.setProperty('--board-top', `${r.top}px`);
      area.style.setProperty('--board-left', `${r.left}px`);
      area.style.setProperty('--board-width', `${r.width}px`);
      area.style.setProperty('--board-height', `${r.height}px`);
    };

    const ro = new ResizeObserver(sync);
    ro.observe(board);
    ro.observe(area);
    area.addEventListener('scroll', sync, { passive: true });
    sync();

    return () => {
      ro.disconnect();
      area.removeEventListener('scroll', sync);
    };
  }, [areaId, boardId]);
}
