'use client';
import React from 'react';
import {
  LayoutDashboard, Code2, History, Users, CreditCard, Settings,
  ChevronRight, GitBranch, FolderOpen, File, Zap
} from 'lucide-react';
import { Avatar } from '../ui/avatar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, href: '/dashboard' },
  { id: 'analyze',   label: 'Analyze',    icon: Code2,           href: '/analyze' },
  { id: 'history',   label: 'History',    icon: History,         href: '/history' },
  { id: 'team',      label: 'Team',       icon: Users,           href: '/team' },
  { id: 'billing',   label: 'Billing',    icon: CreditCard,      href: '/billing' },
  { id: 'settings',  label: 'Settings',   icon: Settings,        href: '/settings' },
];

const FILE_TREE: any[] = [
  // { name: 'utils/',              isDir: true },
  // { name: 'dataProcessor.ts',   isDir: false, indent: 1, active: true },
  // { name: 'api/',                isDir: true },
  // { name: 'userController.js',  isDir: false, indent: 1 },
  // { name: 'components/',        isDir: true },
  // { name: 'DataGrid.tsx',       isDir: false, indent: 1 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  const userFullName = user?.fullName || user?.username || 'User';
  const userEmail = user?.primaryEmailAddress?.emailAddress || '';
  const userInitials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.firstName 
      ? user.firstName[0].toUpperCase()
      : 'U';
  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      height: '100%',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        height: 'var(--topbar-h)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        gap: 8,
      }}>
        <div style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Zap size={14} color="#0d1117" strokeWidth={2.5} fill="#0d1117" />
        </div>
        <Link href="/" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.02em', textDecoration: 'none' }}>
          CodeSage
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '8px 0', flex: 'none' }}>
        {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={id}
              href={href}
              style={{
                width: '100%',
                height: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 16px',
                background: isActive ? 'var(--surface-2)' : 'transparent',
                borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                borderRight: 'none',
                borderTop: 'none',
                borderBottom: 'none',
                color: isActive ? 'var(--text)' : 'var(--text-mid)',
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                fontFamily: 'var(--font-ui)',
                textAlign: 'left',
                textDecoration: 'none',
              }}
            >
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* File tree */}
      <div style={{ padding: '8px 0', borderTop: '1px solid var(--border)', flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '4px 16px 8px', fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          WORKSPACE
        </div>
        {FILE_TREE.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: `3px 16px 3px ${16 + (f.indent || 0) * 14}px`,
              color: (f as any).active ? 'var(--text)' : f.isDir ? 'var(--text-mid)' : 'var(--text-dim)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {f.isDir ? (
              <>
                <ChevronRight size={12} style={{ flexShrink: 0 }} />
                <FolderOpen size={12} style={{ flexShrink: 0, color: 'var(--yellow)' }} />
              </>
            ) : (
              <File size={12} style={{ flexShrink: 0 }} />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
          </div>
        ))}
      </div>

      {/* User profile */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Avatar initials={userInitials} color="var(--accent)" size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userFullName}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
        </div>
      </div>
    </aside>
  );
}
