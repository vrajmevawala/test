'use client';
import React from 'react';
import type { AnalysisFile, Metric } from '@/types';

interface MetricsPanelProps {
  file: AnalysisFile;
}

export function MetricsPanel({ file }: MetricsPanelProps) {
  const issues = file.issues || [];
  
  // Broader mapping to ensure bugs and best-practices are correctly categorized into dashboard cards
  const getCategoryCount = (categories: string[]) => issues.filter(i => 
    categories.includes(i.category?.toLowerCase() || '')
  ).length;

  const metrics: Metric[] = [
    { 
      label: 'Complexity', 
      value: file.timeComplexity || (typeof file.cyclomaticComplexity === 'number' ? (file.cyclomaticComplexity > 15 ? 'High' : file.cyclomaticComplexity > 8 ? 'Moderate' : 'Low') : '1'), 
      sub: file.complexityScore ? `Score: ${file.complexityScore}/100` : `Cyclomatic: ${file.cyclomaticComplexity ?? 1}`, 
      color: typeof file.cyclomaticComplexity === 'number' && file.cyclomaticComplexity > 15 && !file.complexityScore ? 'var(--red)' : ((file.complexityScore ?? 0) > 80 ? 'var(--green)' : ((file.complexityScore ?? 0) > 50 ? 'var(--yellow)' : ((file.cyclomaticComplexity ?? 0) > 8 ? 'var(--yellow)' : 'var(--green)'))) 
    },
    { 
      label: 'Maintainability', 
      value: typeof file.score === 'number' ? `${file.score}/100` : '—', 
      sub: typeof file.score === 'number' && file.score > 80 ? 'Good' : 'Needs attention', 
      color: typeof file.score === 'number' && file.score > 80 ? 'var(--green)' : 'var(--yellow)' 
    },
    { 
      label: 'Security', 
      value: getCategoryCount(['security', 'bug', 'vulnerability', 'best-practice']), 
      sub: 'Security risks', 
      color: getCategoryCount(['security', 'bug', 'vulnerability', 'best-practice']) > 0 ? 'var(--red)' : 'var(--green)' 
    },
    { 
      label: 'Performance', 
      value: getCategoryCount(['performance', 'optimization', 'efficiency', 'complexity']), 
      sub: 'Efficiency issues', 
      color: getCategoryCount(['performance', 'optimization', 'efficiency', 'complexity']) > 0 ? 'var(--yellow)' : 'var(--green)' 
    },
    { 
      label: 'Cognitive', 
      value: typeof file.cognitiveComplexity === 'number' ? file.cognitiveComplexity : '0', 
      sub: 'Mental load', 
      color: (file.cognitiveComplexity || 0) > 10 ? 'var(--red)' : 'var(--accent)' 
    },
    { 
      label: 'Total Issues', 
      value: file.issueCount, 
      sub: `${file.fixedCount} auto-fixable`, 
      color: 'var(--info)' 
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            padding: '12px',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: m.color || 'var(--text)' }}>{m.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>Issue Severity Breakdown</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['error', 'warning', 'info'].map(severity => {
            const count = issues.filter(i => i.severity === severity).length;
            const pct = issues.length > 0 ? Math.round((count / issues.length) * 100) : 0;
            const label = severity === 'info' ? 'suggestions' : `${severity}s`;
            const color = severity === 'error' ? 'var(--red)' : severity === 'warning' ? 'var(--yellow)' : 'var(--info)';
            
            return (
              <div key={severity}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ textTransform: 'capitalize', color: 'var(--text-mid)' }}>{label}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%',
                    background: color,
                    width: `${pct}%`,
                    borderRadius: 2
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
