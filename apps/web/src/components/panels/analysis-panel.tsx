'use client';
import React, { useState } from 'react';
import { ScoreRing } from '../ui/score-ring';
import { IssueList } from './issue-list';
import { DiffView } from './diff-view';
import { MetricsPanel } from './metrics-panel';
import type { AnalysisFile } from '@/types';

interface AnalysisPanelProps {
  file: AnalysisFile;
  activeIssueId?: string;
  onIssueClick: (id: string) => void;
  onApplyFix?: (id: string) => void;
}

type Tab = 'issues' | 'diff' | 'metrics';

export function AnalysisPanel({ file, activeIssueId, onIssueClick, onApplyFix }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('issues');
  const [headerHeight, setHeaderHeight] = useState(160);
  const [isResizing, setIsResizing] = React.useState(false);

  const startResizing = React.useCallback(() => setIsResizing(true), []);
  const stopResizing = React.useCallback(() => setIsResizing(false), []);
  const resize = React.useCallback((e: MouseEvent) => {
    if (isResizing) {
      const container = document.getElementById('analysis-panel-container');
      if (container) {
        const top = container.getBoundingClientRect().top;
        const newHeight = e.clientY - top;
        if (newHeight > 100 && newHeight < 500) {
          setHeaderHeight(newHeight);
        }
      }
    }
  }, [isResizing]);

  React.useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div 
      id="analysis-panel-container"
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Scrollable Top Section: Header + Tabs */}
      <div style={{ height: headerHeight, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <ScoreRing score={file.score} size={48} strokeWidth={4} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Quality Score</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name.split('/').pop()}</div>
              <div style={{ fontSize: 11, color: 'var(--text-mid)' }}>{file.issueCount} issues · {file.fixedCount} fixable</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
          height: 36,
          gap: 20,
          flexShrink: 0,
        }}>
          {(['issues', 'diff', 'metrics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: 12,
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-mid)',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                textTransform: 'capitalize',
              }}
            >
              {tab} {tab === 'issues' && `(${file.issueCount})`}
            </button>
          ))}
        </div>
        
        {/* Only header and tabs here */}
      </div>

      {/* Horizontal Resizer (Vertical Resize) */}
      <div
        onMouseDown={startResizing}
        style={{
          height: 4,
          width: '100%',
          cursor: 'row-resize',
          background: isResizing ? 'var(--accent)' : 'transparent',
          zIndex: 10,
          flexShrink: 0,
        }}
        onMouseEnter={e => !isResizing && (e.currentTarget.style.background = 'var(--border)')}
        onMouseLeave={e => !isResizing && (e.currentTarget.style.background = 'transparent')}
      />

      {/* Bottom Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'issues' && (
          <IssueList
            issues={file.issues}
            activeIssueId={activeIssueId}
            onIssueClick={onIssueClick}
            onApplyFix={onApplyFix}
          />
        )}
        {activeTab === 'diff' && (
          <DiffView code={file.code} issues={file.issues} />
        )}
        {activeTab === 'metrics' && (
          <div style={{ padding: 16 }}>
            <MetricsPanel file={file} />
          </div>
        )}
      </div>
    </div>
  );
}
