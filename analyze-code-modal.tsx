'use client';
import React, { useState } from 'react';
import { Button, Input, Select, Textarea, Spinner } from '@/components/ui';
import { X, Send } from 'lucide-react';
import { api } from '@/lib/api';

interface AnalyzeCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (analysisId: string) => void;
}

const LANGUAGES = [
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python',     value: 'python' },
  { label: 'Go',         value: 'go' },
  { label: 'Rust',       value: 'rust' },
  { label: 'Java',       value: 'java' },
  { label: 'C++',        value: 'cpp' },
  { label: 'C#',         value: 'csharp' },
];

export function AnalyzeCodeModal({ isOpen, onClose, onSuccess }: AnalyzeCodeModalProps) {
  const [filename, setFilename] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename || !code) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Create analysis record
      const { analysisId, uploadUrl } = await api.trpcMutation<{ analysisId: string; uploadUrl: string }>('analysis.create', {
        filename,
        language,
        contentSize: code.length,
      });

      // 2. Upload code to R2/S3
      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        body: code,
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      if (!uploadResp.ok) {
        throw new Error('Failed to upload code for analysis.');
      }

      // 3. Start analysis
      await api.trpcMutation('analysis.start', { analysisId });

      onSuccess(analysisId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 700,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        animation: 'modal-in 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>New Code Analysis</h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Paste your code below to start a deep AI review.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-mid)', marginLeft: 4 }}>File Name</label>
              <Input
                placeholder="e.g. auth-utils.ts"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-mid)', marginLeft: 4 }}>Language</label>
              <Select
                options={LANGUAGES}
                value={language}
                onChange={setLanguage}
              />
            </div>
          </div>

          <Textarea
            label="Source Code"
            placeholder="Paste your code here..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            style={{ minHeight: '300px', fontSize: '13px' }}
          />

          {error && (
            <div style={{ padding: '10px 12px', background: 'var(--red-dim)', border: '1px solid rgba(255,123,114,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--red)', fontSize: '12px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" type="submit" loading={loading} icon={<Send size={14} />}>
              Start Analysis
            </Button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
