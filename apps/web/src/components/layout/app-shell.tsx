'use client';
import React from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { StatusBar } from './status-bar';
import { BotWidget } from '../bot/bot-widget';
import { useAuth } from '@clerk/nextjs';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg)',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-dim)',
        fontSize: '13px',
        fontFamily: 'var(--font-ui)',
      }}>
        Initialising session...
      </div>
    );
  }

  // Not signed in? Render nothing (or could redirect/show sign-in)
  // But usually this layout is used inside (app) which is protected by middleware/layout
  if (!isSignedIn) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        position: 'relative',
      }}>
        <Topbar />
        <main style={{
          flex: 1,
          overflow: 'hidden', // Changed to hidden so the page handles scroll
          position: 'relative',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
