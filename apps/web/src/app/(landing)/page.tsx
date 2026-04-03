'use client';
import React from 'react';
import { Show } from '@clerk/nextjs';
import Link from 'next/link';
import { HeroTerminal } from '@/components/landing/hero-terminal';
import { FeatureCarousel } from '@/components/landing/feature-carousel';
import { PricingGrid } from '@/components/landing/pricing-grid';
import { StatusBar } from '@/components/layout/status-bar';
import { Zap, ArrowRight } from 'lucide-react';
import { GithubIcon } from '@/components/ui/icons';

const STATS = [
  { value: '2.4M+', label: 'Issues Fixed' },
  { value: '48K+',  label: 'Developers' },
  { value: '94',    label: 'Avg Score' },
];

const NAV_LINKS = ['Features', 'Pricing', 'Docs', 'Blog'];

export default function LandingPage() {
  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(13,17,23,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 40px', height: 52,
        gap: 32,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={13} color="#0d1117" fill="#0d1117" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>CodeSage</span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 24, flex: 1 }}>
          <Link href="/playground" style={{ fontSize: 13, color: 'var(--text-mid)', transition: 'color 0.15s', textDecoration: 'none' }}>Playground</Link>
          {NAV_LINKS.map(l => (
            <a key={l} href="#" style={{ fontSize: 13, color: 'var(--text-mid)', transition: 'color 0.15s' }}>{l}</a>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Show when="signed-out">
            <Link href="/login"
              style={{ color: 'var(--text-mid)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '6px 12px', textDecoration: 'none' }}
            >Sign In</Link>
            <Link href="/login"
              style={{
                height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--accent)', color: '#0d1117', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none'
              }}
            >
              Start Free
            </Link>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard"
              style={{
                height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--accent)', color: '#0d1117', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none'
              }}
            >
              Dashboard
            </Link>
          </Show>
        </div>
      </header>

      {/* Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, padding: '64px 80px', maxWidth: 1200, margin: '0 auto', width: '100%', alignItems: 'center' }}>
        {/* Left */}
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--accent-dim)', border: '1px solid rgba(240,136,62,0.3)',
            borderRadius: 20, padding: '4px 12px', marginBottom: 24,
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)',
          }}>
            <Zap size={10} />
            AI Code Optimizer · v1.0
          </div>

          <h1 style={{
            fontSize: 44, fontWeight: 800, color: 'var(--text)',
            lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 20,
          }}>
            Turn every developer into a{' '}
            <span style={{ color: 'var(--accent)' }}>senior reviewer</span>
          </h1>

          <p style={{ fontSize: 16, color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: 32 }}>
            CodeSage catches what humans miss — O(n²) loops, SQL injections, exposed secrets — and fixes them automatically with AI-generated, diff-previewed patches.
          </p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
            <Link
              href="/login"
              style={{
                height: 42, padding: '0 24px', borderRadius: 'var(--radius-md)',
                background: 'var(--accent)', color: '#0d1117', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none'
              }}
            >
              Start Free — No credit card <ArrowRight size={15} />
            </Link>
            <Link
              href="/playground"
              style={{
                height: 42, padding: '0 20px', borderRadius: 'var(--radius-md)',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 8,
                textDecoration: 'none'
              }}
            >
              Try Playground
            </Link>
            <button
              style={{
                height: 42, padding: '0 20px', borderRadius: 'var(--radius-md)',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <GithubIcon size={15} /> GitHub App
            </button>
          </div>

          <div style={{ display: 'flex', gap: 32 }}>
            {STATS.map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Terminal */}
        <HeroTerminal />
      </div>

      <div style={{ padding: '48px 80px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Everything you need to ship better code</h2>
          <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>Six powerful modules. One platform.</p>
        </div>
        <FeatureCarousel />
      </div>

      <div style={{ padding: '48px 80px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>Start free. Scale as you grow.</p>
        </div>
        <PricingGrid onGetStarted={() => {}} />
      </div>

      <div style={{ marginTop: 'auto' }}>
        <StatusBar file="landing.tsx" language="TypeScript" issueCount={0} />
      </div>
    </div>
  );
}
