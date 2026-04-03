'use client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WORKSPACE_KEY = 'codesage_workspace_id';

type ClerkWindow = Window & {
  Clerk?: {
    session?: {
      getToken: () => Promise<string | null>;
    };
  };
};

async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  // Helper to wait for Clerk to be defined on window
  const waitForClerk = () => {
    return new Promise<void>((resolve) => {
      if ((window as ClerkWindow).Clerk) {
        resolve();
        return;
      }

      const interval = setInterval(() => {
        if ((window as ClerkWindow).Clerk) {
          clearInterval(interval);
          resolve();
        }
      }, 50);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, 5000);
    });
  };

  await waitForClerk();
  const clerk = (window as ClerkWindow).Clerk;
  
  if (!clerk?.session) {
    // If not loaded yet, wait a bit more for session
    let attempts = 0;
    while (!clerk?.session && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
  }

  if (!clerk?.session) {
    return null;
  }

  try {
    return await clerk.session.getToken();
  } catch {
    return null;
  }
}

function getWorkspaceId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(WORKSPACE_KEY);
}

function setWorkspaceId(workspaceId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(WORKSPACE_KEY, workspaceId);
}

function clearWorkspaceId() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(WORKSPACE_KEY);
}

function extractTrpcData(payload: any) {
  if (payload?.result?.data?.json !== undefined) {
    return payload.result.data.json;
  }

  if (payload?.result?.data !== undefined) {
    return payload.result.data;
  }

  return payload;
}

async function trpcRequest(path: string, input?: unknown) {
  const token = await getToken();
  const workspaceId = getWorkspaceId();

  console.log(`[API] Mutation: ${path}`, { workspaceId });
  const response = await fetch(`${BASE_URL}/trpc/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
    },
    body: JSON.stringify(input ?? {}),
  });

  const payload = await response.json();
  if (response.status === 403) {
    clearWorkspaceId();
  }

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message ?? 'Request failed');
  }

  return extractTrpcData(payload);
}

async function trpcQueryRequest(path: string, input?: unknown) {
  const token = await getToken();
  const workspaceId = getWorkspaceId();
  const serializedInput = encodeURIComponent(JSON.stringify(input ?? {}));

  console.log(`[API] Query: ${path}`, { workspaceId });
  const response = await fetch(`${BASE_URL}/trpc/${path}?input=${serializedInput}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
    },
  });

  const payload = await response.json();
  if (response.status === 403) {
    clearWorkspaceId();
  }

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message ?? 'Request failed');
  }

  return extractTrpcData(payload);
}

export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return response.json();
  },

  post: async (endpoint: string, data: unknown) => {
    const token = await getToken();
    const workspaceId = getWorkspaceId();
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    return response.json();
  },

  trpcQuery: async <T = unknown>(path: string, input?: unknown): Promise<T> => {
    return trpcQueryRequest(path, input) as Promise<T>;
  },

  trpcMutation: async <T = unknown>(path: string, input?: unknown): Promise<T> => {
    return trpcRequest(path, input) as Promise<T>;
  },

  ensureWorkspace: async (): Promise<string> => {
    const existing = getWorkspaceId();
    // Resolve against workspace.list only. workspace.current returns HTTP 404 when the
    // stored id is stale, which spams the browser console even though we recover.
    const workspaces = await api.trpcQuery<Array<{ id: string }>>('workspace.list');
    const list = Array.isArray(workspaces) ? workspaces : [];

    if (existing && list.some((w) => w.id === existing)) {
      return existing;
    }

    if (existing) {
      clearWorkspaceId();
    }

    const first = list[0];
    if (!first?.id) {
      throw new Error('No workspace found for current user');
    }

    setWorkspaceId(first.id);
    return first.id;
  },
};
