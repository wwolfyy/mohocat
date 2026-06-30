import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

// The standard admin surface panel: white box, hairline border, subtle shadow.
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
