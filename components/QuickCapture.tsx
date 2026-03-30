'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X, Send, Paperclip, FileSpreadsheet, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  name: string;
  ok: boolean;
  error?: string;
}

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File drop state
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open]);

  // Reset uploads when panel closes
  useEffect(() => {
    if (!open) setUploads([]);
  }, [open]);

  // Keyboard shortcut: Ctrl/Cmd+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function capture() {
    if (!text.trim() || saving) return;
    setSaving(true);
    await fetch('/api/captures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim() }),
    });
    setSaving(false);
    setSaved(true);
    setText('');
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 800);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      capture();
    }
  }

  async function uploadFiles(fileList: FileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploading(true);

    for (const file of files) {
      const title = file.name.replace(/\.[^/.]+$/, '');
      const body = new FormData();
      body.append('file', file);
      body.append('title', title);
      body.append('category', 'general');

      try {
        const res = await fetch('/api/template-files', { method: 'POST', body });
        if (res.ok) {
          setUploads(prev => [...prev, { name: file.name, ok: true }]);
        } else {
          const err = await res.json();
          setUploads(prev => [...prev, { name: file.name, ok: false, error: err.error || 'Failed' }]);
        }
      } catch {
        setUploads(prev => [...prev, { name: file.name, ok: false, error: 'Network error' }]);
      }
    }
    setUploading(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-sm font-medium transition-all',
          open
            ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
            : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-105'
        )}
        title="Quick Capture (⌘K)"
      >
        {open ? <X size={16} /> : <Plus size={16} />}
        <span className="hidden sm:inline">{open ? 'Close' : 'Capture'}</span>
      </button>

      {/* Capture panel */}
      {open && (
        <div className="fixed bottom-40 right-4 md:bottom-20 md:right-6 z-40 w-80 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick Capture</p>
              <span className="text-xs text-zinc-400 hidden sm:block">⌘↵ to save</span>
            </div>

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Dump anything here — idea, task, thought, question..."
              rows={4}
              className="w-full resize-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 bg-transparent focus:outline-none"
            />

            {/* File drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 cursor-pointer transition-colors text-xs',
                dragOver
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 text-blue-500'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-500'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".xlsx,.xls,.csv,.pdf,.pptx,.ppt,.doc,.docx,.png,.jpg,.jpeg"
                onChange={onFileInputChange}
              />
              {uploading ? (
                <><Loader2 size={12} className="animate-spin shrink-0" /><span>Uploading…</span></>
              ) : (
                <><Paperclip size={12} className="shrink-0" /><span>Drop files or click to attach</span></>
              )}
            </div>

            {/* Upload results */}
            {uploads.length > 0 && (
              <div className="space-y-1">
                {uploads.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {u.ok
                      ? <Check size={11} className="text-emerald-500 shrink-0" />
                      : <X size={11} className="text-red-400 shrink-0" />}
                    <span className={cn('truncate', u.ok ? 'text-zinc-500' : 'text-red-400')}>
                      {u.name}{!u.ok && u.error ? ` — ${u.error}` : u.ok ? ' → Templates' : ''}
                    </span>
                    <FileSpreadsheet size={10} className={cn('shrink-0', u.ok ? 'text-zinc-300' : 'text-zinc-200')} />
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-400">Saved to Capture Inbox</p>
              <button
                onClick={capture}
                disabled={!text.trim() || saving}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  saved
                    ? 'bg-emerald-500 text-white'
                    : text.trim()
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                )}
              >
                {saved ? '✓ Saved' : <><Send size={11} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
