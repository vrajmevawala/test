'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { BarChart } from '@/components/dashboard/bar-chart';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { ScoreRing } from '@/components/ui/score-ring';
import { api } from '@/lib/api';
import { StatusBar } from '@/components/layout/status-bar';

type DashboardStats = {
  totalAnalyses: number;
  totalIssues: number;
  totalFixed: number;
  avgScore: number;
};

type BreakdownItem = {
  category: string;
  count: number;
  pct: number;
};

type WeeklyPoint = {
  date: string;
  count: number;
};

type ActivityRow = {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
  actorName: string | null;
  filename?: string | null;
};

type QualityScore = {
  overall: number;
  categories: Array<{ category: string; score: number }>;
};

type AnalysisList = {
  items: Array<{
    id: string;
    filename: string;
    score: number | null;
    status: string;
    issueCount: number;
  }>;
};

function toRelativeTime(isoDate: string) {
  const ms = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.max(1, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day ago`;
}

function titleCase(input: string) {
  return input
    .split(/[_\-.]/g)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ totalAnalyses: 0, totalIssues: 0, totalFixed: 0, avgScore: 0 });
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [quality, setQuality] = useState<QualityScore>({ overall: 0, categories: [] });
  const [recent, setRecent] = useState<AnalysisList['items']>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        await api.ensureWorkspace();

        const [statsData, weeklyData, breakdownData, activityData, qualityData, listData] = await Promise.all([
          api.trpcQuery<DashboardStats>('dashboard.stats', {}),
          api.trpcQuery<WeeklyPoint[]>('dashboard.weeklyChart', {}),
          api.trpcQuery<BreakdownItem[]>('dashboard.issueBreakdown', {}),
          api.trpcQuery<ActivityRow[]>('dashboard.recentActivity', { limit: 20 }),
          api.trpcQuery<QualityScore>('dashboard.qualityScore', {}),
          api.trpcQuery<AnalysisList>('analysis.list', { page: 1, pageSize: 5 }),
        ]);

        if (!mounted) return;
        setStats(statsData);
        setWeekly(weeklyData);
        setBreakdown(breakdownData);
        setActivity(activityData);
        setQuality(qualityData);
        setRecent(listData.items ?? []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const chartData = useMemo(
    () =>
      weekly.map((item) => ({
        day: new Date(item.date).toLocaleDateString(undefined, { weekday: 'short' }),
        files: Number(item.count),
      })),
    [weekly],
  );

  const activityItems = useMemo(
    () =>
      activity.map((row) => ({
        id: row.id,
        user: row.actorName ?? 'Unknown User',
        action: row.action.replace('analysis.', '').replace('team.', '').replace('_', ' '),
        target: row.filename || row.resourceType || 'resource',
        time: toRelativeTime(row.createdAt),
        color: 'var(--accent)',
      })),
    [activity],
  );

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--text-dim)' }}>Loading dashboard...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: 'var(--red)' }}>Failed to load dashboard: {error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <StatCard label="Files Analyzed" value={String(stats.totalAnalyses)} trend="up" accentColor="var(--accent)" />
          <StatCard label="Issues Found" value={String(stats.totalIssues)} trend="down" accentColor="var(--red)" />
          <StatCard label="Issues Fixed" value={String(stats.totalFixed)} trend="up" accentColor="var(--green)" />
          <StatCard label="Avg Score" value={String(stats.avgScore)} trend="up" accentColor="var(--info)" />
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 2 }}>
            <BarChart data={chartData} />
          </div>

          <div style={{ flex: 1.5, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Issues by Category</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {breakdown.map((item) => (
                <div key={item.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>{titleCase(item.category)}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{item.count}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${item.pct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Quality Score</div>
            <ScoreRing score={quality.overall} size={100} strokeWidth={8} />
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>Workspace rolling quality</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <ActivityFeed items={activityItems} />
          </div>

          <div style={{ flex: 1.5, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Recent Files</div>
            <div style={{ overflowY: 'auto' }}>
              {recent.map((f, i) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <ScoreRing score={Math.round(Number(f.score ?? 0))} size={32} strokeWidth={3} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{Number(f.issueCount)} issues</div>
                  </div>
                  <div style={{ fontSize: 10, color: f.status === 'complete' ? 'var(--green)' : 'var(--yellow)', fontFamily: 'var(--font-mono)' }}>{f.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <StatusBar 
        file="Dashboard" 
        language="System" 
        issueCount={stats.totalIssues}
      />
    </div>
  );
}
