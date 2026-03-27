import { cn, STATUS_COLORS, STATUS_DOT, STATUS_LABELS, IMPACT_COLORS, IMPACT_LABELS } from '@/lib/utils';
import type { PriorityStatus, ImpactLevel } from '@/lib/types';

export function StatusBadge({ status }: { status: PriorityStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_COLORS[status])}>
      <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ImpactBadge({ impact }: { impact: ImpactLevel }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', IMPACT_COLORS[impact])}>
      {IMPACT_LABELS[impact]}
    </span>
  );
}
