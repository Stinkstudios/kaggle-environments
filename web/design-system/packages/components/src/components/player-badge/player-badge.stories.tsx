import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  PlayerBadge,
  PlayerBadgeIcon,
  PlayerBadgeIconBackground,
  PlayerBadgeLabel,
  PlayerBadgeLabelText,
  PlayerBadgeLogo,
} from './player-badge';

// PlayerBadge is a compound/slot component (icon + label composed as
// children, not flat props), so it doesn't get auto-generated Controls the
// way a flat-props component would — these are representative fixed
// compositions, same ones shown in preview/src/index.tsx.
const meta: Meta<typeof PlayerBadge> = {
  title: 'Components/PlayerBadge',
  component: PlayerBadge,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PlayerBadge>;

export const IconLeft: Story = {
  render: () => (
    <PlayerBadge type="black">
      <PlayerBadgeIcon>
        <PlayerBadgeIconBackground variant="blank" />
        <PlayerBadgeLogo name="gemini" />
      </PlayerBadgeIcon>
      <PlayerBadgeLabel>
        <PlayerBadgeLabelText>Gemini 3 Flash Preview</PlayerBadgeLabelText>
      </PlayerBadgeLabel>
    </PlayerBadge>
  ),
};

export const ActiveIconRight: Story = {
  render: () => (
    <PlayerBadge active type="white">
      <PlayerBadgeLabel>
        <PlayerBadgeLabelText>Claude</PlayerBadgeLabelText>
      </PlayerBadgeLabel>
      <PlayerBadgeIcon>
        <PlayerBadgeIconBackground variant="blank" />
        <PlayerBadgeLogo name="claude" />
      </PlayerBadgeIcon>
    </PlayerBadge>
  ),
};

export const ReflectionRotated: Story = {
  render: () => (
    <PlayerBadge type="black" rotate="left">
      <PlayerBadgeIcon>
        <PlayerBadgeIconBackground variant="reflection" />
      </PlayerBadgeIcon>
      <PlayerBadgeLabel>
        <PlayerBadgeLogo name="claude" />
        <PlayerBadgeLabelText>Claude</PlayerBadgeLabelText>
      </PlayerBadgeLabel>
    </PlayerBadge>
  ),
};
