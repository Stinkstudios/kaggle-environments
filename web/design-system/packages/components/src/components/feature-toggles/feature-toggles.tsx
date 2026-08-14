import { cn } from '@kaggle-environments/design-system-tools';

export interface FeatureToggleItem {
  key: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Extra classes on this item's <li> — e.g. a consumer's own container-query class to hide it at narrow widths. */
  className?: string;
}

interface FeatureTogglesProps {
  items: FeatureToggleItem[];
  legend?: string;
}

// The illustrated toggle switch: a pill track with an oversized thumb
// (bigger than the track, overflowing top/bottom) and an Off/On label baked
// into the track via ::before. Preflight already sets border-style: solid
// globally, so only border-width needs setting here.
const switchClassName = cn(
  '[--switch-width:8.5ch] [--switch-height:1.75rem] [--thumb-size:2rem] [--border-width:2px]',
  '[--thumb-overflow:calc((var(--thumb-size)-var(--switch-height)+var(--border-width)*2)/2)]',
  'relative h-[var(--switch-height)] w-[var(--switch-width)] shrink-0 cursor-pointer appearance-none overflow-visible',
  'rounded-[99ch] border-[length:var(--border-width)] bg-white text-black',
  '[transition:scale_150ms] group-hover:scale-[1.05]',
  // Thumb.
  "after:absolute after:size-[var(--thumb-size)] after:rounded-full after:bg-current after:content-['']",
  'after:top-[calc(-1*var(--thumb-overflow))] after:left-[calc(-1*var(--thumb-overflow))]',
  'after:[transition:translate_200ms]',
  'checked:after:[translate:calc(var(--switch-width)-var(--thumb-size)+var(--thumb-overflow)*2-var(--border-width)*2)_0]',
  // Off/On label.
  "before:pointer-events-none before:absolute before:inset-0 before:flex before:items-center before:justify-end before:pr-[0.3rem] before:text-[10px] before:content-['Off']",
  "checked:before:justify-start checked:before:pr-0 checked:before:pl-[0.3rem] checked:before:content-['On']"
);

/**
 * A list of labeled on/off toggles (illustrated switch style). Each game
 * supplies its own preference keys/labels/state via `items` — this component
 * owns only the shared shape (fieldset, list, switch visuals), not any
 * specific preferences store, so it doesn't assume a `usePreferences` shape.
 */
export function FeatureToggles({ items, legend = 'Preferences' }: FeatureTogglesProps) {
  return (
    <fieldset className="contents">
      <legend className="sr-only">{legend}</legend>
      <ul className="contents m-0 list-none pl-0">
        {items.map((item) => (
          <li key={item.key} className={item.className}>
            <label className="group flex cursor-pointer items-center justify-between gap-2">
              {item.label}
              <input
                type="checkbox"
                className={switchClassName}
                checked={item.checked}
                onChange={(e) => item.onChange(e.target.checked)}
              />
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
