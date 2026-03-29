'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScoreRing } from '@/components/ui/score-ring';
import { UserPlus, Link as LinkIcon, MoreHorizontal } from 'lucide-react';
import { api } from '@/lib/api';

type MemberRow = {
  memberId: string;
  userId: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
  joinedAt: string | null;
  inviteEmail: string | null;
  userName: string | null;
  userEmail: string | null;
  analysesCount: number;
  avgScore: number | null;
};

type BillingResponse = {
  credits: {
    plan: 'free' | 'pro' | 'team' | 'enterprise';
    creditsUsed: number;
    creditsLimit: number;
  };
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function TeamPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [plan, setPlan] = useState<BillingResponse['credits'] | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const ws = await api.ensureWorkspace();
        if (!mounted) return;
        setWorkspaceId(ws);

        const [memberRows, billing] = await Promise.all([
          api.trpcQuery<MemberRow[]>('team.members', {}),
          api.trpcQuery<BillingResponse>('billing.subscription', {}),
        ]);

        if (!mounted) return;
        setMembers(memberRows ?? []);
        setPlan(billing?.credits ?? null);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load team');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleInvite = async () => {
    const email = window.prompt("Enter teammate's email:");
    if (!email || inviting) return;
    try {
      setInviting(true);
      await api.trpcMutation('team.invite', { email, role: 'developer' });
      // Refresh
      const memberRows = await api.trpcQuery<MemberRow[]>('team.members', {});
      setMembers(memberRows ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/invite/${workspaceId}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      console.error("Paste failed", err);
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the team?`)) return;
    try {
      await api.trpcMutation('team.removeMember', { memberId });
      setMembers(prev => prev.filter(m => m.memberId !== memberId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to remove member");
    }
  };

  const activeMembers = useMemo(() => members.filter((m) => m.status === 'active'), [members]);
  const creditsLimit = plan?.creditsLimit ?? 0;
  const creditsUsed = plan?.creditsUsed ?? 0;
  const creditRatio = creditsLimit > 0 ? Math.min(100, Math.round((creditsUsed / creditsLimit) * 100)) : 0;

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--text-dim)' }}>Loading team...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: 'var(--red)' }}>Failed to load team data: {error}</div>;
  }

  return (
    <div style={{ padding: 24, display: 'flex', gap: 20, height: '100%', overflow: 'auto' }}>
      <div style={{ flex: 2.5, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Team Members</h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{members.length} members · {(plan?.plan ?? 'free').toUpperCase()} plan</p>
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            icon={<UserPlus size={13} />}
            onClick={handleInvite}
            disabled={inviting}
          >
            {inviting ? "Inviting..." : "Invite Member"}
          </Button>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 90px 40px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            {['Member', 'Role', 'Analyses', 'Avg Score', 'Status', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>

          {members.map((m, i) => {
            const displayName = m.userName ?? 'Pending Invite';
            const displayEmail = m.userEmail ?? m.inviteEmail ?? '—';
            const avatarColor = m.role === 'owner' ? 'var(--accent)' : m.role === 'admin' ? 'var(--info)' : 'var(--green)';
            return (
              <div key={m.memberId} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 90px 40px', padding: '12px 16px', alignItems: 'center', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={initials(displayName)} color={avatarColor} size={32} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{displayEmail}</div>
                  </div>
                </div>

                <Badge variant={m.role === 'owner' ? 'accent' : m.role === 'admin' ? 'info' : 'dim'}>{m.role}</Badge>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: m.status === 'invited' ? 'var(--text-dim)' : 'var(--text)' }}>{m.status === 'invited' ? '—' : Number(m.analysesCount)}</div>
                <div>{m.status === 'invited' ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-dim)' }}>—</span> : <ScoreRing score={Math.round(Number(m.avgScore ?? 0))} size={32} strokeWidth={3} />}</div>
                <Badge variant={m.status === 'active' ? 'green' : m.status === 'invited' ? 'yellow' : 'red'}>{m.status}</Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={<MoreHorizontal size={14} />} 
                  onClick={() => handleRemoveMember(m.memberId, displayName)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Plan Usage</div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>Seats</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{activeMembers.length}</span>
            </div>
            <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: '100%', background: 'var(--accent)', borderRadius: 3 }} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>Credits</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{creditsUsed} / {creditsLimit > 0 ? creditsLimit : 'unlimited'}</span>
            </div>
            <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${creditRatio}%`, background: 'var(--green)', borderRadius: 3, transition: 'width 0.6s ease' }} />
            </div>
          </div>

          <Button variant="secondary" size="sm" style={{ width: '100%', marginTop: 4 }}>Upgrade Plan</Button>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Invite Link</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>Share this link to invite teammates directly.</div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-mid)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {`${window.location.origin}/invite/${workspaceId}`}
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            icon={isCopying ? null : <LinkIcon size={12} />} 
            style={{ width: '100%' }}
            onClick={handleCopyLink}
          >
            {isCopying ? "Link Copied!" : "Copy Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
