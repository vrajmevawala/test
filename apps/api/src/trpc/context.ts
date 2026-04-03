import { db } from "@codeopt/db";
import { users, teamMembers, workspaces } from "@codeopt/db/schema";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "@clerk/backend";

export type Context = {
  db: typeof db;
  user: { id: string; clerkId: string; plan: "free" | "pro" | "team" | "enterprise" } | null;
  workspaceId: string | null;
  memberRole: "owner" | "admin" | "developer" | "viewer" | null;
  req: FastifyRequest;
  reply: FastifyReply;
};

import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
});

// Simple In-memory Session Cache (TTL: 5 minutes)
// This avoids redundant context lookups for multiple concurrent TRPC requests.
const sessionCache = new Map<string, { user: any; memberRole: any; workspaceId: any; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; 

async function syncUser(clerkUserId: string): Promise<NonNullable<Context["user"]> | null> {
  let user: NonNullable<Context["user"]>;
  
  const [existing] = await db
    .select({ id: users.id, clerkId: users.clerkId, name: users.name, plan: users.plan })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  if (existing && existing.name !== "New User") {
    user = existing;
  } else {
    // Fetch details from Clerk for a new or un-synced user
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const primaryEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
    const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim() : (clerkUser.username || "Anonymous");

    if (existing) {
      // Update existing user with Clerk profile
      console.log(`[Auth] Refreshing identity for Clerk ID: ${clerkUserId} (${name})`);
      await db
        .update(users)
        .set({
          name,
          email: primaryEmail || undefined,
          avatarUrl: clerkUser.imageUrl,
        })
        .where(eq(users.id, existing.id));
      user = { id: existing.id, clerkId: existing.clerkId, plan: existing.plan };
    } else {
      console.log(`[Auth] Provisioning actual user for Clerk ID: ${clerkUserId} (${name})`);
      const [newUser] = await db
        .insert(users)
        .values({
          clerkId: clerkUserId,
          email: primaryEmail || `sync_${clerkUserId}@codeopt.dev`,
          name: name,
          avatarUrl: clerkUser.imageUrl,
        })
        .returning({ id: users.id, clerkId: users.clerkId, plan: users.plan });
      user = newUser;
    }
  }

  // Ensure user has at least one workspace
  const [firstMembership] = await db
    .select({ workspaceId: teamMembers.workspaceId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (!firstMembership) {
    console.log(`[Auth] User ${user.id} has no workspace. Provisioning one...`);
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: "My Workspace",
        slug: `workspace-${user.id.slice(0, 8)}`,
        ownerId: user.id,
      })
      .returning({ id: workspaces.id });

    await db.insert(teamMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
      status: "active",
      joinedAt: new Date(),
    });
  }

  return user;
}

export async function createContext({ req, res }: { req: FastifyRequest; res: FastifyReply }): Promise<Context> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return { db, user: null, workspaceId: null, memberRole: null, req, reply: res };
  }

  let clerkUserId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY ?? "",
    });
    clerkUserId = payload.sub;
  } catch (err) {
    console.error("[Auth] Token verification failed:", err);
    return { db, user: null, workspaceId: null, memberRole: null, req, reply: res };
  }

  const workspaceId = ((req.headers["x-workspace-id"] as string | undefined) ?? null) || null;
  const cacheKey = `${clerkUserId}:${workspaceId ?? 'none'}`;
  const cached = sessionCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return { db, user: cached.user, workspaceId, memberRole: cached.memberRole, req, reply: res };
  }

  // CONSOLIDATED QUERY: Fetch User and Membership in a single JOIN
  // This reduces context setup from 3-4 hits to 1-2 hits.
  const [result] = await db
    .select({
      user: { id: users.id, clerkId: users.clerkId, plan: users.plan },
      role: teamMembers.role
    })
    .from(users)
    .leftJoin(
      teamMembers, 
      and(
        eq(teamMembers.userId, users.id),
        workspaceId ? eq(teamMembers.workspaceId, workspaceId) : undefined,
        eq(teamMembers.status, "active")
      )
    )
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  if (!result) {
    // If not in DB yet (first time), fall back to syncUser
    const user = await syncUser(clerkUserId);
    if (!user) return { db, user: null, workspaceId: null, memberRole: null, req, reply: res };
    
    // Store in cache for next hit
    sessionCache.set(cacheKey, { user, memberRole: null, workspaceId, expiresAt: Date.now() + CACHE_TTL });
    return { db, user, workspaceId, memberRole: null, req, reply: res };
  }

  // Store in cache for next hit
  sessionCache.set(cacheKey, { user: result.user, memberRole: result.role, workspaceId, expiresAt: Date.now() + CACHE_TTL });

  return { 
    db, 
    user: result.user, 
    workspaceId, 
    memberRole: result.role, 
    req, 
    reply: res 
  };
}
