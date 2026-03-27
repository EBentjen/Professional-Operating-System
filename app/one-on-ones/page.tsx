'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, Users2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { DatePicker } from '@/components/ui/DatePicker';
import { formatDate } from '@/lib/utils';
import type { OneOnOne } from '@/lib/types';

const EMPTY_FORM = {
  stakeholder_name: '',
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

export default function OneOnOnesPage() {
  const [records, setRecords] = useState<OneOnOne[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<OneOnOne | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedPerson, setSelectedPerson] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/one-on-ones');
    setRecords(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const people = [...new Set(records.map(r => r.stakeholder_name))].sort();

  function openAdd(name = '') {
    setEditRecord(null);
    const monday = getNextMonday();
    setForm({ ...EMPTY_FORM, stakeholder_name: name, date: monday });
    setModalOpen(true);
  }

  function openEdit(r: OneOnOne) {
    setEditRecord(r);
    setForm({
      stakeholder_name: r.stakeholder_name,
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

  const displayed = selectedPerson ? records.filter(r => r.stakeholder_name === selectedPerson) : records;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">1:1 Notes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Meeting prep, notes, and commitments per person</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button onClick={() => openAdd()}><Plus size={14} /> New 1:1</Button>
        </div>
      </div>

      {/* Quick start for Dillon */}
      {records.filter(r => r.stakeholder_name === 'Dillon Rouse').length === 0 && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Prep for Monday with Dillon Rouse</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">You meet every Monday — start logging notes here</p>
          </div>
          <Button size="sm" onClick={() => openAdd('Dillon Rouse')}>Prep Now</Button>
        </div>
      )}

      {/* Filter by person */}
      {people.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedPerson('')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!selectedPerson ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}
          >
            All
          </button>
          {people.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPerson(p === selectedPerson ? '' : p)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedPerson === p ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}
            >
              {p} ({records.filter(r => r.stakeholder_name === p).length})
            </button>
          ))}
        </div>
      )}

      {displayed.length === 0 && !loading ? (
        <EmptyState icon={Users2} title="No 1:1 notes yet" description="Track agenda, notes, and commitments for each meeting." action={<Button onClick={() => openAdd()}><Plus size={14} /> Add first 1:1</Button>} />
      ) : (
        <div className="space-y-3">
          {displayed.map(r => (
            <Card key={r.id}>
              <CardHeader className="cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">1:1 with {r.stakeholder_name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{formatDate(r.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {parseList(r.next_agenda).length > 0 && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {parseList(r.next_agenda).length} next items
                      </span>
                    )}
                    {expanded === r.id ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                  </div>
                </div>
              </CardHeader>

              {expanded === r.id && (
                <CardBody className="border-t border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-4 text-sm">
                    {parseList(r.agenda).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Agenda</p>
                        <ul className="space-y-1">
                          {parseList(r.agenda).map((item, i) => <li key={i} className="flex gap-2 text-zinc-700 dark:text-zinc-300"><span className="text-zinc-300 dark:text-zinc-600">–</span>{item}</li>)}
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
                          {parseList(r.my_commitments).map((item, i) => <li key={i} className="flex gap-2 text-zinc-700 dark:text-zinc-300"><span className="text-amber-500">→</span>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {parseList(r.their_commitments).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">Their Commitments</p>
                        <ul className="space-y-1">
                          {parseList(r.their_commitments).map((item, i) => <li key={i} className="flex gap-2 text-zinc-700 dark:text-zinc-300"><span className="text-blue-500">←</span>{item}</li>)}
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">Next Meeting Agenda</p>
                        <ul className="space-y-1">
                          {parseList(r.next_agenda).map((item, i) => <li key={i} className="flex gap-2 text-blue-700 dark:text-blue-300"><span>·</span>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => deleteRecord(r.id)}><Trash2 size={13} /> Delete</Button>
                    </div>
                  </div>
                </CardBody>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editRecord ? 'Edit 1:1' : 'New 1:1 Notes'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Person *" placeholder="Dillon Rouse" value={form.stakeholder_name} onChange={e => setForm(f => ({ ...f, stakeholder_name: e.target.value }))} />
            <DatePicker label="Date *" value={form.date} onChange={val => setForm(f => ({ ...f, date: val }))} />
          </div>
          <Textarea label="Agenda (one item per line)" placeholder="Budget review status&#10;Q2 headcount ask&#10;My promotion timeline" value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} rows={3} />
          <Textarea label="Notes" placeholder="Key things discussed, decisions made, context to remember..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Textarea label="My commitments (one per line)" placeholder="Send updated model by Friday&#10;Schedule board prep session" value={form.my_commitments} onChange={e => setForm(f => ({ ...f, my_commitments: e.target.value }))} rows={3} />
            <Textarea label="Their commitments (one per line)" placeholder="Approve headcount request&#10;Intro to VP Sales" value={form.their_commitments} onChange={e => setForm(f => ({ ...f, their_commitments: e.target.value }))} rows={3} />
          </div>
          <Input label="Themes / patterns observed" placeholder="e.g. Concerned about close timeline, excited about new system" value={form.themes} onChange={e => setForm(f => ({ ...f, themes: e.target.value }))} />
          <Textarea label="Next meeting agenda (one per line)" placeholder="Items to carry forward or prep for next week" value={form.next_agenda} onChange={e => setForm(f => ({ ...f, next_agenda: e.target.value }))} rows={2} />
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={!form.stakeholder_name || !form.date} className="flex-1">{editRecord ? 'Save' : 'Save Notes'}</Button>
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
