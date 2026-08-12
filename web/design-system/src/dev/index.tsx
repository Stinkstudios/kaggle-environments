import * as React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/main.css';
import { Button, Badge, Card } from '../components';
import type { BadgeTone } from '../components';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-semibold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

// Literal class names so Tailwind's content scanner can find and generate them.
const colorSwatches: Array<{ label: string; classes: string[] }> = [
  {
    label: 'brand',
    classes: [
      'bg-brand-50',
      'bg-brand-100',
      'bg-brand-200',
      'bg-brand-300',
      'bg-brand-400',
      'bg-brand-500',
      'bg-brand-600',
      'bg-brand-700',
      'bg-brand-800',
      'bg-brand-900',
    ],
  },
  {
    label: 'neutral',
    classes: [
      'bg-neutral-0',
      'bg-neutral-50',
      'bg-neutral-100',
      'bg-neutral-200',
      'bg-neutral-300',
      'bg-neutral-400',
      'bg-neutral-500',
      'bg-neutral-600',
      'bg-neutral-700',
      'bg-neutral-800',
      'bg-neutral-900',
    ],
  },
  { label: 'success', classes: ['bg-success-500', 'bg-success-600'] },
  { label: 'warning', classes: ['bg-warning-500', 'bg-warning-600'] },
  { label: 'danger', classes: ['bg-danger-500', 'bg-danger-600'] },
];

function ColorSwatches() {
  return (
    <div className="flex flex-col gap-6">
      {colorSwatches.map(({ label, classes }) => (
        <div key={label}>
          <div className="mb-2 text-sm font-medium text-neutral-600">{label}</div>
          <div className="flex flex-wrap gap-2">
            {classes.map((cls) => (
              <div key={cls} className="flex flex-col items-center gap-1">
                <div className={`h-12 w-12 rounded-md border border-neutral-200 ${cls}`} />
                <span className="text-xs text-neutral-500">{cls.split('-').slice(2).join('-')}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const radiusClasses = ['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl'];

function RadiusSwatches() {
  return (
    <div className="flex flex-wrap gap-6">
      {radiusClasses.map((cls) => (
        <div key={cls} className="flex flex-col items-center gap-2">
          <div className={`h-16 w-16 bg-brand-500 ${cls}`} />
          <span className="text-xs text-neutral-500">{cls}</span>
        </div>
      ))}
    </div>
  );
}

function TypographySample() {
  return (
    <div className="font-sans">
      <p className="mb-2 text-3xl font-bold text-neutral-900">Aa Bb Cc 123</p>
      <p className="text-base text-neutral-700">The quick brown fox jumps over the lazy dog.</p>
    </div>
  );
}

const badgeTones: BadgeTone[] = ['neutral', 'brand', 'success', 'warning', 'danger'];

function App() {
  return (
    <div id="kaggle-design-system">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-1 text-3xl font-bold text-neutral-900">Visualizer Design System</h1>
        <p className="mb-10 text-neutral-500">Shared tokens and components for kaggle-environments visualizers.</p>

        <Section title="Colors">
          <ColorSwatches />
        </Section>

        <Section title="Radius">
          <RadiusSwatches />
        </Section>

        <Section title="Typography (font-sans)">
          <TypographySample />
        </Section>

        <Section title="Button">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title="Badge">
          <div className="flex flex-wrap gap-2">
            {badgeTones.map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </div>
        </Section>

        <Section title="Card">
          <Card className="max-w-sm">
            <h3 className="mb-1 font-semibold text-neutral-900">Card title</h3>
            <p className="text-sm text-neutral-500">Card content goes here.</p>
          </Card>
        </Section>
      </main>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
