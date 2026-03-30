'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Trash2, RefreshCw, FileText, Copy, Check, Pencil, Upload, Download, FileSpreadsheet, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { Template, TemplateCategory, TemplateFile } from '@/lib/types';

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'strategy', label: 'Strategy' },
  { value: 'prompts', label: 'Prompts' },
  { value: 'modeling', label: 'Modeling' },
];

const EMPTY_FORM = { title: '', category: 'strategy' as TemplateCategory, description: '', content: '', tags: '' };
const EMPTY_FILE_FORM = { title: '', category: 'strategy' as TemplateCategory, description: '' };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [files, setFiles] = useState<TemplateFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<Template | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [copied, setCopied] = useState(false);
  const [filterCat, setFilterCat] = useState<TemplateCategory | 'all'>('all');

  // File upload state
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [fileForm, setFileForm] = useState(EMPTY_FILE_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [tmplRes, filesRes] = await Promise.all([
      fetch('/api/templates'),
      fetch('/api/template-files'),
    ]);
    setTemplates(await tmplRes.json());
    setFiles(await filesRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditTemplate(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(t: Template) {
    setEditTemplate(t);
    setForm({ title: t.title, category: t.category, description: t.description, content: t.content, tags: t.tags });
    setModalOpen(true);
    setView(null);
  }

  async function save() {
    if (!form.title || !form.content) return;
    if (editTemplate) {
      await fetch('/api/templates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editTemplate.id }) });
    } else {
      await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setModalOpen(false);
    load();
  }

  async function deleteTemplate(id: number) {
    await fetch('/api/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setView(null);
    load();
  }

  async function copyContent(content: string) {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ─── File upload handlers ────────────────────────────────────────────────────

  function openFileModal() {
    setFileForm(EMPTY_FILE_FORM);
    setSelectedFile(null);
    setUploadError('');
    setFileModalOpen(true);
  }

  function handleFileSelect(f: File) {
    setSelectedFile(f);
    if (!fileForm.title) {
      // Auto-fill title from filename (strip extension)
      setFileForm(prev => ({ ...prev, title: f.name.replace(/\.[^/.]+$/, '') }));
    }
    setUploadError('');
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }

  async function uploadFile() {
    if (!selectedFile || !fileForm.title.trim()) return;
    setUploading(true);
    setUploadError('');

    const body = new FormData();
    body.append('file', selectedFile);
    body.append('title', fileForm.title.trim());
    body.append('category', fileForm.category);
    body.append('description', fileForm.description);

    const res = await fetch('/api/template-files', { method: 'POST', body });
    if (res.ok) {
      setFileModalOpen(false);
      load();
    } else {
      const err = await res.json();
      setUploadError(err.error || 'Upload failed');
    }
    setUploading(false);
  }

  async function deleteFile(id: number) {
    await fetch('/api/template-files', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  function downloadFile(id: number) {
    window.location.href = `/api/template-files/${id}/download`;
  }

  // ─── Display logic ───────────────────────────────────────────────────────────

  const displayed = filterCat === 'all' ? templates : templates.filter(t => t.category === filterCat);
  const displayedFiles = filterCat === 'all' ? files : files.filter(f => f.category === filterCat);

  const grouped = CATEGORIES.reduce((acc, c) => {
    const items = displayed.filter(t => t.category === c.value);
    if (items.length > 0) acc[c.value] = items;
    return acc;
  }, {} as Record<string, Template[]>);

  const groupedFiles = CATEGORIES.reduce((acc, c) => {
    const items = displayedFiles.filter(f => f.category === c.value);
    if (items.length > 0) acc[c.value] = items;
    return acc;
  }, {} as Record<string, TemplateFile[]>);

  const hasFiles = displayedFiles.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Templates & Playbooks</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Saved frameworks and Excel files for recurring situations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></Button>
          <Button variant="secondary" onClick={openFileModal}><Upload size={14} /> Upload File</Button>
          <Button onClick={openAdd}><Plus size={14} /> New Template</Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('all')} className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors', filterCat === 'all' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500')}>All</button>
        {CATEGORIES.map(c => {
          const count = templates.filter(t => t.category === c.value).length + files.filter(f => f.category === c.value).length;
          if (count === 0) return null;
          return (
            <button key={c.value} onClick={() => setFilterCat(c.value === filterCat ? 'all' : c.value)} className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors', filterCat === c.value ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500')}>
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Excel / File Templates ─────────────────────────────────────────────── */}
      {hasFiles && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">File Templates</p>
          {filterCat === 'all' ? (
            <div className="space-y-4">
              {Object.entries(groupedFiles).map(([cat, items]) => {
                const catLabel = CATEGORIES.find(c => c.value === cat)?.label || cat;
                return (
                  <div key={cat}>
                    <p className="text-xs font-medium text-zinc-400 mb-2">{catLabel}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map(f => <FileCard key={f.id} file={f} onDownload={downloadFile} onDelete={deleteFile} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {displayedFiles.map(f => <FileCard key={f.id} file={f} onDownload={downloadFile} onDelete={deleteFile} />)}
            </div>
          )}
          <hr className="border-zinc-200 dark:border-zinc-800" />
        </div>
      )}

      {/* ── Text Templates ─────────────────────────────────────────────────────── */}
      {displayed.length === 0 && !loading && !hasFiles ? (
        <EmptyState icon={FileText} title="No templates yet" description="Build your library of reusable frameworks." action={<Button onClick={openAdd}><Plus size={14} /> Create first template</Button>} />
      ) : displayed.length > 0 ? (
        <>
          {hasFiles && <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Text Templates</p>}
          {filterCat === 'all' ? (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, items]) => {
                const catLabel = CATEGORIES.find(c => c.value === cat)?.label || cat;
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">{catLabel}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map(t => (
                        <Card key={t.id} hoverable onClick={() => setView(t)}>
                          <CardBody className="py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.title}</p>
                                {t.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{t.description}</p>}
                              </div>
                              <FileText size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0 mt-0.5" />
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {displayed.map(t => (
                <Card key={t.id} hoverable onClick={() => setView(t)}>
                  <CardBody className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.title}</p>
                        {t.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{t.description}</p>}
                      </div>
                      <FileText size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0 mt-0.5" />
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* Template viewer */}
      <Modal open={!!view} onClose={() => setView(null)} title={view?.title || ''} size="lg">
        {view && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => copyContent(view.content)}>
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openEdit(view)}>
                <Pencil size={13} /> Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => deleteTemplate(view.id)}>
                <Trash2 size={13} />
              </Button>
            </div>
            {view.description && <p className="text-sm text-zinc-500">{view.description}</p>}
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-4 font-mono text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 max-h-[60vh] overflow-y-auto">
              {view.content}
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit text template modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTemplate ? 'Edit Template' : 'New Template'} size="lg">
        <div className="space-y-4">
          <Input label="Title *" placeholder="e.g. Board Meeting Prep" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TemplateCategory }))}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Input label="Tags" placeholder="comma-separated" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <Input label="Description" placeholder="One line about what this template is for" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Textarea label="Content *" placeholder="Template text, markdown, checklist..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={10} className="font-mono text-sm" />
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={!form.title || !form.content} className="flex-1">{editTemplate ? 'Save' : 'Create Template'}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Upload file modal */}
      <Modal open={fileModalOpen} onClose={() => setFileModalOpen(false)} title="Upload File Template" size="md">
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                : selectedFile
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
            )}
          >
            <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv,.pdf,.pptx,.ppt,.doc,.docx" onChange={onFileInputChange} />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet size={20} className="text-emerald-500 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{selectedFile.name}</p>
                  <p className="text-xs text-zinc-500">{formatBytes(selectedFile.size)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                  className="ml-2 text-zinc-400 hover:text-zinc-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload size={20} className="mx-auto text-zinc-400" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Drag & drop or click to browse</p>
                <p className="text-xs text-zinc-400">.xlsx, .xls, .csv, .pdf, .pptx, .docx — max 10 MB</p>
              </div>
            )}
          </div>

          <Input
            label="Title *"
            placeholder="e.g. Monthly Close Tracker"
            value={fileForm.title}
            onChange={e => setFileForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={fileForm.category}
              onChange={e => setFileForm(f => ({ ...f, category: e.target.value as TemplateCategory }))}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
          <Input
            label="Description"
            placeholder="What is this file for?"
            value={fileForm.description}
            onChange={e => setFileForm(f => ({ ...f, description: e.target.value }))}
          />

          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={uploadFile}
              disabled={!selectedFile || !fileForm.title.trim() || uploading}
              className="flex-1"
            >
              {uploading ? 'Uploading…' : <><Upload size={13} /> Upload</>}
            </Button>
            <Button variant="secondary" onClick={() => setFileModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── File Card ────────────────────────────────────────────────────────────────

function FileCard({ file, onDownload, onDelete }: {
  file: TemplateFile;
  onDownload: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const ext = file.filename.split('.').pop()?.toLowerCase() || '';
  const extColors: Record<string, string> = {
    xlsx: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    xls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    csv: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30',
    pdf: 'text-red-600 bg-red-50 dark:bg-red-900/30',
    pptx: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
    ppt: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
    docx: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
    doc: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  };

  return (
    <Card>
      <CardBody className="py-3">
        <div className="flex items-start gap-3">
          <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 mt-0.5', extColors[ext] || 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800')}>
            {ext || 'file'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">{file.title}</p>
            <p className="text-xs text-zinc-400 truncate">{file.filename} · {formatBytes(file.file_size)}</p>
            {file.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{file.description}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onDownload(file.id)}
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              title="Download"
            >
              <Download size={13} />
            </button>
            {confirmDelete ? (
              <div className="flex gap-1 items-center">
                <button onClick={() => onDelete(file.id)} className="text-xs text-red-500 hover:text-red-700 font-medium px-1">Delete?</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-zinc-400 hover:text-zinc-600 px-1">No</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
