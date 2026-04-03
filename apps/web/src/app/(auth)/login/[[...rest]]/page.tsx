'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 20,
        gap: 24,
      }}
    >
      <SignIn signUpUrl="/sign-up" forceRedirectUrl="/dashboard" />
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Not ready to sign up?</div>
        <a 
          href="/playground" 
          style={{ 
            fontSize: 14, 
            color: 'var(--accent)', 
            fontWeight: 600, 
            textDecoration: 'none',
            border: '1px solid var(--accent)',
            padding: '8px 24px',
            borderRadius: 8,
            transition: 'opacity 0.2s'
          }}
        >
          Try the Playground
        </a>
      </div>
    </div>
  );
}
