import type { Meta, StoryObj } from '@storybook/react-vite';
import { Ribbon } from './ribbon';

const meta: Meta<typeof Ribbon> = {
  title: 'Components/Ribbon',
  component: Ribbon,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Ribbon>;

export const WinnerBanner: Story = {
  args: { children: 'Winner is Black!' },
};

export const Draw: Story = {
  args: { children: 'Draw' },
};
