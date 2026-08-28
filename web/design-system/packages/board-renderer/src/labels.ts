import { labelPlacements, type Board, type LabelOptions } from '@kaggle-environments/board';
import { Container, Text, TextStyle } from 'pixi.js';

export interface DrawLabelsOptions extends LabelOptions {
  style?: TextStyle | ConstructorParameters<typeof TextStyle>[0];
}

const DEFAULT_LABEL_STYLE = { fontFamily: '"Inter", sans-serif', fontSize: 11, fill: 0x000000 };

/**
 * Coordinate labels as a Pixi container, one `Text` per placement.
 *
 * The caller is responsible for having the font loaded --
 * `await document.fonts.load('11px "Inter"')` before this, or Pixi rasterises
 * the fallback face and never re-renders. `go` learned that the hard way; the
 * check below turns it into a warning instead of a mystery.
 */
export function drawLabels(board: Board, options: DrawLabelsOptions): Container {
  const { style, ...placementOptions } = options;
  const container = new Container();
  const textStyle = style instanceof TextStyle ? style : new TextStyle({ ...DEFAULT_LABEL_STYLE, ...style });

  if (import.meta.env?.DEV && typeof document !== 'undefined' && document.fonts) {
    const face = `${textStyle.fontSize}px ${textStyle.fontFamily}`;
    if (!document.fonts.check(face)) {
      console.warn(
        `[board-renderer] font "${face}" is not loaded yet, so labels will rasterise with the ` +
          `fallback face and stay that way. Await document.fonts.load(${JSON.stringify(face)}) first.`
      );
    }
  }

  for (const placement of labelPlacements(board, placementOptions)) {
    const label = new Text({ text: placement.text, style: textStyle });
    label.anchor.set(0.5);
    label.position.set(placement.x, placement.y);
    container.addChild(label);
  }

  return container;
}
