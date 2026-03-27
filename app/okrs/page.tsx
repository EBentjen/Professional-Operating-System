'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { OKR, KeyResult, OKRStatus } from '@/lib/types';

const STATUS_CONFIG: Record<OKRStatus, { label: string; color: string; dot: string }> = {
  on_track: { label: 'On Track', color: 'text-emerald-600', dot: 'bg-emerald-500' },
  at_risk: { label: 'At Risk', color: 'text-amber-600', dot: 'bg-amber-500' },
  off_track: { label: 'Off Track', color: 'text-red-600', dot: 'bg-red-500' },
  complete: { label: 'Complete', color: 'text-blue-600', dot: 'bg-blue-500' },
};

const CURRENT_QUARTER = (() => {
  const d = new Date();
  return `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
})();

const EMPTY_OKR_FORM = { title: '', description: '', quarter: CURRENT_QUARTER, status: 'on_track' as OKRStatus };
const EMPTY_KR_FORM = { title: '', target: '', current_value: '', unit: '', progress: 0, status: 'on_track' as OKRStatus };

export default function OKRsPage() {
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [okrModal, setOkrModal] = useState(false);
  const [krModal, setKrModal] = useState<{ okrId: number; kr?: KeyResult } | null>(null);
  const [editOkr, setEditOkr] = useState<OKR | null>(null);
  const [okrForm, setOkrForm] = useState(EMPTY_OKR_FORM);
  const [krForm, setKrForm] = useState(EMPTY_KR_FORM);
  const [filterQuarter, setFilterQuarter] = useState(CURRENT_QUARTER);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/okrs');
    setOkrs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const quarters = [...new Set(okrs.map(o => o.quarter))].sort().reverse();
  const displayed = okrs.filter(o => !filterQuarter || o.quarter === filterQuarter);

  function openAddOkr() {
    setEditOkr(null);
    setOkrForm(EMPTY_OKR_FORM);
    setOkrModal(true);
  }

  function openEditOkr(o: OKR) {
    setEditOkr(o);
    setOkrForm({ title: o.title, description: o.description, quarter: o.quarter, status: o.status });
    setOkrModal(true);
  }

  async function saveOkr() {
    if (!okrForm.title) return;
    if (editOkr) {
      await fetch('/api/okrs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...okrForm, id: editOkr.id }) });
    } else {
      await fetch('/api/okrs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(okrForm) });
    }
    setOkrModal(false);
    load();
  }

  async function deleteOkr(id: number) {
    await fetch('/api/okrs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  function openAddKr(okrId: number) {
    setKrForm(EMPTY_KR_FORM);
    setKrModal({ okrId });
  }

  function openEditKr(okrId: number, kr: KeyResult) {
    setKrForm({ title: kr.title, target: kr.target, current_value: kr.current_value, unit: kr.unit, progress: kr.progress, status: kr.status });
    setKrModal({ okrId, kr });
  }

  async function saveKr() {
    if (!krForm.title || !krModal) return;
    if (krModal.kr) {
      await fetch('/api/okrs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...krForm, key_result_id: krModal.kr.id }) });
    } else {
      await fetch('/api/okrs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: krModal.okrId, add_key_result: krForm }) });
    }
    setKrModal(null);
    load();
  }

  async function deleteKr(krId: number) {
    await fetch('/api/okrs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key_result_id: krId }) });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">OKRs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Objectives & Key Results — your quarterly north star</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button onClick={openAddOkr}><Plus size={14} /> Add Objective</Button>
        </div>
      </div>

      {/* Quarter filter */}
      <div className="flex gap-2 flex-wrap">
        {[CURRENT_QUARTER, ...quarters.filter(q => q !== CURRENT_QUARTER)].slice(0, 6).map(q => (
          <button
            key={q}
            onClick={() => setFilterQuarter(q === filterQuarter ? '' : q)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterQuarter === q ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}
          >
            {q}
          </button>
        ))}
        {filterQuarter && <button onClick={() => setFilterQuarter('')} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-700">Show all</button>}
      </div>

      {displayed.length === 0 && !loading ? (
        <EmptyState icon={Target} title="No OKRs yet" description="Set your quarterly objectives to keep weekly priorities aligned." action={<Button onClick={openAddOkr}><Plus size={14} /> Add first objective</Button>} />
      ) : (
        <div className="space-y-4">
          {displayed.map(okr => {
            const krs = okr.key_results || [];
            const avgProgress = krs.length ? Math.round(krs.reduce((s, k) => s + k.progress, 0) / krs.length) : 0;
            const st = STATUS_CONFIG[okr.status];
            return (
              <Card key={okr.id}>
                <CardHeader className="cursor-pointer" onClick={() => setExpanded(expanded === okr.id ? null : okr.id)}>
                  <div className="flex items-start justify-between w-full gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{okr.quarter}</span>
                        <span className={cn('flex items-center gap-1 text-xs font-medium', st.color)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                          {st.label}
                        </span>
                      </div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{okr.title}</p>
                      {okr.description && <p className="text-sm text-zinc-500 mt-0.5">{okr.description}</p>}
                      {krs.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all" style={{ width: `${avgProgress}%` }} />
                          </div>
                          <span className="text-xs text-zinc-400 w-8 text-right">{avgProgress}%</span>
                        </div>
                      )}
                    </div>
                    {expanded === okr.id ? <ChevronUp size={16} className="text-zinc-400 shrink-0 mt-1" /> : <ChevronDown size={16} className="text-zinc-400 shrink-0 mt-1" />}
                  </div>
                </CardHeader>

                {expanded === okr.id && (
                  <CardBody className="border-t border-zinc-100 dark:border-zinc-800">
                    <div className="space-y-3">
                      {krs.map(kr => {
                        const krSt = STATUS_CONFIG[kr.status];
                        return (
                          <div key={kr.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', krSt.dot)} />
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{kr.title}</p>
                              </div>
                              {(kr.current_value || kr.target) && (
                                <p className="text-xs text-zinc-500 ml-3.5">
                                  {kr.current_value || '—'} / {kr.target || '—'} {kr.unit}
                                </p>
                              )}
                              <div className="mt-2 ml-3.5 flex items-center gap-2">
                                <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                  <div className={cn('h-full rounded-full', kr.progress >= 100 ? 'bg-emerald-500' : kr.progress >= 60 ? 'bg-amber-500' : 'bg-zinc-900 dark:bg-zinc-100')} style={{ width: `${kr.progress}%` }} />
                                </div>
                                <span className="text-xs text-zinc-400 w-8 text-right">{kr.progress}%</span>
                              </div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => openEditKr(okr.id, kr)}>Edit</Button>
                            <Button variant="danger" size="sm" onClick={() => deleteKr(kr.id)}><Trash2 size={13} /></Button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => openAddKr(okr.id)}
                        className="w-full text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 py-2 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors"
                      >
                        + Add Key Result
                      </button>
                      <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <Button variant="secondary" size="sm" onClick={() => openEditOkr(okr)}>Edit Objective</Button>
                        <Button variant="danger" size="sm" onClick={() => deleteOkr(okr.id)}><Trash2 size={13} /> Delete</Button>
                      </div>
                    </div>
                  </CardBody>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* OKR Modal */}
      <Modal open={okrModal} onClose={() => setOkrModal(false)} title={editOkr ? 'Edit Objective' : 'Add Objective'}>
        <div className="space-y-4">
          <Input label="Objective *" placeholder="e.g. Achieve financial close excellence" value={okrForm.title} onChange={e => setOkrForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" placeholder="Why does this matter this quarter?" value={okrForm.description} onChange={e => setOkrForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Quarter" placeholder="Q1 2026" value={okrForm.quarter} onChange={e => setOkrForm(f => ({ ...f, quarter: e.target.value }))} />
            <Select label="Status" value={okrForm.status} onChange={e => setOkrForm(f => ({ ...f, status: e.target.value as OKRStatus }))}>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="off_track">Off Track</option>
              <option value="complete">Complete</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={saveOkr} disabled={!okrForm.title} className="flex-1">{editOkr ? 'Save' : 'Add Objective'}</Button>
            <Button variant="secondary" onClick={() => setOkrModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Key Result Modal */}
      <Modal open={!!krModal} onClose={() => setKrModal(null)} title={krModal?.kr ? 'Edit Key Result' : 'Add Key Result'}>
        <div className="space-y-4">
          <Input label="Key Result *" placeholder="e.g. Reduce close cycle from 8 to 5 days" value={krForm.title} onChange={e => setKrForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Current" placeholder="8" value={krForm.current_value} onChange={e => setKrForm(f => ({ ...f, current_value: e.target.value }))} />
            <Input label="Target" placeholder="5" value={krForm.target} onChange={e => setKrForm(f => ({ ...f, target: e.target.value }))} />
            <Input label="Unit" placeholder="days" value={krForm.unit} onChange={e => setKrForm(f => ({ ...f, unit: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Progress ({krForm.progress}%)</label>
            <input type="range" min={0} max={100} value={krForm.progress} onChange={e => setKrForm(f => ({ ...f, progress: Number(e.target.value) }))} className="w-full accent-zinc-900 dark:accent-zinc-100" />
          </div>
          <Select label="Status" value={krForm.status} onChange={e => setKrForm(f => ({ ...f, status: e.target.value as OKRStatus }))}>
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="off_track">Off Track</option>
            <option value="complete">Complete</option>
          </Select>
          <div className="flex gap-3 pt-2">
            <Button onClick={saveKr} disabled={!krForm.title} className="flex-1">{krModal?.kr ? 'Save' : 'Add Key Result'}</Button>
            <Button variant="secondary" onClick={() => setKrModal(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
