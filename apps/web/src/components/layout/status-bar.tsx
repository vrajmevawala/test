'use client';
import React from 'react';
import { GitBranch, AlertCircle } from 'lucide-react';

interface StatusBarProps {
  file?: string;
  language?: string;
  issueCount?: number;
  line?: number;
  col?: number;
  remainingUses?: number | null;
}

export function StatusBar({ 
  file, 
  language, 
  issueCount = 0, 
  line = 1, 
  col = 1,
  remainingUses,
}: StatusBarProps) {
  return (
    <div style={{
      height: 'var(--statusbar-h)',
      background: 'var(--accent)',
      color: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 16,
      flexShrink: 0,
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <GitBranch size={11} />
        <span>main</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <AlertCircle size={11} />
        <span>{issueCount} issues</span>
      </div>
      <div style={{ flex: 1 }} />
      {remainingUses != null ? (
        <span style={{ opacity: 0.85 }}>Free runs left: {remainingUses}</span>
      ) : null}
      <span style={{ opacity: 0.8 }}>{file}</span>
      <span>{language}</span>
      <span>UTF-8</span>
      <span>Ln {line}, Col {col}</span>
      <span style={{ opacity: 0.7 }}>v1.0</span>
    </div>
  );
}
