import * as React from 'react';
import { cn } from '../utils/cn';

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-lg border border-neutral-200 bg-neutral-0 p-4 shadow-sm', className)}
    {...props}
  />
));
Card.displayName = 'Card';
