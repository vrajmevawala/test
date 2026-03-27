'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { ScoreRing } from '@/components/ui/score-ring';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, MoreHorizontal, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type AnalysisListItem = {
  id: string;
  filename: string;
  language: string;
  score: number | null;
  issueCount: number;
  fixedCount: number;
  status: string;
  createdAt: string;
};

type AnalysisListResponse = {
  items: AnalysisListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const LANG_ABBR: Record<string, string> = {
  typescript: 'TS',
  javascript: 'JS',
  python: 'PY',
  go: 'GO',
  rust: 'RS',
  java: 'JV',
  cpp: 'C++',
  csharp: 'CS',
};

const LANG_COLOR: Record<string, string> = {
  typescript: 'var(--info)',
  javascript: 'var(--yellow)',
  python: 'var(--green)',
  go: 'var(--info)',
  rust: 'var(--accent)',
  java: 'var(--red)',
  cpp: 'var(--text-mid)',
  csharp: 'var(--green)',
};

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AnalysisListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        await api.ensureWorkspace();

        const data = await api.trpcQuery<AnalysisListResponse>('analysis.list', {
          page,
          pageSize: 20,
          search: search.trim() || undefined,
        });

        if (!mounted) return;
        setRows(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load analysis history');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [page, search]);

  const visibleRows = useMemo(() => rows, [rows]);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search files..." icon={<Search size={13} />} containerStyle={{ flex: 1, maxWidth: 340 }} />
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" icon={<Download size={13} />}>Export</Button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px 80px 70px 120px 90px 80px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          {['', 'File', 'Score', 'Issues', 'Fixed', 'Date', 'Status', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        <div style={{ overflowY: 'auto' }}>
          {loading && <div style={{ padding: 16, color: 'var(--text-dim)' }}>Loading analysis history...</div>}
          {error && <div style={{ padding: 16, color: 'var(--red)' }}>Failed to load history: {error}</div>}
          {!loading && !error && visibleRows.length === 0 && <div style={{ padding: 16, color: 'var(--text-dim)' }}>No analyses found.</div>}

          {!loading && !error && visibleRows.map((f, i) => (
            <div 
              key={f.id} 
              onClick={() => router.push(`/analyze?id=${f.id}&chat=true`)}
              style={{ 
                display: 'grid', 
                gridTemplateColumns: '36px 1fr 60px 80px 70px 120px 90px 80px', 
                padding: '10px 16px', 
                alignItems: 'center', 
                borderBottom: i < visibleRows.length - 1 ? '1px solid var(--border)' : 'none', 
                transition: 'background 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 26, height: 26, borderRadius: 4, background: `${LANG_COLOR[f.language] ?? 'var(--text-mid)'}18`, border: `1px solid ${(LANG_COLOR[f.language] ?? 'var(--text-mid)')}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: LANG_COLOR[f.language] ?? 'var(--text-mid)' }}>
                {LANG_ABBR[f.language] || f.language.slice(0, 2).toUpperCase()}
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
              <div><ScoreRing score={Math.round(Number(f.score ?? 0))} size={32} strokeWidth={3} /></div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: Number(f.issueCount) > 5 ? 'var(--red)' : Number(f.issueCount) > 2 ? 'var(--yellow)' : 'var(--text-mid)' }}>{Number(f.issueCount)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)' }}>+{Number(f.fixedCount)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{new Date(f.createdAt).toLocaleString()}</div>

              <div>
                <Badge variant={f.status === 'complete' ? 'green' : f.status === 'processing' ? 'yellow' : 'red'}>{f.status}</Badge>
              </div>

              <div>
                <Button variant="ghost" size="sm" icon={<MoreHorizontal size={14} />} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Showing {visibleRows.length} of {total} analyses</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '0 8px', display: 'inline-flex', alignItems: 'center' }}>Page {page} / {totalPages}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>
    </div>
  );
}
