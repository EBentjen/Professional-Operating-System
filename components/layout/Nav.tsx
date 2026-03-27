'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Target,
  Users,
  Zap,
  Lightbulb,
  BarChart2,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',             label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/weekly',       label: 'Weekly',      icon: Target },
  { href: '/daily',        label: 'Daily',       icon: Zap },
  { href: '/stakeholders', label: 'People',      icon: Users },
  { href: '/insights',     label: 'Insights',    icon: Lightbulb },
  { href: '/review',       label: 'Review',      icon: BarChart2 },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-6 fixed left-0 top-0 z-30">
        <div className="px-3 mb-8">
          <span className="text-xs font-bold tracking-widest uppercase text-zinc-400">Work OS</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around px-2 pb-safe">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-3 px-2 rounded-lg min-w-0',
                active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
