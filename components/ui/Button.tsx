'use client';

import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          {
            primary: 'bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100',
            secondary: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
            ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus:ring-zinc-300 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
            danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
          }[variant],
          {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-4 py-2 text-sm',
            lg: 'px-5 py-2.5 text-base',
          }[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
