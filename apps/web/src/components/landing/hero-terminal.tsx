'use client';
import React, { useEffect, useState } from 'react';

const TERMINAL_LINES = [
  { text: '$ codesage analyze ./src --format=json', color: 'var(--text-mid)' },
  { text: '⚡ CodeSage v1.0 — AI Code Optimizer', color: 'var(--accent)' },
  { text: '  Scanning 3 files...', color: 'var(--text-mid)' },
  { text: '', color: '' },
  { text: '  utils/dataProcessor.ts', color: 'var(--text)' },
  { text: '    ✗ [error]   O(n²) nested loop detected         ln 8', color: 'var(--red)' },
  { text: '    ✗ [error]   SQL injection vulnerability         ln 10', color: 'var(--red)' },
  { text: '    ⚠ [warn]    Cognitive complexity: 12/10         ln 25', color: 'var(--yellow)' },
  { text: '    ⚠ [warn]    Magic numbers — extract constants    ln 33', color: 'var(--yellow)' },
  { text: '', color: '' },
  { text: '  api/userController.js', color: 'var(--text)' },
  { text: '    ✗ [error]   Password hash in API response       ln 23', color: 'var(--red)' },
  { text: '    ✗ [error]   N+1 query — 2 queries/row           ln 28', color: 'var(--red)' },
  { text: '', color: '' },
  { text: '  Apply 7 auto-fixes? (y/n) y', color: 'var(--accent)' },
  { text: '  ✓ Fixed 7 issues in 2.1s', color: 'var(--green)' },
  { text: '', color: '' },
  { text: '  Score: 41 → 94  ↑ +53pts', color: 'var(--green)' },
  { text: '  Analysis complete. 0 critical issues remain.', color: 'var(--green)' },
];

export function HeroTerminal() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= TERMINAL_LINES.length) return;
    const timer = setTimeout(() => setVisibleLines(v => v + 1), 260);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
    }}>
      {/* Window chrome */}
      <div style={{
        background: 'var(--surface-2)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
        <span style={{ marginLeft: 8, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
          terminal — codesage
        </span>
      </div>

      {/* Terminal content */}
      <div style={{
        padding: '16px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12.5,
        lineHeight: '20px',
        minHeight: 360,
      }}>
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} style={{ color: line.color || 'transparent', whiteSpace: 'pre', minHeight: 20 }}>
            {line.text || '\u00a0'}
          </div>
        ))}
        {visibleLines < TERMINAL_LINES.length && (
          <span style={{
            display: 'inline-block',
            width: 7,
            height: 14,
            background: 'var(--accent)',
            animation: 'blink 1s step-end infinite',
            verticalAlign: 'middle',
          }} />
        )}
      </div>
    </div>
  );
}
