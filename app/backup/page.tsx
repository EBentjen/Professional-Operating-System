'use client';

import { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function BackupPage() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    window.location.href = '/api/export';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setConfirmOpen(true);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  async function confirmImport() {
    if (!pendingFile) return;
    setConfirmOpen(false);
    setImporting(true);
    setResult(null);

    try {
      const text = await pendingFile.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: 'Data restored successfully. Refresh the page to see your data.' });
      } else {
        setResult({ ok: false, message: data.error || 'Import failed.' });
      }
    } catch {
      setResult({ ok: false, message: 'Could not read file. Make sure it\'s a valid backup JSON.' });
    } finally {
      setImporting(false);
      setPendingFile(null);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Backup & Restore</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Export your data before deploys, restore after</p>
      </div>

      {/* Deploy workflow reminder */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
        <div className="flex gap-3">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold">Before every Railway deploy:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-amber-700 dark:text-amber-400">
              <li>Click <strong>Export</strong> below — save the file somewhere safe</li>
              <li>Push your code and deploy</li>
              <li>Come back here and click <strong>Import</strong> to restore</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Export */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Export Data</p>
              <p className="text-sm text-zinc-500 mt-1">
                Downloads all your data — priorities, decisions, wins, 1:1 notes, learnings, and everything else — as a single JSON file.
              </p>
            </div>
            <Button onClick={handleExport} className="shrink-0">
              <Download size={14} /> Export
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Import */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Import Data</p>
              <p className="text-sm text-zinc-500 mt-1">
                Restores from a backup file. <strong className="text-zinc-700 dark:text-zinc-300">This replaces all current data</strong> — only use after a fresh deploy wipe.
              </p>
            </div>
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              <Upload size={14} /> {importing ? 'Restoring...' : 'Import'}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardBody>
      </Card>

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Replace all data?</p>
                <p className="text-sm text-zinc-500 mt-1">
                  This will wipe everything currently in the app and restore from <strong>{pendingFile?.name}</strong>. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={confirmImport} variant="danger" className="flex-1">Yes, restore</Button>
              <Button variant="secondary" onClick={() => { setConfirmOpen(false); setPendingFile(null); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-4 flex gap-3 ${result.ok ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
          {result.ok
            ? <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            : <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          }
          <p className={`text-sm ${result.ok ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
            {result.message}
          </p>
        </div>
      )}

      {/* Security note */}
      <div className="flex gap-2 text-xs text-zinc-400">
        <Shield size={12} className="shrink-0 mt-0.5" />
        <p>Backup files contain all your private data. Store them securely and do not share them.</p>
      </div>
    </div>
  );
}
