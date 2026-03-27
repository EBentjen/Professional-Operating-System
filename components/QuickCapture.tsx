'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
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
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick Capture</p>
              <span className="text-xs text-zinc-400 hidden sm:block">⌘↵ to save</span>
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Dump anything here — idea, task, thought, question..."
              rows={4}
              className="w-full resize-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 bg-transparent focus:outline-none"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
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
