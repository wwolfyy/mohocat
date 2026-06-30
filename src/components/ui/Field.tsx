import React from 'react';
import { cn } from '@/utils/cn';

interface FieldProps {
  /** Visible label text (Korean). */
  label: string;
  /** Associates the label with the control. */
  htmlFor?: string;
  /** Inline error message rendered below the control (red). */
  error?: string;
  /** Optional muted helper text below the control. */
  help?: string;
  className?: string;
  children: React.ReactNode;
}

// Form-field scaffold: label above the control, optional error/help below.
// Wraps any control (typically <Input>) so labelling + error layout stay uniform.
export default function Field({ label, htmlFor, error, help, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && help && <p className="text-sm text-gray-500">{help}</p>}
    </div>
  );
}
