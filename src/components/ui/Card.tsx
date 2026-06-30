import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

// The standard content surface panel: white box, hairline border, subtle shadow.
// Surfaces stay neutral (per design.md) so brand color carries actions, not panels.
export default function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-lg border border-gray-200 shadow-sm p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}
