'use client';
import React from 'react';
import { IssueItem } from './issue-item';
import type { Issue } from '@/types';

interface IssueListProps {
  issues: Issue[];
  activeIssueId?: string;
  onIssueClick: (id: string) => void;
  onApplyFix?: (id: string) => void;
}

export function IssueList({ issues, activeIssueId, onIssueClick, onApplyFix }: IssueListProps) {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ padding: '0 16px 8px', display: 'flex', gap: 12, fontSize: 11, fontWeight: 600 }}>
        <span style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} />
          {errors.length} errors
        </span>
        <span style={{ color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--yellow)' }} />
          {warnings.length} warnings
        </span>
        <span style={{ color: 'var(--info)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--info)' }} />
          {infos.length} suggestions
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ color: 'var(--accent)' }}>{issues.filter(i => i.fixable).length} auto-fixable</span>
      </div>

      <div className="divide-surface">
        {issues.map(issue => (
          <IssueItem
            key={issue.id}
            issue={issue}
            active={issue.id === activeIssueId}
            onClick={() => onIssueClick(issue.id)}
            onApplyFix={onApplyFix}
          />
        ))}
      </div>
    </div>
  );
}
