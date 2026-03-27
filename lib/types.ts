// ─── Core Status Types ────────────────────────────────────────────────────────

export type PriorityStatus = 'not_started' | 'in_progress' | 'blocked' | 'done';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type StakeholderTier = 'primary' | 'secondary';

// ─── Week ────────────────────────────────────────────────────────────────────

export interface Week {
  id: number;
  week_start: string; // ISO date string (Monday)
  week_end: string;   // ISO date string (Friday)
  theme: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Priority ────────────────────────────────────────────────────────────────

export interface Priority {
  id: number;
  week_id: number;
  title: string;
  outcome: string;           // What "done" looks like
  why_it_matters: string;    // Strategic rationale
  status: PriorityStatus;
  impact: ImpactLevel;
  deadline: string | null;
  blocked_reason: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  // Joined
  deliverables?: Deliverable[];
  stakeholders?: Stakeholder[];
}

// ─── Deliverable ─────────────────────────────────────────────────────────────

export interface Deliverable {
  id: number;
  priority_id: number;
  title: string;
  due_date: string | null;
  status: PriorityStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined (when fetched with priority context)
  priority_title?: string;
}

// ─── Stakeholder ─────────────────────────────────────────────────────────────

export interface Stakeholder {
  id: number;
  name: string;
  title: string | null;
  tier: StakeholderTier;
  notes: string | null;
  created_at: string;
}

// ─── Priority <> Stakeholder Join ─────────────────────────────────────────────

export interface PriorityStakeholder {
  priority_id: number;
  stakeholder_id: number;
  relationship: string | null; // "owner" | "approver" | "informed" | "waiting_on"
}

// ─── Follow-Up ───────────────────────────────────────────────────────────────

export interface FollowUp {
  id: number;
  priority_id: number | null;
  stakeholder_id: number | null;
  description: string;
  due_date: string | null;
  is_complete: number; // 0 | 1 (SQLite boolean)
  created_at: string;
  updated_at: string;
  // Joined
  stakeholder_name?: string;
  priority_title?: string;
}

// ─── Daily Focus ─────────────────────────────────────────────────────────────

export interface DailyFocus {
  id: number;
  focus_date: string; // ISO date
  priority_id: number | null;
  title: string;
  notes: string | null;
  is_complete: number;
  order_index: number;
  created_at: string;
  // Joined
  priority_title?: string;
}

// ─── Insight ─────────────────────────────────────────────────────────────────

export interface Insight {
  id: number;
  priority_id: number | null;
  week_id: number | null;
  key_question: string;
  takeaway: string;
  recommendation: string;
  executive_summary: string | null;
  talking_points: string | null; // JSON array stored as string
  created_at: string;
  updated_at: string;
  // Joined
  priority_title?: string;
}

// ─── Weekly Review ────────────────────────────────────────────────────────────

export interface WeeklyReview {
  id: number;
  week_id: number;
  accomplished: string;
  slipped: string;
  time_analysis: string;
  patterns: string;
  next_week_focus: string;
  created_at: string;
  updated_at: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// ─── Dashboard Summary ────────────────────────────────────────────────────────

export interface DashboardSummary {
  currentWeek: Week | null;
  priorities: Priority[];
  atRisk: Priority[];
  todayFocus: DailyFocus[];
  pendingFollowUps: FollowUp[];
  overdueDeliverables: Deliverable[];
}
