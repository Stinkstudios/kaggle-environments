import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FeatureToggles } from './feature-toggles';

const meta: Meta<typeof FeatureToggles> = {
  title: 'Components/FeatureToggles',
  component: FeatureToggles,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FeatureToggles>;

// `items` is an array of {checked, onChange} pairs, not flat scalar props —
// Storybook's Controls panel can't usefully edit that shape directly, so
// this story owns its own local state (same technique as
// preview/src/index.tsx's FeatureTogglesDemo) rather than fighting args for
// a shape it wasn't built for.
export const Default: Story = {
  render: () => {
    const [prefs, setPrefs] = useState({ territory: true, animations: true, annotations: true });
    return (
      <div className="max-w-xs">
        <FeatureToggles
          items={[
            {
              key: 'territory',
              label: 'Live Territory',
              checked: prefs.territory,
              onChange: (checked) => setPrefs((p) => ({ ...p, territory: checked })),
            },
            {
              key: 'animations',
              label: 'Pop Up Animations',
              checked: prefs.animations,
              onChange: (checked) => setPrefs((p) => ({ ...p, animations: checked })),
            },
            {
              key: 'annotations',
              label: 'Board Annotations',
              checked: prefs.annotations,
              onChange: (checked) => setPrefs((p) => ({ ...p, annotations: checked })),
            },
          ]}
        />
      </div>
    );
  },
};
