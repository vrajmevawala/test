'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';

export default function InvitePage() {
  const { id: workspaceId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        await api.ensureWorkspace(); // This ensures the user is logged in and synced
        setLoading(false);
      } catch (err) {
        setError('Please sign in to join this team.');
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleJoin = async () => {
    try {
      setJoining(true);
      await api.trpcMutation('team.join', { workspaceId: workspaceId as string });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team.');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-dim)' }}>
        <Loader2 className="animate-spin-smooth" size={24} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 400, width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Users size={24} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Join the Team</h1>
        <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 24 }}>
          You've been invited to join a collaboration workspace on CodeSage.
        </p>

        {error ? (
          <div style={{ color: 'var(--red)', background: 'var(--red-dim)', padding: '12px', borderRadius: 6, fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 12 }}>
          <Button 
            variant="secondary" 
            style={{ flex: 1 }}
            onClick={() => router.push('/dashboard')}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            style={{ flex: 1 }}
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? <Loader2 className="animate-spin-smooth" size={16} /> : 'Join Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
