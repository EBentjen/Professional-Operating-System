'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Users } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { DatePicker } from '@/components/ui/DatePicker';
import { formatDate } from '@/lib/utils';
import type { OneOnOne } from '@/lib/types';

const EMPTY_FORM = {
  stakeholder_name: '',
  relationship: 'direct_report' as OneOnOne['relationship'],
  date: '',
  agenda: '',
  notes: '',
  my_commitments: '',
  their_commitments: '',
  themes: '',
  next_agenda: '',
};

function parseList(json: string): string[] {
  try { return JSON.parse(json) || []; } catch { return []; }
}

function listToJson(s: string): string {
  return JSON.stringify(s.split('\n').map(l => l.trim()).filter(Boolean));
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function groupByMonth(records: OneOnOne[]): { month: string; items: OneOnOne[] }[] {
  const map = new Map<string, OneOnOne[]>();
  for (const r of records) {
    const month = getMonthLabel(r.date);
    if (!map.has(month)) map.set(month, []);
    map.get(month)!.push(r);
  }
  return Array.from(map.entries()).map(([month, items]) => ({ month, items }));
}

function MeetingCard({
  r,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  r: OneOnOne;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(r.date)}</p>
            {parseList(r.next_agenda).length > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                {parseList(r.next_agenda).length} item{parseList(r.next_agenda).length !== 1 ? 's' : ''} for next meeting
              </p>
            )}
          </div>
          {expanded ? <ChevronUp size={15} className="text-zinc-400" /> : <ChevronDown size={15} className="text-zinc-400" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardBody className="border-t border-zinc-100 dark:border-zinc-800">
          <div className="space-y-4 text-sm">
            {parseList(r.agenda).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Agenda</p>
                <ul className="space-y-1">
                  {parseList(r.agenda).map((item, i) => (
                    <li key={i} className="flex gap-2 text-zinc-700 dark:text-zinc-300">
                      <span className="text-zinc-300 dark:text-zinc-600">–</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {r.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Notes</p>
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{r.notes}</p>
              </div>
            )}
            {parseList(r.my_commitments).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">My Commitments</p>
                <ul className="space-y-1">
                  {parseList(r.my_commitments).map((item, i) => (
                    <li key={i} className="flex gap-2 text-zinc-700 dark:text-zinc-300">
                      <span className="text-amber-500">→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parseList(r.their_commitments).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Their Commitments</p>
                <ul className="space-y-1">
                  {parseList(r.their_commitments).map((item, i) => (
                    <li key={i} className="flex gap-2 text-zinc-700 dark:text-zinc-300">
                      <span className="text-blue-500">←</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {r.themes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Themes / Patterns</p>
                <p className="text-zinc-700 dark:text-zinc-300">{r.themes}</p>
              </div>
            )}
            {parseList(r.next_agenda).length > 0 && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">Prep for Next Meeting</p>
                <ul className="space-y-1">
                  {parseList(r.next_agenda).map((item, i) => (
                    <li key={i} className="flex gap-2 text-blue-700 dark:text-blue-300">
                      <span>·</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
              <Button variant="danger" size="sm" onClick={onDelete}><Trash2 size={13} /> Delete</Button>
            </div>
          </div>
        </CardBody>
      )}
    </Card>
  );
}

function PersonSection({
  name,
  records,
  onAdd,
  onEdit,
  onDelete,
  buttonLabel = 'New 1:1',
  emptyLabel = 'Add first 1:1',
}: {
  name: string;
  records: OneOnOne[];
  onAdd: () => void;
  onEdit: (r: OneOnOne) => void;
  onDelete: (id: number) => void;
  buttonLabel?: string;
  emptyLabel?: string;
}) {
  const groups = groupByMonth(records);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() =>
    new Set(groups.length > 0 ? [groups[0].month] : [])
  );
  const [expandedCards, setExpandedCards] = useState<Set<number>>(
    () => new Set(records.length > 0 ? [records[0].id] : [])
  );

  function toggleMonth(month: string) {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }

  function toggleCard(id: number) {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{name}</p>
        <Button size="sm" onClick={onAdd}><Plus size={13} /> {buttonLabel}</Button>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 p-6 text-center">
          <p className="text-sm text-zinc-400">No meetings logged yet</p>
          <button onClick={onAdd} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mt-1 underline underline-offset-2">
            {emptyLabel}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(({ month, items }) => (
            <div key={month}>
              <button
                onClick={() => toggleMonth(month)}
                className="flex items-center gap-2 w-full text-left py-1.5 px-1 group"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                  {month}
                </span>
                <span className="text-xs text-zinc-300 dark:text-zinc-600">
                  {items.length} meeting{items.length !== 1 ? 's' : ''}
                </span>
                {expandedMonths.has(month)
                  ? <ChevronUp size={12} className="text-zinc-300 ml-auto" />
                  : <ChevronDown size={12} className="text-zinc-300 ml-auto" />
                }
              </button>

              {expandedMonths.has(month) && (
                <div className="space-y-2 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800 ml-1">
                  {items.map(r => (
                    <MeetingCard
                      key={r.id}
                      r={r}
                      expanded={expandedCards.has(r.id)}
                      onToggle={() => toggleCard(r.id)}
                      onEdit={() => onEdit(r)}
                      onDelete={() => onDelete(r.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OneOnOnesPage() {
  const [records, setRecords] = useState<OneOnOne[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<OneOnOne | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/one-on-ones');
    setRecords(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Split into sections
  const reportsTo = records.filter(r => r.relationship === 'reports_to');
  const directReports = records.filter(r => r.relationship === 'direct_report' || r.relationship === 'peer');
  const teamReviews = records.filter(r => r.relationship === 'team_review');

  const directReportPeople = [...new Set(directReports.map(r => r.stakeholder_name))].sort();
  const teamReviewTeams = [...new Set(teamReviews.map(r => r.stakeholder_name))].sort();

  function openAdd(defaults: Partial<typeof EMPTY_FORM> = {}) {
    setEditRecord(null);
    const defaultDate = defaults.relationship === 'team_review' ? '' : getNextMonday();
    setForm({ ...EMPTY_FORM, date: defaultDate, ...defaults });
    setModalOpen(true);
  }

  function openEdit(r: OneOnOne) {
    setEditRecord(r);
    setForm({
      stakeholder_name: r.stakeholder_name,
      relationship: r.relationship || 'direct_report',
      date: r.date,
      agenda: parseList(r.agenda).join('\n'),
      notes: r.notes,
      my_commitments: parseList(r.my_commitments).join('\n'),
      their_commitments: parseList(r.their_commitments).join('\n'),
      themes: r.themes,
      next_agenda: parseList(r.next_agenda).join('\n'),
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.stakeholder_name || !form.date) return;
    const body = {
      stakeholder_name: form.stakeholder_name,
      relationship: form.relationship,
      date: form.date,
      agenda: listToJson(form.agenda),
      notes: form.notes,
      my_commitments: listToJson(form.my_commitments),
      their_commitments: listToJson(form.their_commitments),
      themes: form.themes,
      next_agenda: listToJson(form.next_agenda),
    };
    if (editRecord) {
      await fetch('/api/one-on-ones', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: editRecord.id }) });
    } else {
      await fetch('/api/one-on-ones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setModalOpen(false);
    load();
  }

  async function deleteRecord(id: number) {
    await fetch('/api/one-on-ones', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">1:1 Notes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Prep, notes, and history by person</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Reports To */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ArrowUp size={14} className="text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Reports To</h2>
        </div>
        <PersonSection
          name="Dillon Rouse"
          records={reportsTo}
          onAdd={() => openAdd({ stakeholder_name: 'Dillon Rouse', relationship: 'reports_to' })}
          onEdit={openEdit}
          onDelete={deleteRecord}
        />
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800" />

      {/* Direct Reports */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ArrowDown size={14} className="text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Direct Reports</h2>
        </div>

        {directReportPeople.length === 0 ? (
          <EmptyState
            icon={ArrowDown}
            title="No direct report 1:1s yet"
            description="Log your first 1:1 with a direct report"
            action={<Button onClick={() => openAdd({ stakeholder_name: 'Kenney Dinh', relationship: 'direct_report' })}><Plus size={14} /> Add 1:1 with Kenney Dinh</Button>}
          />
        ) : (
          <div className="space-y-6">
            {directReportPeople.map(name => (
              <PersonSection
                key={name}
                name={name}
                records={directReports.filter(r => r.stakeholder_name === name)}
                onAdd={() => openAdd({ stakeholder_name: name, relationship: 'direct_report' })}
                onEdit={openEdit}
                onDelete={deleteRecord}
              />
            ))}
            <button
              onClick={() => openAdd({ relationship: 'direct_report' })}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              + Add 1:1 with another direct report
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800" />

      {/* Business Reviews */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Business Reviews</h2>
        </div>

        {teamReviewTeams.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No business reviews yet"
            description="Track notes from your monthly team reviews"
            action={<Button onClick={() => openAdd({ stakeholder_name: 'New Markets Team', relationship: 'team_review', date: '' })}><Plus size={14} /> Add first review</Button>}
          />
        ) : (
          <div className="space-y-6">
            {teamReviewTeams.map(name => (
              <PersonSection
                key={name}
                name={name}
                records={teamReviews.filter(r => r.stakeholder_name === name)}
                onAdd={() => openAdd({ stakeholder_name: name, relationship: 'team_review', date: '' })}
                onEdit={openEdit}
                onDelete={deleteRecord}
                buttonLabel="New Review"
                emptyLabel="Add first review"
              />
            ))}
            <button
              onClick={() => openAdd({ relationship: 'team_review', date: '' })}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              + Add review for another team
            </button>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editRecord ? 'Edit 1:1' : 'New 1:1 Notes'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Person *"
              placeholder="Name"
              value={form.stakeholder_name}
              onChange={e => setForm(f => ({ ...f, stakeholder_name: e.target.value }))}
            />
            <Select
              label="Relationship"
              value={form.relationship}
              onChange={e => setForm(f => ({ ...f, relationship: e.target.value as OneOnOne['relationship'] }))}
            >
              <option value="reports_to">Reports To (my manager)</option>
              <option value="direct_report">Direct Report</option>
              <option value="peer">Peer</option>
              <option value="team_review">Business Review</option>
            </Select>
          </div>
          <DatePicker label="Date *" value={form.date} onChange={val => setForm(f => ({ ...f, date: val }))} />
          <Textarea
            label="Agenda (one item per line)"
            placeholder="Budget review status&#10;Q2 headcount ask&#10;My promotion timeline"
            value={form.agenda}
            onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
            rows={3}
          />
          <Textarea
            label="Notes"
            placeholder="Key things discussed, decisions made, context to remember..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Textarea
              label="My commitments (one per line)"
              placeholder="Send updated model by Friday"
              value={form.my_commitments}
              onChange={e => setForm(f => ({ ...f, my_commitments: e.target.value }))}
              rows={3}
            />
            <Textarea
              label="Their commitments (one per line)"
              placeholder="Approve headcount request"
              value={form.their_commitments}
              onChange={e => setForm(f => ({ ...f, their_commitments: e.target.value }))}
              rows={3}
            />
          </div>
          <Input
            label="Themes / patterns observed"
            placeholder="e.g. Concerned about close timeline"
            value={form.themes}
            onChange={e => setForm(f => ({ ...f, themes: e.target.value }))}
          />
          <Textarea
            label="Next meeting agenda (one per line)"
            placeholder="Items to carry forward or prep for next week"
            value={form.next_agenda}
            onChange={e => setForm(f => ({ ...f, next_agenda: e.target.value }))}
            rows={2}
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={!form.stakeholder_name || !form.date} className="flex-1">
              {editRecord ? 'Save' : 'Save Notes'}
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function getNextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 1 ? 0 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
