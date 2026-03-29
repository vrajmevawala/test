'use client';
import React from 'react';
import type { Issue, DiffLine } from '@/types';

interface DiffViewProps {
  code: string;
  issues: Issue[];
}

export function DiffView({ code, issues }: DiffViewProps) {
  const diffLines: DiffLine[] = [];
  const lines = code.split('\n');

  // We only care about unique lines with fixes to avoid duplicates
  const fixableIssues = issues
    .filter(iss => iss.fix && iss.line > 0 && iss.line <= lines.length)
    .sort((a, b) => a.line - b.line);

  let currentLine = 1;

  fixableIssues.forEach(issue => {
    // Add context lines before the issue
    while (currentLine < issue.line) {
      diffLines.push({ type: 'context', lineNum: currentLine, content: lines[currentLine - 1] });
      currentLine++;
    }

    // Add the removed original line
    diffLines.push({ type: 'remove', lineNum: currentLine, content: lines[currentLine - 1] });

    // Add the added fixed lines
    const fixLines = issue.fix?.split('\n') || [];
    fixLines.forEach((fLine) => {
      diffLines.push({ type: 'add', content: fLine });
    });

    currentLine++;
  });

  // Add remaining context lines after the last issue
  while (currentLine <= lines.length) {
    diffLines.push({ type: 'context', lineNum: currentLine, content: lines[currentLine - 1] });
    currentLine++;
  }

  return (
    <div style={{ 
      fontFamily: 'var(--font-mono)', 
      fontSize: 12, 
      overflowX: 'auto',
      height: '100%',
      background: 'var(--surface-dark)',
    }}>
      <div style={{ minWidth: 'max-content' }}>
        {diffLines.map((line, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              background: line.type === 'add' ? 'rgba(46, 160, 67, 0.15)' : line.type === 'remove' ? 'rgba(248, 81, 73, 0.15)' : 'transparent',
              borderLeft: `2px solid ${line.type === 'add' ? '#3fb950' : line.type === 'remove' ? '#f85149' : 'transparent'}`,
              lineHeight: '20px',
              minHeight: 20,
            }}
          >
            <div style={{
              width: 50,
              textAlign: 'right',
              padding: '0 10px',
              color: 'var(--text-dim)',
              flexShrink: 0,
              userSelect: 'none',
              borderRight: '1px solid var(--border)',
              marginRight: 8,
              opacity: 0.5,
            }}>
              {line.lineNum || ''}
            </div>
            <div style={{
              width: 20,
              textAlign: 'center',
              color: line.type === 'add' ? '#3fb950' : line.type === 'remove' ? '#f85149' : 'var(--text-dim)',
              flexShrink: 0,
              userSelect: 'none',
              fontWeight: 600,
            }}>
              {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
            </div>
            <pre style={{
              margin: 0,
              padding: '0 12px',
              color: line.type === 'add' ? '#aff5b4' : line.type === 'remove' ? '#ffdcd7' : 'var(--text)',
              whiteSpace: 'pre',
              fontFamily: 'inherit',
              wordBreak: 'keep-all',
            }}>
              {line.content || ''}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
