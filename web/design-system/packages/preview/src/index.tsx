import { createRoot } from 'react-dom/client';
import '@kaggle-environments/design-system-tokens/tokens.css';
import {
  PlayerBadge,
  PlayerBadgeIcon,
  PlayerBadgeLabel,
  PlayerBadgeLabelText,
  PlayerBadgeLogo,
  SvgSprite,
  PlayerBadgeIconBackground,
} from '@kaggle-environments/design-system-components';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-semibold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

function App() {
  return (
    <div id="kaggle-design-system">
      <SvgSprite />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-1 text-3xl font-bold text-neutral-900">Visualizer Design System</h1>
        <p className="mb-10 text-neutral-500">Shared tokens and components for kaggle-environments visualizers.</p>

        <Section title="PlayerBadge">
          <div className="mt-6 flex flex-wrap items-center gap-8">

            <PlayerBadge type="black">
              <PlayerBadgeIcon>
                <PlayerBadgeIconBackground variant="blank" />
                <PlayerBadgeLogo name="gemini" />
              </PlayerBadgeIcon>
              <PlayerBadgeLabel>
                <PlayerBadgeLabelText>Gemini 3 Flash Preview</PlayerBadgeLabelText>
              </PlayerBadgeLabel>
            </PlayerBadge>

            <PlayerBadge active type="white">
              <PlayerBadgeLabel>
                <PlayerBadgeLabelText>Claude</PlayerBadgeLabelText>
              </PlayerBadgeLabel>
              <PlayerBadgeIcon>
                <PlayerBadgeIconBackground variant="blank" />
                <PlayerBadgeLogo name="claude" />
              </PlayerBadgeIcon>
            </PlayerBadge>

            <PlayerBadge type="black">
              <PlayerBadgeIcon>
                <PlayerBadgeIconBackground variant="reflection" />
              </PlayerBadgeIcon>
              <PlayerBadgeLabel>
                <PlayerBadgeLogo name="claude" />
                <PlayerBadgeLabelText>Claude</PlayerBadgeLabelText>
              </PlayerBadgeLabel>
            </PlayerBadge>

            <PlayerBadge active type="white">
              <PlayerBadgeLabel>
                <PlayerBadgeLogo name="gemini" />
                <PlayerBadgeLabelText>Gemini 3 Flash Preview</PlayerBadgeLabelText>
              </PlayerBadgeLabel>
              <PlayerBadgeIcon>
                <PlayerBadgeIconBackground variant="reflection" />
              </PlayerBadgeIcon>
            </PlayerBadge>

            <PlayerBadge type="black" rotate="left">
              <PlayerBadgeIcon>
                <PlayerBadgeIconBackground variant="reflection" />
              </PlayerBadgeIcon>
              <PlayerBadgeLabel>
                <PlayerBadgeLogo name="claude" />
                <PlayerBadgeLabelText>Claude</PlayerBadgeLabelText>
              </PlayerBadgeLabel>
            </PlayerBadge>
            <PlayerBadge active type="white" rotate="right">
              <PlayerBadgeLabel>
                <PlayerBadgeLogo name="gemini" />
                <PlayerBadgeLabelText>Gemini 3 Flash Preview</PlayerBadgeLabelText>
              </PlayerBadgeLabel>
              <PlayerBadgeIcon>
                <PlayerBadgeIconBackground variant="reflection" />
              </PlayerBadgeIcon>
            </PlayerBadge>
          </div>
        </Section>
      </main>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
