import { t } from './init.js';
import { userRouter } from './routers/user.js';
import { workspaceRouter } from './routers/workspace.js';
import { analysisRouter } from './routers/analysis.js';
import { issueRouter } from './routers/issue.js';
import { fixRouter } from './routers/fix.js';
import { teamRouter } from './routers/team.js';
import { billingRouter } from './routers/billing.js';
import { dashboardRouter } from './routers/dashboard.js';

export const appRouter = t.router({
  user: userRouter,
  workspace: workspaceRouter,
  analysis: analysisRouter,
  issue: issueRouter,
  fix: fixRouter,
  team: teamRouter,
  billing: billingRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
