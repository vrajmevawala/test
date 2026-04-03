'use client';
import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'green' | 'red' | 'yellow' | 'info' | 'accent' | 'dim' | 'ghost';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const styles: Record<BadgeVariant, React.CSSProperties> = {
  green:  { background: 'var(--green-dim)',  color: 'var(--green)',  border: '1px solid rgba(63, 185, 80, 0.15)' },
  red:    { background: 'var(--red-dim)',    color: 'var(--red)',    border: '1px solid rgba(255, 123, 114, 0.15)' },
  yellow: { background: 'var(--yellow-dim)', color: 'var(--yellow)', border: '1px solid rgba(227, 179, 65, 0.15)' },
  info:   { background: 'var(--info-dim)',   color: 'var(--info)',   border: '1px solid rgba(121, 192, 255, 0.15)' },
  accent: { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(240, 136, 62, 0.15)' },
  dim:    { background: 'var(--surface-2)',  color: 'var(--text-mid)', border: '1px solid var(--border)' },
  ghost:  { background: 'transparent',      color: 'var(--text-mid)', border: 'none' },
};

export function Badge({ children, variant = 'dim', size = 'md', className }: BadgeProps) {
  const sizeStyles = {
    xs: { padding: '0 4px', fontSize: '9px' },
    sm: { padding: '1px 6px', fontSize: '10px' },
    md: { padding: '1px 8px', fontSize: '11px' },
  }[size];

  return (
    <span
      className={clsx('badge', className)}
      style={{
        ...styles[variant],
        ...sizeStyles,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: '20px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        lineHeight: '16px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: 'error' | 'warning' | 'info' }) {
  const map = { error: 'red', warning: 'yellow', info: 'info' } as const;
  return <Badge variant={map[severity]}>{severity}</Badge>;
}
