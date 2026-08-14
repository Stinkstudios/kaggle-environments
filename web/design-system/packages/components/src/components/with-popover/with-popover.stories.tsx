import type { Meta, StoryObj } from '@storybook/react-vite';
import { WithPopover } from './with-popover';

const meta: Meta<typeof WithPopover> = {
  title: 'Components/WithPopover',
  component: WithPopover,
  tags: ['autodocs'],
  args: {
    id: 'storybook-popover',
    icon: 'info',
    label: 'Game info',
    children: 'A short explanation of the game goes here.',
  },
};

export default meta;
type Story = StoryObj<typeof WithPopover>;

export const Default: Story = {};

export const SettingsIcon: Story = {
  args: { id: 'storybook-popover-settings', icon: 'settings', label: 'Settings', children: 'Preference toggles go here.' },
};

// WithPopover doesn't declare its own container-type — it relies on an
// ancestor for that (see with-popover.tsx). This story supplies one and
// exposes its width as a control, so the @max-[600px]: shrink is something
// you can drag to, not a hardcoded fixture.
interface ResizableArgs {
  containerWidth: number;
}

export const ResizableContainer: StoryObj<ResizableArgs> = {
  args: { containerWidth: 400 },
  argTypes: {
    containerWidth: { control: { type: 'range', min: 200, max: 700, step: 10 } },
  },
  render: (args: ResizableArgs) => (
    <div className="@container border border-dashed border-neutral-400 p-4" style={{ width: args.containerWidth }}>
      <WithPopover id="storybook-popover-resizable" icon="info" label="Game info">
        Shrinks below a 600px container.
      </WithPopover>
    </div>
  ),
};
