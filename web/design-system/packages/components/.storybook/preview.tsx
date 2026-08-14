import type { Preview } from '@storybook/react-vite';
import '@kaggle-environments/design-system-tokens/tokens.css';
import { SvgSprite } from '../src/components';

// Every component compiles its Tailwind classes scoped under
// #kaggle-design-system (tokens.css's Preflight-reset convention — see
// ribbon.module.css/feature-toggles.tsx for why), and WithPopover's `icon`
// prop resolves against the inlined <SvgSprite> symbolset — both need to be
// present globally, exactly like preview/src/index.tsx's <App> root does.
const preview: Preview = {
  decorators: [
    (Story) => (
      <div id="kaggle-design-system">
        <SvgSprite />
        <div className="p-6">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default preview;
