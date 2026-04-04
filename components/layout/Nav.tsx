'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Target,
  Zap,
  Users,
  Lightbulb,
  BarChart2,
  Inbox,
  Trophy,
  Users2,
  TrendingUp,
  CalendarDays,
  FileText,
  BookOpen,
  Search,
  FileBarChart2,
  HardDrive,
  FolderKanban,
  ClipboardList,
  ClipboardCheck,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Execute',
    items: [
      { href: '/',        label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/weekly',  label: 'Weekly',     icon: Target },
      { href: '/daily',   label: 'Daily',      icon: Zap },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/stakeholders', label: 'Stakeholders', icon: Users },
      { href: '/one-on-ones',  label: '1:1 Notes',    icon: Users2 },
      { href: '/follow-ups',   label: 'Follow-Ups',   icon: ClipboardList },
      { href: '/prep',         label: 'Meeting Prep', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Capture',
    items: [
      { href: '/capture',   label: 'Inbox',    icon: Inbox },
      { href: '/wins',      label: 'Wins',     icon: Trophy },
      { href: '/learning',  label: 'Learning', icon: BookOpen },
    ],
  },
  {
    label: 'Plan',
    items: [
      { href: '/projects',  label: 'Projects',  icon: FolderKanban },
      { href: '/okrs',      label: 'OKRs',      icon: TrendingUp },
      { href: '/calendar',  label: 'Calendar',  icon: CalendarDays },
      { href: '/templates', label: 'Templates', icon: FileText },
    ],
  },
  {
    label: 'Reflect',
    items: [
      { href: '/insights', label: 'Insights',      icon: Lightbulb },
      { href: '/review',   label: 'Weekly Review', icon: BarChart2 },
      { href: '/brief',    label: 'Weekly Brief',  icon: FileBarChart2 },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/backup', label: 'Backup & Restore', icon: HardDrive },
    ],
  },
];

// Mobile bottom nav: most-used items only
const MOBILE_NAV = [
  { href: '/',        label: 'Home',    icon: LayoutDashboard },
  { href: '/weekly',  label: 'Weekly',  icon: Target },
  { href: '/daily',   label: 'Daily',   icon: Zap },
  { href: '/capture', label: 'Inbox',   icon: Inbox },
  { href: '/search',  label: 'Search',  icon: Search },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-6 fixed left-0 top-0 z-30 overflow-y-auto">
        <div className="px-3 mb-6 flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest uppercase text-zinc-400">Work OS</span>
          <Link href="/search" className={cn('p-1.5 rounded-md transition-colors', pathname === '/search' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800')}>
            <Search size={14} />
          </Link>
        </div>

        <nav className="flex flex-col gap-4">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        active
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                      )}
                    >
                      <Icon size={15} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around px-2 pb-safe">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
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
