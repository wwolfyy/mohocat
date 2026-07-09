import React from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Render in an error state (red border) — pair with <Field error="…">. */
  invalid?: boolean;
}

// Shared text input — neutral surface with a brand focus ring (ring-brand-300),
// matching the album filter-bar's input language. Used by public + admin forms.
const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border px-3 py-2 text-gray-900 placeholder-gray-500',
        'transition-colors focus:outline-none focus:ring-2 focus:border-transparent',
        invalid
          ? 'border-red-300 focus:ring-red-300'
          : 'border-gray-300 hover:border-gray-400 focus:ring-brand-300',
        className
      )}
      {...props}
    />
  );
});

export default Input;
