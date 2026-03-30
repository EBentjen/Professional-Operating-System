// ─── Core Status Types ────────────────────────────────────────────────────────

export type PriorityStatus = 'not_started' | 'in_progress' | 'blocked' | 'done';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type StakeholderTier = 'primary' | 'secondary';
export type OKRStatus = 'on_track' | 'at_risk' | 'off_track' | 'complete';
export type WinCategory = 'leadership' | 'financial' | 'operational' | 'strategic' | 'team' | 'general';
export type SourceType = 'book' | 'article' | 'podcast' | 'conversation' | 'course' | 'other';
export type TemplateCategory = 'board' | 'budget' | 'communication' | 'hr' | 'strategy' | 'general' | 'meeting';
export type EventType = 'deadline' | 'meeting' | 'review' | 'report' | 'close';
export type CaptureStatus = 'inbox' | 'processed' | 'archived';

// ─── Week ────────────────────────────────────────────────────────────────────

export interface Week {
  id: number;
  week_start: string;
  week_end: string;
  theme: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Priority ────────────────────────────────────────────────────────────────

export interface Priority {
  id: number;
  week_id: number;
  title: string;
  outcome: string;
  why_it_matters: string;
  status: PriorityStatus;
  impact: ImpactLevel;
  deadline: string | null;
  blocked_reason: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
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
  relationship: string | null;
}

// ─── Follow-Up ───────────────────────────────────────────────────────────────

export interface FollowUp {
  id: number;
  priority_id: number | null;
  stakeholder_id: number | null;
  description: string;
  due_date: string | null;
  is_complete: number;
  created_at: string;
  updated_at: string;
  stakeholder_name?: string;
  priority_title?: string;
}

// ─── Daily Focus ─────────────────────────────────────────────────────────────

export interface DailyFocus {
  id: number;
  focus_date: string;
  priority_id: number | null;
  title: string;
  notes: string | null;
  is_complete: number;
  order_index: number;
  created_at: string;
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
  talking_points: string | null;
  created_at: string;
  updated_at: string;
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

// ─── Capture ─────────────────────────────────────────────────────────────────

export interface Capture {
  id: number;
  content: string;
  tags: string;
  status: CaptureStatus;
  created_at: string;
}

// ─── Decision ────────────────────────────────────────────────────────────────

export interface Decision {
  id: number;
  title: string;
  context: string;
  decision: string;
  rationale: string;
  alternatives: string;
  stakeholders: string; // JSON array of names
  outcome: string;
  tags: string;
  date: string;
  created_at: string;
  updated_at: string;
}

// ─── Win ─────────────────────────────────────────────────────────────────────

export interface Win {
  id: number;
  title: string;
  description: string;
  impact: string;
  metric: string;
  category: WinCategory;
  date: string;
  created_at: string;
}

// ─── 1:1 ─────────────────────────────────────────────────────────────────────

export interface OneOnOne {
  id: number;
  stakeholder_id: number | null;
  stakeholder_name: string;
  relationship: 'reports_to' | 'direct_report' | 'peer';
  date: string;
  agenda: string; // JSON array
  notes: string;
  my_commitments: string; // JSON array
  their_commitments: string; // JSON array
  themes: string;
  next_agenda: string; // JSON array
  created_at: string;
  updated_at: string;
}

// ─── OKR ─────────────────────────────────────────────────────────────────────

export interface OKR {
  id: number;
  title: string;
  description: string;
  quarter: string;
  status: OKRStatus;
  created_at: string;
  updated_at: string;
  key_results?: KeyResult[];
}

export interface KeyResult {
  id: number;
  okr_id: number;
  title: string;
  target: string;
  current_value: string;
  unit: string;
  progress: number; // 0-100
  status: OKRStatus;
  created_at: string;
}

// ─── Financial Event ─────────────────────────────────────────────────────────

export interface FinancialEvent {
  id: number;
  title: string;
  event_type: EventType;
  bd_day: number | null; // business day of month
  specific_date: string | null;
  recurring: 'monthly' | 'quarterly' | 'annual' | 'once';
  notes: string;
  color: string;
  created_at: string;
}

// ─── Template ────────────────────────────────────────────────────────────────

export interface Template {
  id: number;
  title: string;
  category: TemplateCategory;
  description: string;
  content: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

// ─── Learning ────────────────────────────────────────────────────────────────

export interface Learning {
  id: number;
  title: string;
  source: string;
  source_type: SourceType;
  key_takeaway: string;
  action_item: string;
  tags: string;
  date: string;
  created_at: string;
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

// ─── Stakeholder Project ──────────────────────────────────────────────────────

export interface StakeholderProject {
  id: number;
  stakeholder_id: number;
  title: string;
  status: PriorityStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ─── Template File ────────────────────────────────────────────────────────────

export interface TemplateFile {
  id: number;
  title: string;
  filename: string;
  category: TemplateCategory;
  description: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

// ─── Search Result ────────────────────────────────────────────────────────────

export interface SearchResult {
  type: 'priority' | 'decision' | 'win' | 'learning' | 'capture' | 'one_on_one' | 'template' | 'stakeholder';
  id: number;
  title: string;
  excerpt: string;
  date: string;
  href: string;
}
