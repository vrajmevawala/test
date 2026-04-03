'use client';
import React, { useState } from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Zap, GitMerge } from 'lucide-react';
import { GithubIcon, SlackIcon } from '@/components/ui/icons';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: 'var(--text)',
        marginBottom: 16, paddingBottom: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function IntegrationRow({ icon: Icon, name, desc, connected }: { icon: React.ElementType; name: string; desc: string; connected?: boolean }) {
  const [isConnected, setIsConnected] = useState(connected ?? false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color: 'var(--text-mid)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{desc}</div>
      </div>
      <Button
        variant={isConnected ? 'secondary' : 'primary'}
        size="sm"
        onClick={() => setIsConnected(c => !c)}
      >
        {isConnected ? '✓ Connected' : 'Connect'}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const [autoFix, setAutoFix] = useState(true);
  const [strictMode, setStrictMode] = useState(false);
  const [storeCode, setStoreCode] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [rlhf, setRlhf] = useState(false);
  const [retention, setRetention] = useState('30');

  return (
    <div style={{ padding: 24, maxWidth: 680 }}>
      <Section title="Analysis">
        <SettingRow label="Auto-fix suggestions" desc="Show AI-generated fix suggestions for all fixable issues">
          <Toggle checked={autoFix} onChange={setAutoFix} />
        </SettingRow>
        <SettingRow label="Strict mode" desc="Enable all rule categories including style and best practices">
          <Toggle checked={strictMode} onChange={setStrictMode} />
        </SettingRow>
        <SettingRow label="Default severity">
          <select
            defaultValue="warning"
            style={{
              height: 32, padding: '0 10px',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: 12,
              fontFamily: 'var(--font-ui)', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="error">Errors only</option>
            <option value="warning">Warnings + Errors</option>
            <option value="info">All issues</option>
          </select>
        </SettingRow>
        <SettingRow label="Code retention">
          <select
            value={retention}
            onChange={e => setRetention(e.target.value)}
            style={{
              height: 32, padding: '0 10px',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: 12,
              fontFamily: 'var(--font-ui)', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="never">Never store</option>
          </select>
        </SettingRow>
      </Section>

      <Section title="Notifications">
        <SettingRow label="Email alerts" desc="Get notified about critical security issues by email">
          <Toggle checked={emailAlerts} onChange={setEmailAlerts} />
        </SettingRow>
        <SettingRow label="Slack alerts" desc="Post critical issues to a Slack channel">
          <Toggle checked={slackAlerts} onChange={setSlackAlerts} />
        </SettingRow>
        <SettingRow label="Weekly digest" desc="Receive a weekly summary of your team's code quality">
          <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} />
        </SettingRow>
      </Section>

      <Section title="Integrations">
        <IntegrationRow icon={GithubIcon} name="GitHub App" desc="Automatic PR comments and CI checks" connected />
        <IntegrationRow icon={SlackIcon} name="Slack" desc="Post alerts and digests to Slack channels" />
        <IntegrationRow icon={GitMerge} name="GitLab" desc="GitLab MR integration and CI/CD pipeline gates" />
        <IntegrationRow icon={Zap} name="VS Code" desc="Live issue squiggles and inline fix suggestions" connected />
      </Section>

      <Section title="Privacy">
        <SettingRow label="Store code snippets" desc="Allow CodeSage to cache snippets for faster repeat analysis">
          <Toggle checked={storeCode} onChange={setStoreCode} />
        </SettingRow>
        <SettingRow label="Opt in to model improvement" desc="Allow anonymized accepted fixes to improve CodeSage AI (RLHF)">
          <Toggle checked={rlhf} onChange={setRlhf} />
        </SettingRow>
        <SettingRow label="Delete all data">
          <Button variant="danger" size="sm">Delete Account Data</Button>
        </SettingRow>
      </Section>

      <Button variant="primary" size="default">Save Changes</Button>
    </div>
  );
}
