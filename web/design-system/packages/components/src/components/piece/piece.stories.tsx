import type { Meta, StoryObj } from '@storybook/react-vite';
import { Piece } from './piece';
import { pieceIds, pieceFamily, missingPieces } from '@kaggle-environments/design-system-assets';

const meta: Meta<typeof Piece> = {
  title: 'Components/Piece',
  component: Piece,
  tags: ['autodocs'],
  args: { id: 'chess:w-king', size: 'lg' },
  argTypes: {
    id: { control: 'select', options: pieceIds() },
    size: { control: 'radio', options: ['sm', 'md', 'lg', 'full', 'auto'] },
  },
};

export default meta;
type Story = StoryObj<typeof Piece>;

export const Single: Story = {};

const RANKS = ['a', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k'];
const SUITS = ['spade', 'heart', 'diamond', 'club'];

/**
 * The full deck, laid out as it's named: rank across, suit down. Cards come
 * from individual files (`"individual": true`), not an atlas — 54 faces at
 * 462x643 would span two 4096px sheets, and every card game here is DOM.
 */
export const CardDeck: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {SUITS.map((suit) => (
        <div key={suit} className="flex gap-2">
          {RANKS.map((rank) => (
            <Piece key={rank} id={`card:${rank}-${suit}`} size="auto" className="h-24" />
          ))}
        </div>
      ))}
      <div className="mt-4 flex gap-2">
        <Piece id="card:back" size="auto" className="h-24" />
        <Piece id="card:joker" size="auto" className="h-24" />
      </div>
    </div>
  ),
};

/**
 * A realistic hand. Cards keep their 462:643 ratio from the manifest, so a row
 * spaces evenly — no letterboxing inside square boxes.
 */
export const CardHand: Story = {
  render: () => (
    <div className="flex items-end gap-1">
      {['a-spade', 'k-spade', 'q-spade', 'j-spade', '10-spade'].map((id, i) => (
        <Piece
          key={id}
          id={`card:${id}`}
          size="auto"
          className="h-40 drop-shadow-md"
          style={{ transform: `rotate(${(i - 2) * 4}deg)` }}
        />
      ))}
      <Piece id="card:back" size="auto" className="ml-6 h-40 drop-shadow-md" />
    </div>
  ),
};

/** Same id, every size token — cards stay aspect-correct at each. */
export const CardSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Piece id="card:q-heart" size={size} />
          <span className="text-xs">{size}</span>
        </div>
      ))}
      {['h-24', 'h-32', 'h-48'].map((h) => (
        <div key={h} className="flex flex-col items-center gap-2">
          <Piece id="card:q-heart" size="auto" className={h} />
          <span className="text-xs">auto {h}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * The whole chess family from one atlas. addon-a11y checks labelling here —
 * every piece carries alt text from the manifest, none hand-written.
 */
export const ChessSet: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-4">
      {pieceIds('chess').map((id) => (
        <div key={id} className="flex flex-col items-center gap-2">
          <Piece id={id} size="lg" />
          <span className="text-xs">{id.split(':')[1]}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * Decorative art: `alt=""` + `aria-hidden`, never announced. These frames are
 * deliberately non-square (`fx:pawn` is 18x96) — they should keep their shape,
 * not stretch.
 */
export const DecorativeParticles: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      {pieceIds('fx').map((id) => (
        <Piece key={id} id={id} size="auto" className="h-16" />
      ))}
    </div>
  ),
};

/**
 * Asset-first with an honest gap. An unknown id renders the fallback and marks
 * itself `data-piece-missing` rather than substituting another piece's art.
 */
export const MissingArtwork: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Piece id="card:a-spade" size="auto" className="h-24" />
      <Piece
        id="card:2-joker"
        size="auto"
        className="h-24 w-16 border border-dashed"
        fallback={<span className="text-xs">no art</span>}
      />
      <span className="text-xs">
        declared gaps: {missingPieces().length || 'none'} · card family individual:{' '}
        {String(pieceFamily('card').pieces.length)} pieces
      </span>
    </div>
  ),
};
