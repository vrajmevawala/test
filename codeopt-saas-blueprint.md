# CodeOpt — AI Code Optimizer SaaS Platform
### Complete Build Blueprint · Phase 1 & 2 · v1.0

> A production-grade SaaS platform that leverages large language models to analyze, refactor, and optimize code across multiple programming languages — with real-time feedback, team collaboration, and CI/CD integration.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Core Features](#4-core-features)
5. [Data Flow — Request Lifecycle](#5-data-flow--request-lifecycle)
6. [AI Engine Design](#6-ai-engine-design)
7. [Security Architecture](#7-security-architecture)
8. [Monetization Model](#8-monetization-model)
9. [Deployment Strategy](#9-deployment-strategy)
10. [Frontend Architecture](#10-frontend-architecture)
11. [UI/UX Design System](#11-uiux-design-system)
12. [Page Specifications](#12-page-specifications)
13. [Scalable Project Structure](#13-scalable-project-structure)
14. [Frontend Prompt (Antigravity)](#14-frontend-prompt-antigravity)
15. [Product Roadmap](#15-product-roadmap)

---

## 1. Platform Overview

### Vision

CodeOpt turns every developer into a senior engineer reviewer. It catches what humans miss — O(n²) loops, SQL injections, exposed secrets, dead code — and fixes them automatically with AI-generated, diff-previewed patches.

### Target Users

| Segment | Pain Point | Value |
|---|---|---|
| Solo developers | No reviewer, slow PR cycles | 24/7 AI review |
| Dev teams (5–50) | Inconsistent code quality | Shared standards + team scores |
| OSS maintainers | Unreviewed PRs pile up | Automated PR comments |
| Enterprise | Security audits, compliance | SOC 2, SAML, self-hosted |

### Key Metrics (Go-to-Market)

- **Activation**: Free tier — 500 credits/month, no credit card
- **Growth lever**: Product-Led Growth — free tier drives viral adoption via GitHub App PR comments
- **Revenue model**: Freemium → Pro ($19/mo) → Team ($49/seat/mo) → Enterprise (custom)
- **Target CAC/LTV**: CAC < $40 (PLG), LTV > $800 (Team plan, avg 18 months)

---

## 2. System Architecture

### Architecture Diagram (Layered)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│   Next.js Web App │ VS Code Extension │ CLI Tool │ GitHub App   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│                    EDGE / GATEWAY LAYER                         │
│   Cloudflare Workers │ Kong API Gateway │ Rate Limiter │ Auth   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Internal mTLS
┌───────────────────────────▼─────────────────────────────────────┐
│                      CORE SERVICES                              │
│  Code Analysis Service │ AI Orchestration │ User/Team │ Billing │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                   AI & PROCESSING LAYER                         │
│  LLM Router (multi-model) │ AST Parser │ Vector Store │ BullMQ  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                        DATA LAYER                               │
│  PostgreSQL (primary) │ Redis Cache │ S3 Blob │ Pinecone Vectors │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

**Client Layer** — All user-facing surfaces. Next.js web app is the primary interface. VS Code extension provides live hints in-editor. CLI enables scripting and CI integration. GitHub App posts analysis as PR comments automatically.

**Edge / Gateway** — Cloudflare Workers handle DDoS, CDN, and edge caching. Kong manages API routing, versioning, and plugin middleware. Rate limiting enforced per API key and IP. Auth middleware validates JWTs before traffic reaches core services.

**Core Services** — Four independently deployable microservices. Code Analysis Service owns the analysis pipeline. AI Orchestration manages LLM calls and prompt assembly. User/Team Service handles identity, teams, RBAC. Billing Service integrates Stripe + Lago for metered billing.

**AI & Processing** — LiteLLM routes to the optimal model per request. tree-sitter parses code into AST before any LLM call. Pinecone stores code embeddings for semantic search (RAG context). BullMQ manages async job queues for long-running analyses.

**Data Layer** — PostgreSQL is the source of truth for structured data. Redis handles caching, pub/sub, and queue backing. S3 stores code blobs, diffs, and generated reports. Pinecone indexes code embeddings per workspace.

---

## 3. Tech Stack

### Frontend

| Technology | Version | Why |
|---|---|---|
| Next.js | 15 | App Router, React Server Components, streaming UI |
| TypeScript | 5.x | Type safety end-to-end — catches bugs at compile time |
| TailwindCSS | 4.x | Utility-first, fast iteration, consistent design tokens |
| shadcn/ui | latest | High-quality accessible components, fully customizable |
| Monaco Editor | latest | VS Code-grade editor in browser — syntax highlighting, IntelliSense |
| Zustand | 5.x | Lightweight global state — avoids Context hell |
| TanStack Query | 5.x | Server state, caching, optimistic updates, SSE streaming |
| Framer Motion | latest | Production-quality animations and page transitions |

### Backend

| Technology | Version | Why |
|---|---|---|
| Node.js + Fastify | 22 LTS | High-throughput REST API — 2× faster than Express |
| tRPC | 11 | End-to-end type-safe RPC — no REST boilerplate |
| Drizzle ORM | latest | Type-safe SQL, zero-overhead, fast schema migrations |
| BullMQ | latest | Distributed job queues on Redis — retry, backpressure, delay |
| Zod | 3.x | Runtime schema validation — shared between client and server |
| Vitest | latest | Fast unit + integration testing, native ESM support |
| Pino | latest | Structured JSON logging — compatible with Grafana Loki |

### AI / ML

| Technology | Purpose |
|---|---|
| LangChain.js | LLM chain orchestration, prompt templating, output parsers |
| OpenAI GPT-4o | Primary model — fast, excellent at code reasoning |
| Anthropic Claude 3.5 Sonnet | Long-context analysis — 200k token window for large files |
| Google Gemini 1.5 Pro | Fallback model — cost efficiency for free tier |
| tree-sitter | Multi-language AST parsing — not text analysis, structural |
| text-embedding-3-large | Code embedding for RAG — semantic similarity search |
| Pinecone | Managed vector store — fast ANN search at scale |
| LiteLLM | Model routing proxy — cost tracking, fallback chains |

### Infrastructure

| Technology | Purpose |
|---|---|
| AWS EKS / Fargate | Container orchestration — auto-scaling worker pools |
| PostgreSQL (RDS) | Primary relational store — Multi-AZ for HA |
| Redis (ElastiCache) | Cache + pub/sub + BullMQ backing store |
| S3 + CloudFront | Code blobs, reports, static assets — egress optimized |
| Terraform | Infrastructure as Code — reproducible, version-controlled |
| GitHub Actions | CI/CD — lint, test, build, deploy on every push |
| ArgoCD | GitOps-based K8s deployments — declarative, auditable |
| Datadog / OpenTelemetry | Distributed tracing, APM, custom metrics |

### Auth & Billing

| Technology | Purpose |
|---|---|
| Clerk | Authentication — SSO, OAuth, SAML, MFA out of the box |
| Stripe | Subscriptions, payment processing, invoice management |
| Lago | Open-source usage-based billing — metered credits |
| Resend | Transactional emails — welcome, alerts, digests |
| LaunchDarkly | Feature flags — progressive rollouts per plan tier |

---

## 4. Core Features

### 4.1 Code Intelligence Engine

- **Multi-language support**: JavaScript, TypeScript, Python, Go, Rust, Java, C++ — all via tree-sitter AST
- **AST-level analysis**: Structural understanding, not just regex/text matching
- **Complexity scoring**: Cyclomatic complexity, cognitive complexity, nesting depth
- **Dead code detection**: Unused imports, unreachable blocks, orphaned exports
- **Dependency analysis**: Circular imports, version conflicts, deprecated package usage

### 4.2 Security Scanning

- SQL injection detection (including template literal patterns)
- Hardcoded secrets and API keys (regex + entropy analysis)
- Data exposure in API responses (PII, hashes, internal IDs)
- OWASP Top 10 vulnerability patterns
- Path traversal, command injection, XSS vectors
- Insecure deserialization patterns

### 4.3 Performance Analysis

- O(n²) and worse nested loop detection
- N+1 database query patterns
- Memory leak indicators (unclosed streams, retained references)
- Synchronous blocking calls in async contexts
- Inefficient array operations (find vs Map, filter+map chains)
- Bundle size impact estimation for frontend code

### 4.4 AI-Powered Fixes

- One-click refactor suggestions with full diff preview
- Accept / Reject / Modify workflow — never blind auto-apply
- Context-aware rename and extract function suggestions
- Algorithmic optimization (e.g., O(n²) → O(n) with HashMap)
- Idiomatic rewrites per language best practices
- Auto-generated unit tests for uncovered code paths
- JSDoc / docstring generation from function signatures

### 4.5 Team Collaboration

- Team workspaces with Owner / Admin / Developer / Viewer RBAC
- Async AI code review — inline comments on any line
- GitHub / GitLab App — automatic PR-level analysis and comments
- Shared custom rule sets per organization
- Review history and full audit trail
- Slack / Discord notifications for critical issues

### 4.6 Developer Experience

- **VS Code Extension**: Live squiggles, hover cards, inline fix suggestions
- **CLI tool**: `codeopt analyze ./src` — exit code based on severity for CI gates
- **REST + WebSocket API**: Full programmatic access
- **Webhook events**: `analysis.complete`, `issue.critical` for automation
- **Custom rule engine**: YAML-based rule configuration per repo or org
- **Export formats**: PDF report, JSON data, SARIF (GitHub Security tab compatible)

---

## 5. Data Flow — Request Lifecycle

### Step 1: Code Submission

User submits code via Web UI (paste/upload), VS Code extension (save hook), CLI (`codeopt analyze`), or GitHub App (PR webhook). The request hits Cloudflare Workers for edge validation, then Kong for rate limiting and auth token verification. A job ID is returned immediately — the response is async.

```
POST /api/v1/analyze
{
  "code": "...",
  "filename": "utils/dataProcessor.ts",
  "language": "typescript",
  "workspaceId": "ws_abc123"
}
→ 202 Accepted { "jobId": "job_xyz789" }
```

### Step 2: AST Parsing

The Code Analysis Service receives the job from BullMQ. tree-sitter parses the code into a language-specific AST in a Worker Thread (non-blocking). Structural metadata is extracted: function names, class hierarchy, import graph, call graph, variable scopes. This metadata is stored in Redis for the duration of the job and used to build the LLM context.

### Step 3: Context Enrichment (RAG)

The code chunk is embedded via `text-embedding-3-large`. Pinecone similarity search finds the top-K most semantically similar functions from the user's codebase history. Retrieved snippets, plus the AST metadata, are assembled into a rich context window that grounds the LLM in the user's specific codebase patterns — not generic advice.

### Step 4: LLM Orchestration

LiteLLM selects the optimal model based on: estimated token count, user plan tier, and current model latency/availability. LangChain assembles the final prompt from: system instructions (language, severity levels, output format), RAG context, AST summary, and the raw code. Structured JSON output is enforced via OpenAI function calling / Anthropic tool use.

```
Model routing:
  tokens < 8k + Pro plan  → GPT-4o
  tokens > 8k             → Claude 3.5 Sonnet
  Free tier               → Gemini 1.5 Flash
  Any model unavailable   → fallback chain via LiteLLM
```

### Step 5: Diff Generation

AI suggestions are parsed from the structured JSON response. Each suggestion generates a unified diff against the original code using the `diff` library. Diffs are stored in S3. Issue metadata (type, severity, line/column, rule ID, fixable flag) is indexed in PostgreSQL. Token usage is recorded in Lago for metered billing.

### Step 6: Streaming Response

Results are streamed back to the client via Server-Sent Events (SSE). The UI renders issues and diffs progressively as they arrive — users see the first issue within ~1 second. WebSocket channel notifies any open VS Code extension sessions. Webhook events fire for CI/CD integrations.

---

## 6. AI Engine Design

### Multi-Model Router

LiteLLM acts as a unified proxy over all LLM providers. Routing logic considers: code token length (short → GPT-4o for speed, long → Claude 3.5 for 200k context), user plan tier (free users → cheaper models), and real-time model health (automatic fallback on API errors or rate limits). All LLM spend is tracked per workspace for cost attribution and billing.

### Prompt Architecture

**System prompt** encodes: target programming language, style guide preferences (e.g., Google style for Python, Airbnb for JS), severity level definitions, and JSON output schema with strict validation. This is largely static and cached.

**User prompt** is assembled dynamically per request: AST summary (function signatures, complexity scores), top-K RAG examples from Pinecone (similar code from the same codebase), and the actual code chunk. Total context is kept under the model's window limit via a sliding chunker for large files.

**Structured output** is enforced via function calling / tool use, producing a validated JSON object with: array of issues (each with line, column, severity, rule, message, fixable flag), suggested fixes (each with diff, explanation, confidence score), and summary metrics.

### RAG Pipeline

On first codebase upload or repository sync, every function and class is chunked, embedded via `text-embedding-3-large`, and stored in Pinecone with workspace-scoped metadata. At analysis time, the current code chunk is embedded and a top-K ANN search retrieves the most semantically similar examples from the user's own codebase. This means the AI understands the user's naming conventions, patterns, and architecture — not just generic best practices.

### Evaluation & Fine-tuning Loop

Every AI suggestion can be accepted, rejected, or rated with thumbs up/down. This feedback is stored as RLHF signal — accepted fixes are positive examples, rejected fixes are negative. Monthly fine-tuning runs on aggregated (and PII-scrubbed) accepted suggestions improve model quality per language and domain over time. Models are versioned and A/B tested before promotion to production.

### Safety Layer

Code is never used for model training without explicit opt-in (default off). Before any code is sent to an external LLM API, a secrets scanner (regex + Shannon entropy analysis) runs to detect and redact API keys, tokens, and passwords. All LLM calls are logged with input hashes (not raw code) for audit purposes. Outputs are validated against a JSON schema before being sent to the user.

---

## 7. Security Architecture

### Data Isolation

- PostgreSQL Row-Level Security (RLS) scopes all queries to the authenticated workspace
- Separate S3 prefixes per organization with bucket policy isolation
- Encryption at rest: AES-256 for database, S3 Server-Side Encryption
- Encryption in transit: TLS 1.3 enforced at Cloudflare and all internal service communication
- Code retention configurable per workspace: 7 days / 30 days / 90 days / never store

### Authentication & Authorization

- OIDC/OAuth2 (GitHub, Google) for standard users via Clerk
- SAML 2.0 for Enterprise SSO (Okta, Azure AD, Google Workspace)
- JWTs are short-lived (15-minute expiry) with refresh token rotation
- RBAC: Owner → Admin → Developer → Viewer (all scoped to workspace)
- API keys are workspace-scoped, rate-limited, and can be revoked instantly
- All auth events are logged with IP, user-agent, and timestamp

### Network Security

- Cloudflare WAF + DDoS protection at edge — all traffic filtered before hitting origin
- All core services run in a private VPC — no public internet exposure
- mTLS between internal microservices — services authenticate each other
- Secrets managed via AWS Secrets Manager — never in environment variables or code
- IP allowlist available for Enterprise plans

### Compliance Roadmap

| Milestone | Target |
|---|---|
| SOC 2 Type I | Month 9 |
| SOC 2 Type II | Month 18 |
| GDPR compliance | Launch |
| CCPA compliance | Launch |
| ISO 27001 | Year 2 |

---

## 8. Monetization Model

### Pricing Tiers

| Plan | Price | Credits | Key Limits |
|---|---|---|---|
| **Free** | $0/month | 500/month | Web UI only, 1 workspace, 7-day history |
| **Pro** | $19/month | 10,000/month | VS Code + CLI, GitHub App, 90-day history |
| **Team** | $49/seat/month | Unlimited | RBAC, custom rules, Slack, 1-year history |
| **Enterprise** | Custom | Unlimited | Self-hosted, SAML SSO, SLA, SOC 2 |

### Credit System

One credit = one AI analysis of a code chunk (~500 tokens). Complex operations consume multiple credits: full-file analysis (~4 credits), test generation (~6 credits), architectural review (~20 credits). Credits are tracked via Lago and metered in Stripe. Overages on Pro: $0.002 per credit.

### Growth Levers

- Annual billing: 20% discount on Pro and Team
- OSS projects: Free Team plan (application-based approval)
- Referral program: 1,000 bonus credits per referred user who upgrades
- GitHub App installs are a top-of-funnel acquisition channel — free analysis on PR drives sign-ups

---

## 9. Deployment Strategy

### Phase 1 — MVP (Week 1–6)

**Goal**: Functional product with paying customers.

1. Monorepo setup with Turborepo and pnpm workspaces
2. Next.js app + Fastify API in Docker Compose for local development
3. PostgreSQL + Redis via Docker locally
4. CI: GitHub Actions pipeline — lint → typecheck → vitest → Docker build
5. Deploy to Railway (API) + Vercel (frontend) for staging
6. Stripe checkout integrated — Pro plan purchasable from day 1
7. Clerk auth with GitHub OAuth
8. Basic GPT-4o analysis with Monaco editor UI

### Phase 2 — Scale (Week 7–14)

**Goal**: Production-grade infrastructure for growth.

1. Migrate API to AWS EKS with Helm charts
2. RDS PostgreSQL Multi-AZ + ElastiCache Redis cluster
3. Cloudflare CDN for all static assets and API edge caching
4. BullMQ workers on AWS Fargate — auto-scales with queue depth
5. Terraform IaC for all AWS resources — reproducible environments
6. Blue/green deployments via ArgoCD — zero-downtime releases
7. Full observability: Datadog APM + OpenTelemetry distributed tracing
8. VS Code extension published to marketplace
9. GitHub App published and listed in GitHub Marketplace

### CI/CD Pipeline

```
Push to feature branch
  → GitHub Actions: pnpm lint + tsc --noEmit + vitest
  
Merge to main
  → Docker build → push to Amazon ECR
  → ArgoCD detects new image tag
  → Rolling deploy to staging (EKS)
  → Playwright E2E tests against staging
  
Promote to production
  → Canary: 5% traffic to new version
  → Auto-promote to 25% if error rate < 0.1%
  → Auto-promote to 100% after 30 min
  → Automatic rollback if p99 latency spikes > 20%
```

### Phase 3 — Enterprise (Month 4+)

- Self-hosted Helm chart deployable on customer's Kubernetes
- Multi-region: US-East-1, EU-West-1, AP-Southeast-1
- AWS PrivateLink / VPC peering for Enterprise data isolation
- Cross-region RDS read replicas for disaster recovery
- SOC 2 audit preparation with Vanta
- PagerDuty SLA monitoring — 99.9% uptime guarantee

---

## 10. Frontend Architecture

### Design Philosophy

The CodeOpt frontend is built with a **VS Code / GitHub DNA** — it should feel instantly familiar to any developer. The aesthetic is dark, dense, precise, and utilitarian. Every pixel has a purpose. No decorative gradients, no rounded hero blobs, no marketing-site softness inside the app shell.

### Color Palette

```
Background    #0d1117    GitHub dark background
Surface       #161b22    GitHub card/sidebar background
Surface-2     #21262d    Hover states, inputs
Surface-3     #30363d    Active states, borders
Border        #30363d    All borders
Text          #e6edf3    Primary text
Text-mid      #8b949e    Secondary text, labels
Text-dim      #484f58    Placeholders, disabled
Accent        #f0883e    Orange — primary CTA, active states
Green         #3fb950    Success, fixed issues, positive delta
Red           #ff7b72    Errors, critical issues, danger
Yellow        #e3b341    Warnings, partial states
Info          #79c0ff    Info, links, TypeScript types
```

> **Why no blue or purple?** These are the most overused colors in AI tool UIs. Orange as a primary accent is unexpected, warm, and creates strong contrast on GitHub dark — it reads as "action" without feeling generic.

### Typography

```
UI Font:   Geist (Vercel's typeface) — geometric, technical, clean
Mono Font: JetBrains Mono — the de-facto standard for code, excellent readability
```

Both fonts are loaded from Google Fonts with `font-display: swap`. JetBrains Mono is used for: all code display, line numbers, file names, badges, scores, metrics, status bar, and terminal output. Geist is used for all UI labels, descriptions, navigation, and buttons.

### Component Architecture

The component system follows a strict three-tier hierarchy:

**Tier 1 — Primitives** (`/components/ui/`): Badge, Button, Toggle, Avatar, Spinner, ScoreRing, Input, Select. These have zero business logic, accept only props, and are fully typed. They use CSS variables only — no hardcoded colors.

**Tier 2 — Domain Components** (`/components/editor/`, `/components/panels/`): CodeEditor, EditorTabs, IssueList, DiffView, MetricsPanel, ActivityFeed, HistoryTable. These know about domain types (Issue, Analysis, File) but do not fetch data.

**Tier 3 — Page Components** (`/components/pages/`): DashboardPage, AnalyzePage, HistoryPage, etc. These compose Tier 1 and Tier 2 components, own data fetching via TanStack Query hooks, and handle page-level state via Zustand slices.

---

## 11. UI/UX Design System

### Spacing Scale

```
4px  — micro gaps (icon to label)
8px  — compact gaps (badge padding)
12px — standard gaps (form fields)
16px — section padding
20px — card padding
24px — section margins
32px — page section gaps
48px — page top padding
```

### Layout System

The app shell is a fixed three-zone layout:

```
┌─────────────┬──────────────────────────┐
│             │ Topbar (48px)            │
│  Sidebar    ├──────────────────────────┤
│  (220px)    │ Page Content             │
│             │ (flex: 1, overflow auto) │
│             ├──────────────────────────┤
│             │ Status Bar (22px)        │
└─────────────┴──────────────────────────┘
```

The Analyze page uses a split layout: Editor (flex: 1) + Analysis Panel (360px fixed). The status bar is always visible — it mirrors VS Code's information density.

### Status Bar

A VS Code-style status bar runs along the bottom of the entire app shell. It uses the orange accent as its background, displaying: active branch, current file, issue count, language mode, encoding, cursor position, and app version. This is both decorative (it roots the app in developer culture) and functional (always-visible context).

### Animation Principles

- Page transitions: `fadeIn` (opacity + translateY, 250ms ease) — subtle, never distracting
- Scan overlay during analysis: horizontal gradient sweep animation across the editor
- Score rings: CSS stroke-dasharray transition on mount (600ms ease)
- Progress bars: CSS width transition (400ms ease)
- Issue panel expansion: max-height transition for accordion-style detail panels
- Terminal on landing: typewriter effect — one line per 260ms interval

### Interactive States

Every interactive element has four clearly distinct states: default, hover, active/pressed, and disabled. Color shifts use `filter: brightness()` for hover — avoids maintaining duplicate color values. Press uses `transform: scale(0.97)` — tactile micro-feedback.

---

## 12. Page Specifications

### Landing Page

**Layout**: Two-column hero (text left, terminal right), feature grid (3×2), pricing row (4 columns), sticky header.

**Hero terminal**: An animated typewriter showing a real `codeopt analyze` session — demonstrates the product without requiring sign-up. Lines appear one at a time at 260ms intervals. Shows errors, warnings, auto-fix prompt, and final score improvement (41 → 94).

**Feature grid**: 6 cards with icon + title + description. Icons use colored backgrounds at 10% opacity with matching border — avoids solid icon backgrounds that look like stickers.

**Pricing**: 4-column grid. Pro card has `box-shadow: 0 0 0 1px var(--accent)` — a subtle glow that draws attention without being garish. "Most Popular" badge uses the accent color with dark text.

### Auth Page

**Layout**: Centered card on dark background. Card has header, body, and footer zones separated by borders.

**Social login first**: GitHub and Google are above the email form. Most developers will use GitHub — this is the happy path.

**Sign in / Register**: Toggled without navigation — avoids full page reload. Loading state shows spinner inside the button, button text changes to "Signing in…"

### Dashboard Page

**Layout**: 4-column stats row → 3-column chart/breakdown/score row → 2-column activity/recent files row.

**Stat cards**: Each has a subtle glow (matching accent color, blurred, low opacity) positioned top-right. This adds depth without adding visual weight. Values use JetBrains Mono — they read as data, not marketing.

**Bar chart**: Hand-built with CSS flexbox — no chart library overhead for a simple weekly bars visualization. Hover brightens bar via `filter: brightness()`.

**Score ring**: SVG-based. Single circle with stroke-dasharray driven by score percentage. Color changes from red → yellow → green based on score threshold.

### Analyze Page

**Layout**: Full-height split — Editor left, Analysis Panel right (360px).

**Editor tabs**: Identical to VS Code tabs. Active tab has an orange bottom border and full-opacity background. Modified files show an orange dot.

**Line numbers**: Left gutter shows line numbers in dim color. Numbers align right, fixed width.

**Syntax highlighting**: Custom tokenizer applies CSS classes to code tokens. No runtime tokenizer library — a curated regex pass over lines handles: keywords, strings, numbers, function calls, types, comments. Performance-optimized for large files.

**Analysis panel tabs**: Issues / Diff / Metrics. Issues shows a severity summary bar (errors / warnings / info counts + auto-fixable count). Each issue expands on click to show AI explanation and Apply Fix button. Diff shows a colored unified diff with + / - prefix characters. Metrics shows a 2×3 grid of key scores plus per-function complexity bars.

**Scanning animation**: A horizontal gradient overlay sweeps across the editor during analysis. A progress bar appears below the tab row. Both disappear when analysis completes.

### History Page

**Layout**: Topbar with search input and export button → full-width table card → pagination row.

**Table**: All columns sortable (not implemented in prototype, but structure supports it). Score shown as a small ScoreRing (32px) for visual scanning. Status shown with a colored dot + text label. File icon column uses monospace language abbreviation colored per language.

### Team Page

**Layout**: Two-column — member table (wider) and plan usage sidebar.

**Member table**: Includes Avatar component (colored circle with initials), role badge, analysis count, average score, status badge, and action menu. Status badges use green for active, yellow for invited.

### Billing Page

**Layout**: Current plan banner → plan comparison grid → (future) invoice history.

**Current plan banner**: Uses accent-colored left border. Shows billing date, credit usage, and monthly cost in a single horizontal row. Cancel plan button is danger-styled.

**Plan grid**: 4 columns. Popular card is visually differentiated with an accent-colored border and badge. Current plan button shows a checkmark and is non-interactive.

### Settings Page

**Layout**: Single-column form, max-width 680px for readability. Divided into logical sections: Analysis, Notifications, Integrations, Privacy.

**Toggle component**: Custom CSS toggle (not a checkbox). Smooth thumb transition with 200ms ease. Orange when on, surface-3 when off.

**Integration rows**: Each shows a 32px icon box, name, description, and a Connect / Connected button. Connected state uses the secondary button style with a checkmark.

---

## 13. Scalable Project Structure

### Monorepo Layout

```
codeopt/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   ├── api/                    # Fastify backend API
│   ├── worker/                 # BullMQ job processors
│   └── cli/                    # Node.js CLI tool
├── packages/
│   ├── ui/                     # Shared component library
│   ├── types/                  # Shared TypeScript types
│   ├── config/                 # ESLint, TSConfig, Tailwind presets
│   └── utils/                  # Shared utilities (tokenizer, diff, etc.)
├── infra/
│   ├── terraform/              # AWS IaC
│   └── k8s/                    # Kubernetes manifests + Helm charts
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Frontend App Structure (`apps/web/src/`)

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          # App shell (Sidebar + Topbar + StatusBar)
│   │   ├── dashboard/page.tsx
│   │   ├── analyze/page.tsx
│   │   ├── history/page.tsx
│   │   ├── team/page.tsx
│   │   ├── billing/page.tsx
│   │   └── settings/page.tsx
│   ├── (landing)/
│   │   └── page.tsx            # Marketing landing page
│   ├── layout.tsx              # Root layout (fonts, providers)
│   └── globals.css             # CSS variables + reset
│
├── components/
│   ├── ui/                     # Tier 1: Primitive components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── toggle.tsx
│   │   ├── avatar.tsx
│   │   ├── spinner.tsx
│   │   ├── score-ring.tsx
│   │   ├── progress.tsx
│   │   ├── tooltip.tsx
│   │   ├── segment-control.tsx
│   │   └── index.ts
│   │
│   ├── layout/                 # Shell components
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   ├── status-bar.tsx
│   │   └── app-shell.tsx
│   │
│   ├── editor/                 # Code editor components
│   │   ├── code-editor.tsx     # Main Monaco wrapper
│   │   ├── editor-tabs.tsx
│   │   ├── line-numbers.tsx
│   │   ├── scan-overlay.tsx
│   │   └── syntax-tokenizer.ts
│   │
│   ├── panels/                 # Analysis panel components
│   │   ├── analysis-panel.tsx
│   │   ├── issue-list.tsx
│   │   ├── issue-item.tsx
│   │   ├── diff-view.tsx
│   │   ├── metrics-panel.tsx
│   │   └── complexity-chart.tsx
│   │
│   ├── dashboard/              # Dashboard-specific components
│   │   ├── stat-card.tsx
│   │   ├── bar-chart.tsx
│   │   ├── activity-feed.tsx
│   │   └── issue-breakdown.tsx
│   │
│   ├── landing/                # Landing page components
│   │   ├── hero-terminal.tsx
│   │   ├── feature-grid.tsx
│   │   └── pricing-grid.tsx
│   │
│   └── auth/                   # Auth components
│       ├── auth-card.tsx
│       └── social-button.tsx
│
├── hooks/                      # Custom React hooks
│   ├── use-analysis.ts         # TanStack Query for analysis API
│   ├── use-stream.ts           # SSE streaming hook
│   ├── use-workspace.ts
│   └── use-theme.ts
│
├── stores/                     # Zustand state slices
│   ├── editor.store.ts         # Active file, tabs, cursor position
│   ├── analysis.store.ts       # Current analysis, issues, diffs
│   ├── workspace.store.ts      # Active workspace, files
│   └── ui.store.ts             # Sidebar collapsed, panel widths
│
├── lib/                        # Non-component utilities
│   ├── api.ts                  # tRPC client configuration
│   ├── auth.ts                 # Clerk helpers
│   ├── tokenizer.ts            # Syntax highlighting logic
│   ├── diff.ts                 # Diff parsing and rendering
│   ├── score.ts                # Score color/grade utilities
│   └── constants.ts            # Severity levels, file type icons
│
└── types/                      # Frontend-specific types
    ├── analysis.ts
    ├── issue.ts
    ├── workspace.ts
    └── user.ts
```

### Naming Conventions

| Pattern | Convention | Example |
|---|---|---|
| Components | PascalCase | `IssueItem.tsx` |
| Hooks | camelCase with `use` prefix | `useAnalysis.ts` |
| Stores | camelCase with `.store` suffix | `editor.store.ts` |
| Utilities | camelCase | `tokenizer.ts` |
| Types | PascalCase for types, camelCase for files | `type Issue` in `issue.ts` |
| CSS variables | kebab-case with `--` prefix | `--color-accent` |
| CSS classes | kebab-case | `issue-item`, `panel-body` |

### State Management Strategy

```
TanStack Query     — all server data (analyses, issues, history, team)
Zustand            — client-only UI state (editor tabs, panel sizes, active issue)
URL state          — navigation, filters, selected file (useSearchParams)
Form state         — React state (settings toggles, auth inputs)
```

No Context API for data — all server state through TanStack Query. Context is only used for theme and auth session (provided by Clerk).

---

## 14. Frontend Prompt (Antigravity)

> This is the complete, production-ready prompt for any AI code generator or frontend developer to implement the CodeOpt UI from scratch. It is precise, opinionated, and complete.

---

### System Context

You are a senior UI/UX designer and frontend developer with 10+ years of experience building developer tools. You have shipped production frontends for GitHub, VS Code extensions, and SaaS platforms used by engineering teams. Your aesthetic instincts are precise and utilitarian — you build interfaces that feel like tools, not marketing sites.

### Project Brief

Build the complete frontend for **CodeOpt**, an AI-powered code optimization SaaS platform. The product is a code analyzer and auto-fixer — it detects performance issues, security vulnerabilities, and complexity problems in code, and generates AI-powered fixes.

### Aesthetic Direction

**Mandatory design language**: GitHub Dark + VS Code aesthetic. Every decision must reinforce that this is a developer tool built by developers for developers.

**Color palette** — use exclusively these values:
```
--bg:         #0d1117   (GitHub dark background)
--surface:    #161b22   (sidebar, cards, panels)
--surface-2:  #21262d   (inputs, hover states)
--surface-3:  #30363d   (active states, borders)
--border:     #30363d
--text:       #e6edf3   (primary text)
--text-mid:   #8b949e   (secondary, labels)
--text-dim:   #484f58   (placeholders, disabled)
--accent:     #f0883e   (orange — ALL primary actions, active nav items, CTAs)
--green:      #3fb950   (success, fixed issues, positive)
--red:        #ff7b72   (errors, critical issues, danger actions)
--yellow:     #e3b341   (warnings, partial states)
--info:       #79c0ff   (informational, TypeScript syntax color)
```

**Do not use any blue, purple, or indigo.** These are the most overused colors in AI tool interfaces. Orange on GitHub dark is the differentiating choice.

**Typography**:
- UI: `Geist` from Google Fonts — clean, geometric, technical
- Code: `JetBrains Mono` from Google Fonts — all code, metrics, badges, status bar
- Never use Inter, Roboto, Arial, or system-ui

### Stack Requirements

- React with hooks — no class components
- CSS-in-JS via a `<style>` tag with CSS custom properties — single file artifact
- No external UI libraries — build all components from scratch
- No Tailwind in the artifact — pure CSS classes
- Monaco Editor for code display — simulate with a `<pre>` and syntax-highlighted HTML if Monaco isn't available
- All state via `useState` and `useEffect` — no Redux or Context

### Pages to Build

Build all pages as a single React application with client-side routing (state-based, not URL-based). Include a navigation function that switches between views.

#### 1. Landing Page
- Sticky header: logo, nav links (Features, Pricing, Docs), Sign In + Start Free CTA buttons
- Two-column hero: left column has tag pill, H1, description, two CTA buttons, three stat numbers; right column has an animated terminal window showing a real codeopt CLI session using a typewriter effect (one line per 260ms)
- Features section: 3×2 grid of cards, each with colored icon box, title, description
- Pricing section: 4-column grid with Free / Pro / Team / Enterprise tiers
- Footer bar that is the same as the status bar

#### 2. Auth Page (Sign In / Register)
- Centered card, 420px wide
- Card has three zones: header (logo + title), body (social buttons + email form), footer (toggle between sign in and register)
- Social buttons for GitHub and Google come first
- OR divider between social and email form
- Email + password fields
- Submit button with loading spinner state
- Toggle between sign in and register without page reload

#### 3. App Shell
- Fixed sidebar (220px) with: logo, navigation items with icons, workspace file tree, user profile at bottom
- Main content area: topbar (48px) + page content + VS Code-style status bar (22px, orange background)
- Status bar shows: branch name, current file, issue count, language, encoding, cursor position, version

#### 4. Dashboard Page
- Four stat cards in a row: Files Analyzed, Issues Found, Issues Fixed, Avg Score — each with a glow effect, JetBrains Mono value, delta with trend arrow
- Second row: Weekly bar chart + Issue breakdown (horizontal bars per category) + Quality score (SVG ring chart)
- Third row: Activity feed + Recent files table

#### 5. Analyze Page (split layout, full height)
- Editor area (left): VS Code-style file tabs, line numbers gutter, syntax-highlighted code with colored tokens
- Analysis panel (right, 360px): Score ring in header, three tabs (Issues / Diff / Metrics)
- Issues tab: severity summary bar, list of issues with expand-on-click showing AI explanation and Apply Fix button
- Diff tab: unified diff with green/red line backgrounds and +/- prefix characters
- Metrics tab: 2×3 grid of complexity scores, per-function complexity bars
- Scanning animation: horizontal gradient sweep + progress bar during analysis

#### 6. History Page
- Search input in topbar
- Full-width table: file name with language icon, score (small ring), issues count, fixed count, date, status (dot + text), action buttons
- Pagination row

#### 7. Team Page
- Two-column layout: member table (left) + plan usage sidebar (right)
- Member table: avatar with initials, name/email, role badge, analyses, avg score, status badge
- Plan usage sidebar: progress bars for seats and credits, invite link with copy button

#### 8. Billing Page
- Current plan banner with accent border
- 4-column pricing grid — Pro card highlighted with accent glow

#### 9. Settings Page
- Max-width 680px form layout
- Sections: Analysis, Notifications, Integrations, Privacy
- Toggle switches, select dropdowns, integration connection buttons

### Component Specifications

**Sidebar navigation items**: 220px wide, 36px tall, 2px left border accent for active state, icon + label + optional count badge.

**Buttons**: Four variants — primary (orange bg, dark text), secondary (surface-2 bg, border), ghost (transparent, text-mid color), danger (red-dim bg, red text). Three sizes — sm (28px height), default (32px), lg (38px). All have `transform: scale(0.97)` on active.

**Badges**: Pill shape (20px border-radius), 5 color variants (green/red/yellow/info/accent/dim), JetBrains Mono font, 11px size.

**Toggle**: 36×20px custom CSS toggle, orange when on, smooth 200ms transition.

**ScoreRing**: SVG circle with stroke-dasharray percentage, color based on score threshold (red < 60, yellow 60–79, green ≥ 80).

**CodeEditor**: Simulated Monaco with line numbers gutter (fixed width, right-aligned, dim color), code body (pre + syntax HTML), current line highlight.

**Syntax tokenizer**: Apply CSS classes to code: `.tok-kw` (red, keywords), `.tok-fn` (light purple, function names), `.tok-str` (light blue, strings), `.tok-num` (info blue, numbers), `.tok-cmt` (gray italic, comments), `.tok-type` (orange, PascalCase types).

### Dummy Data to Include

Use these realistic examples throughout the UI:

```javascript
// Files being analyzed
"utils/dataProcessor.ts"  — 9 issues, score 72
"api/userController.js"   — 4 issues (critical), score 41

// Sample issues (from dataProcessor.ts)
{ line: 8,  severity: "error",   msg: "O(n²) nested loop — quadratic complexity detected",    rule: "complexity/nested-loops",  fixable: true  }
{ line: 25, severity: "warning", msg: "Cognitive complexity exceeds threshold (12/10)",        rule: "complexity/max-depth",     fixable: true  }
{ line: 33, severity: "warning", msg: "Magic numbers — extract to named constants",            rule: "style/magic-numbers",      fixable: true  }

// Sample issues (from userController.js)
{ line: 10, severity: "error",   msg: "SQL injection — use parameterized queries",             rule: "security/sql-injection",   fixable: true  }
{ line: 23, severity: "error",   msg: "Password hash exposed in API response",                 rule: "security/data-leak",       fixable: true  }
{ line: 28, severity: "error",   msg: "N+1 query — 2 additional queries per user row",        rule: "performance/n+1-query",    fixable: true  }

// Dashboard stats
Files Analyzed: 247  Issues Found: 1,412  Issues Fixed: 1,103  Avg Score: 91

// Team members
Alex Kumar (Owner, active, 87 analyses, score 93)
Priya Shah (Admin, active, 62 analyses, score 88)
Jamie Lee (Developer, active, 41 analyses, score 76)
Marcus Chen (Developer, invited)
```

### Interaction Requirements

- Sidebar navigation switches between all 9 views — no page reload
- Landing page → Auth page → App shell as a linear onboarding flow (buttons trigger view transitions)
- On the Analyze page, clicking an issue in the panel scrolls to and highlights that line in the editor
- Clicking "Analyze" button triggers: button shows spinner, editor shows scan animation for 2.2 seconds, then results populate
- Issue items expand on click to show AI explanation + Apply Fix button
- Settings toggles animate state change
- Auth form submit shows loading state for 1.4 seconds then transitions to the app

### Quality Checklist

Before considering the implementation complete, verify:

- [ ] No purple, indigo, or bright blue anywhere in the UI
- [ ] JetBrains Mono used for all code, metrics, badges, status bar
- [ ] Geist used for all body text, navigation, buttons
- [ ] Every interactive element has hover, active, and disabled states
- [ ] Status bar is always visible at the bottom with orange background
- [ ] Sidebar has a 2px left orange border on the active nav item
- [ ] Score rings change color based on score value (red/yellow/green)
- [ ] Analyze page is full-height split — editor left, panel right — no scroll on the page itself
- [ ] All 9 pages are navigable
- [ ] Dummy data is realistic and consistent across all pages
- [ ] No Lorem Ipsum — all text is real and contextually accurate

---

## 15. Product Roadmap

### Q1 — Foundation (Months 1–3)

- Core web app with Monaco editor integration
- JavaScript and TypeScript analysis (GPT-4o)
- GitHub OAuth + Clerk authentication
- Free and Pro plan billing via Stripe
- VS Code extension (beta) — live issue squiggles
- GitHub App — automatic PR comment analysis
- Basic team workspaces (no RBAC yet)

### Q2 — Growth (Months 4–6)

- Python, Go, and Rust language support
- Team workspaces with full RBAC
- CLI tool — `codeopt analyze ./src`
- RAG-based context enrichment (Pinecone)
- Slack notification integration
- Usage analytics dashboard for teams
- Custom ignore rules per repository

### Q3 — Enterprise (Months 7–9)

- SAML 2.0 SSO (Okta, Azure AD, Google Workspace)
- Custom YAML rule engine
- Self-hosted deployment (Helm chart)
- Audit logs and compliance export
- RLHF feedback loop + first fine-tuning run
- Multi-model routing (GPT-4o + Claude 3.5 + Gemini)
- SOC 2 Type I audit initiated

### Q4 — Intelligence (Months 10–12)

- Codebase-wide refactor planning (not just file-by-file)
- Dependency vulnerability tracking with auto-PR
- AI test generation — full coverage for existing functions
- JetBrains plugin (IntelliJ / PyCharm / GoLand)
- API marketplace for custom analyzers
- SOC 2 Type II certification
- ISO 27001 audit initiated

---

## Appendix: Key Decision Rationale

**Why Fastify over Express?** Fastify is 2× faster throughput, has native TypeScript support, built-in JSON schema validation, and a superior plugin system. For an API that will handle thousands of concurrent analysis jobs, the performance headroom matters.

**Why tree-sitter over regex parsing?** tree-sitter builds a real AST — it understands function boundaries, scopes, and type hierarchies. Regex-based parsing misses nested structures and produces false positives. The AST is also the input to the complexity scorer, not just the LLM.

**Why BullMQ over SQS or Kafka?** BullMQ runs on Redis (which we already have), has a brilliant API for job priorities and delays, supports repeating jobs, and has a dashboard UI. For a startup, the operational simplicity vs. SQS or Kafka is a significant advantage until scale demands otherwise.

**Why LiteLLM over direct SDK calls?** LiteLLM abstracts all provider differences behind a single OpenAI-compatible interface. Switching from GPT-4o to Claude 3.5 is a one-line config change. It also tracks cost per call — critical for metered billing and unit economics modeling.

**Why Pinecone over pgvector?** pgvector is great for getting started, but Pinecone handles millions of vectors with sub-10ms ANN search at scale. Given that every code analysis does a RAG lookup against potentially millions of indexed functions, this is worth the operational cost over running vector search inside the primary DB.

**Why orange as the accent color?** Orange is the only warm, high-energy color that reads clearly on GitHub dark without looking like a link (blue) or an error (red). It is used by Rust lang, Gitpod, and Sentry — tools that developers associate with quality. It is unexpected enough to be memorable and consistent enough to feel designed.

---

*CodeOpt Platform Blueprint · Generated March 2026 · v1.0*
