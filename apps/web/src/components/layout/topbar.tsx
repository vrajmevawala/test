'use client';
import React from 'react';
import { Bell } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/analyze':   'Code Analyzer',
  '/history':   'Analysis History',
  '/team':      'Team',
  '/billing':   'Billing',
  '/settings':  'Settings',
};

interface TopbarProps {
  children?: React.ReactNode;
}

export function Topbar({ children }: TopbarProps) {
  const pathname = usePathname();
  const title = PAGE_TITLES[Object.keys(PAGE_TITLES).find(key => pathname.startsWith(key)) || ''] || 'CodeSage';

  return (
    <header style={{
      height: 'var(--topbar-h)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
          {title}
        </h1>
      </div>
      {children}
      <div id="topbar-portal" style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          style={{ color: 'var(--text-mid)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 4 }}
        >
          <Bell size={16} />
        </button>
        <UserButton />
      </div>
    </header>
  );
}
