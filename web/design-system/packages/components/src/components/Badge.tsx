import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@kaggle-environments/design-system-tools';

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-neutral-100 text-neutral-700',
      brand: 'bg-brand-100 text-brand-800',
      success: 'bg-success-500/10 text-success-600',
      warning: 'bg-warning-500/10 text-warning-600',
      danger: 'bg-danger-500/10 text-danger-600',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ tone, className, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ tone }), className)} {...props} />
));
Badge.displayName = 'Badge';
