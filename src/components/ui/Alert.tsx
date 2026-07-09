import React from 'react';
import { cn } from '@/utils/cn';

type AlertVariant = 'error' | 'warning' | 'success';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: AlertVariant;
  children: React.ReactNode;
}

// Inline status banner (form errors, empty-state notices, etc.). Status colors
// per design.md — warning is informational yellow, distinct from the brand action.
const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: 'bg-red-50 border-red-200 text-red-600',
  warning: 'bg-amber-50 border-amber-300 text-amber-800',
  success: 'bg-green-50 border-green-200 text-green-700',
};

export default function Alert({ variant, className, children, ...props }: AlertProps) {
  return (
    <div
      className={cn('rounded-lg border p-3 text-sm', VARIANT_CLASSES[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
