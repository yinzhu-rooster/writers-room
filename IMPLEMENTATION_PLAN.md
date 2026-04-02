# Writers Room -- Implementation Plan

**Ref:** `WRITERS_ROOM_SPEC.md`

---

## Dependency Graph

```
Phase 0 (Scaffolding)
  └─> Phase 1 (DB Schema + Triggers)
       └─> Phase 2 (Auth)
            └─> Phase 3 (Prompts CRUD)
                 ├─> Phase 4 (Pitches)
                 │    └─> Phase 5 (Reactions)
                 │         └─> Phase 6 (Close Job + Results)
                 │              └─> Phase 7 (Stats + Leaderboard)
                 ├─> Phase 8 (Flagging)
                 └─> Phase 9 (AI Prompt Generation)
Phase 10 (Settings + Polish) -- after all phases
```

Phases 8 and 9 can run in parallel with Phases 5-7 since they're independent branches.

---

## Phase 0: Project Scaffolding

**Goal:** Empty but runnable project with all tooling configured.

**Build:**
- `create-next-app` with TypeScript, App Router, Tailwind CSS, ESLint
- `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`
- Dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk`, `zod`
- Dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test`
- Config files: `vitest.config.ts`, `playwright.config.ts`
- Supabase client factories: `src/lib/supabase/client.ts`, `server.ts`, `admin.ts`
- Type files: `src/types/database.ts` (placeholder), `src/types/enums.ts`
- Standard API error helper: `src/lib/api-error.ts` — `{ error: string, code?: string }` response shape used by all routes
- Directory structure: `src/app/`, `src/components/`, `src/lib/`, `src/hooks/`, `src/types/`, `supabase/migrations/`

**Acceptance criteria:**
- `npm run dev` starts, `npm run build` succeeds, `npm run test` runs (0 tests)
- TypeScript compiles cleanly

**Tests:** Smoke test file confirming vitest config works.

---

## Phase 1: Database Schema + Triggers

**Goal:** Full schema in Supabase -- tables, enums, indexes, triggers for cached counts, RLS, seed data.

**Build:**

*Migration 1 -- Enums + Tables:*
- Custom types: `prompt_type`, `reaction_type`, `flag_reason`
- All 7 tables: `users` (include `is_admin` boolean default false), `prompts` (include `is_closed_processed` boolean default false), `pitches` (include `rank` integer nullable, `is_revealed` boolean default false), `reactions`, `pitch_flags`, `prompt_flags`, `app_config`
- FK naming: use `pitch_id` consistently on `reactions`, `pitch_flags` (not `submission_id`)
- All indexes from spec
- All UNIQUE constraints, FKs

*Migration 2 -- Triggers:*
- `reactions` INSERT/UPDATE/DELETE → maintain `laugh_count`, `smile_count`, `surprise_count`, `total_reaction_count` on `pitches` + propagate laugh delta to `users.total_laughs`
- `pitches` INSERT/UPDATE → maintain `prompts.submission_count` (accounting for soft deletes) + `users.total_reps` (first pitch per prompt)

*Migration 3 -- Seed app_config:*
- `min_reactions_for_reveal` = 3, `default_max_open_prompts` = 2, `default_pitch_cap_per_prompt` = 50, `default_prompt_duration_hours` = 24

*Migration 4 -- RLS policies:*
- Standard policies: users can read profiles, update own; prompts readable by all; pitches filtered by deleted_at; reactions read/write own; flags insert-only; app_config read-only

*Also:* Generate TS types from schema; `src/lib/config.ts` helper for app_config values.

**Acceptance criteria:**
- `supabase db reset` runs clean
- Insert reaction → trigger updates pitch counts + user total_laughs
- Soft-delete pitch → submission_count decrements
- UNIQUE constraints reject duplicates
- RLS policies work correctly per role

**Tests:**
- `triggers.test.ts`: Insert/update/delete reactions, verify all cached counts
- `constraints.test.ts`: UNIQUE, FK, enum validation
- `rls.test.ts`: Verify policies with different user contexts
- `config.test.ts`: Seed data present and readable

---

## Phase 2: Authentication

**Goal:** Google OAuth, session management, user creation on first login, username onboarding.

**Build:**
- `src/app/api/auth/callback/route.ts` -- OAuth callback
- `src/middleware.ts` -- session refresh + `users` row sync (idempotent upsert: if auth user exists but no `users` row, create it on every authed request)
- `src/lib/auth.ts` -- `getSession()`, `getUser()` helpers
- `src/app/onboarding/page.tsx` -- username selection
- `src/components/auth/LoginButton.tsx`, `UserMenu.tsx`
- `src/components/layout/Header.tsx`, `BottomNav.tsx`
- `src/hooks/useUser.ts`

**Acceptance criteria:**
- Google OAuth flow works end-to-end
- First login → onboarding → username set → home redirect
- Subsequent logins skip onboarding
- `users` row created with correct fields; orphaned auth users (auth exists, no `users` row) are auto-healed by middleware
- Username uniqueness enforced
- Unauthenticated users redirected away from Open Topics; can browse Closed Topics only

**Tests:**
- Unit: `useUser` hook states, `getSession` helper
- Integration: callback route, onboarding user creation, username uniqueness
- E2E: login flow, onboarding flow, sign out

---

## Phase 3: Prompts CRUD + Display

**Goal:** Create, list, and view prompts. Open Topics (authed landing) and Closed Topics (public) views.

**Build:**
- `src/app/api/prompts/route.ts` -- GET (list, offset-paginated), POST (create with cap enforcement)
- `src/app/api/prompts/[id]/route.ts` -- GET single prompt
- `src/lib/validators/prompt.ts` -- Zod schemas
- Anonymity: `created_by` nullified on open prompts (except for creator)
- `src/app/(main)/page.tsx` -- Open Topics (authed users only; middleware redirects visitors to /closed)
- `src/app/(main)/closed/page.tsx` -- Closed Topics (public landing for visitors)
- `src/app/(main)/prompts/[id]/page.tsx` -- Prompt detail shell
- Components: `PromptCard`, `CreatePromptModal`, `CountdownTimer`, `Pagination`

**Pagination:** Offset-based across all list endpoints. Simple, works with random pitch ordering, fine at MVP scale.

**Acceptance criteria:**
- Open Topics requires auth; visitors redirected to Closed Topics
- Open Topics lists open prompts sorted by soonest closing
- Closed Topics lists closed prompts, most recent first, paginated
- Creating a prompt works with validation (body, type, duration 1-72h)
- Max open prompts cap enforced
- Creator hidden on open prompts, shown on closed
- System-generated prompts show "System" badge
- Countdown timer updates live
- Unauth users see login prompt on create

**Tests:**
- Unit: Zod validation, PromptCard open/closed states, CountdownTimer, anonymity serialization
- Integration: POST creates prompt, cap enforcement, GET returns correct anonymity per status, unauthenticated GET for open prompts rejected
- E2E: visitor lands on closed topics, authed user lands on open topics, create prompt, verify cap error

---

## Phase 4: Pitches -- Submit, Edit, Delete

**Goal:** Core writing loop -- submit pitches, edit within window, soft-delete. Anonymity + random ordering.

**Build:**
- `src/app/api/prompts/[id]/pitches/route.ts` -- GET (list with anonymity/ordering logic), POST (submit)
- `src/app/api/pitches/[id]/route.ts` -- PATCH (edit), DELETE (soft-delete)
- `src/lib/validators/pitch.ts` -- Zod schemas
- GET logic: open → random order, no user_id (except own), no reaction counts. Closed → chronological, full data.
- POST: auth, prompt open, body <= 1000 chars, pitch cap check
- PATCH: auth, owns pitch, edit window (`min(created_at + 5min, closes_at) > now()`), sets `edited_at`. Return `edit_deadline` timestamp in pitch responses so the UI can show/hide edit controls without reimplementing the logic.
- DELETE: auth, owns pitch, prompt open, sets `deleted_at`
- Components: `PitchList`, `PitchCard`, `PitchInput`, `PitchEditModal`

**Acceptance criteria:**
- Submit pitch → appears in list immediately
- Random order on open prompts, chronological on closed
- Own pitches marked "You", others show no author while open
- No reaction counts returned for open prompts
- Edit works within 5-min window, rejected after
- "(edited)" indicator shown
- Soft-delete hides pitch from all views
- Pitch cap enforced with configured error message
- Submit to closed prompt rejected

**Tests:**
- Unit: Zod validation, PitchCard open/closed modes, character counter, edit window calc
- Integration: POST/GET/PATCH/DELETE with all validation rules, anonymity, ordering
- E2E: submit pitch, edit within window, delete, verify cap

---

## Phase 5: Reactions (Voting)

**Goal:** React to pitches (smile/laugh/surprise), change/remove reactions, self-reaction prevention, hidden counts while open.

**Build:**
- `src/app/api/pitches/[id]/reactions/route.ts` -- POST (upsert), DELETE (remove)
- Validation: auth, prompt open, not own pitch, valid reaction_type
- Update pitch GET to include current user's reaction (but not counts while open)
- No real-time updates for the pitch list — refresh-on-load only for MVP
- Components: `ReactionBar`, `ReactionCounts`
- Optimistic UI updates

**Acceptance criteria:**
- React with one of three types, toggle off by re-tapping
- Change reaction (upsert)
- Self-reaction rejected
- Closed prompt reaction rejected
- Own reaction visible while open, counts hidden
- Counts visible on closed prompts
- DB triggers maintain cached counts correctly

**Tests:**
- Unit: ReactionBar states, ReactionCounts display
- Integration: create/change/remove reactions, trigger verification, self-reaction rejection, count hiding
- E2E: react, change, remove via UI

---

## Phase 6: Prompt Close Job + Results

**Goal:** Compute ranks on close, set reveal flags, build results view, handle live transition.

**Build:**
- `src/app/api/cron/close-prompts/route.ts` -- cron endpoint
- `is_closed_processed` already on prompts table from Phase 1
- Logic: query unprocessed closed prompts → rank pitches by laugh_count DESC, created_at ASC → set `is_revealed` where total_reaction_count >= threshold → mark processed
- **Timing gap:** cron runs every 5 min, so a prompt may be closed for up to 5 min before ranks are computed. During this window, the API returns pitches in chronological order without ranks — the UI simply omits rank badges until processed. No "processing" state needed.
- `src/lib/ranking.ts` -- pure ranking function
- `vercel.json` cron config (every 5 min)
- Components: `ResultsView`, `RankBadge`
- Live transition: poll prompt status every 30s or Supabase Realtime

**Acceptance criteria:**
- Cron processes only unprocessed closed prompts
- Ranks correct: laugh_count desc, ties share rank, created_at tiebreak
- `is_revealed` set per threshold
- Soft-deleted pitches excluded
- Results view shows ranked pitches with counts + revealed authors
- Below-threshold pitches show "Anonymous"
- UI transitions from open→closed when prompt closes
- Idempotent: re-run is no-op

**Tests:**
- Unit: ranking function (ties, single pitch, empty, all same count), RankBadge, ResultsView
- Integration: close endpoint with various scenarios, idempotency, soft-delete exclusion
- E2E: short-duration prompt → close → results display

---

## Phase 7: User Stats + Leaderboard

**Goal:** Profile stats page + global leaderboard with multiple sort modes.

**Build:**
- `src/app/api/users/[id]/stats/route.ts` -- total reps, total laughs, best finish, pitch history, reaction breakdown
- `src/app/api/leaderboard/route.ts` -- sortable: total_laughs, avg_laughs, most_reps, top3_pct (min 100 pitches). All computed on-read for MVP (candidate for materialized views if performance becomes an issue).
- Pages: `stats/page.tsx`, `leaderboard/page.tsx`
- Components: `StatsSummary`, `PitchHistory`, `ReactionBreakdown`, `LeaderboardTable`, `LeaderboardRow`

**Acceptance criteria:**
- Stats page shows correct aggregates
- Pitch history shows only closed-prompt pitches with counts
- Reaction breakdown shows accurate ratios
- Leaderboard sorts correctly per mode, paginated
- Minimum pitch thresholds enforced for qualifying metrics

**Tests:**
- Unit: component rendering with known data
- Integration: stats endpoint with test data, leaderboard sorting + thresholds
- E2E: navigate stats/leaderboard, switch sort modes

---

## Phase 8: Flagging + Moderation

**Goal:** Flag pitches/prompts with reasons. Basic admin view.

**Build:**
- `src/app/api/pitches/[id]/flags/route.ts` -- POST
- `src/app/api/prompts/[id]/flags/route.ts` -- POST
- `src/app/api/admin/flags/route.ts` -- GET (admin only)
- `is_admin` already on users table from Phase 1
- Components: `FlagButton`, `FlagReasonPicker`
- Mobile swipe to reveal flag option
- `src/app/(main)/admin/flags/page.tsx`

**Acceptance criteria:**
- Flag pitch/prompt with reason while open
- Duplicate flags rejected gracefully
- Swipe gesture on mobile
- Admin view lists flagged content
- Non-admin blocked from admin view
- Flags don't affect content visibility (manual review only)

**Tests:**
- Unit: FlagReasonPicker, disabled states
- Integration: create flag, duplicate rejection, admin auth
- E2E: flag via UI, verify admin view

---

## Phase 9: AI Prompt Generation

**Goal:** Daily 9 AM EST job generating 5 comedy prompts via Anthropic API.

**Build:**
- `src/app/api/cron/generate-prompts/route.ts` -- cron endpoint (protected by CRON_SECRET)
- `src/lib/ai/prompt-generator.ts` -- Anthropic API call + parsing
- `vercel.json` cron at 14:00 UTC (9 AM EST)
- Hardcode opens_at = 9AM EST, closes_at = 6PM EST (do NOT use `default_prompt_duration_hours`, which is for user-created prompts only)
- Idempotency: skip if today's system prompts exist

**Acceptance criteria:**
- Generates exactly 5 prompts with correct fields (is_system_generated, opens 9AM, closes 6PM EST)
- Valid prompt_type assigned to each
- Protected endpoint (rejects without cron secret)
- Idempotent (no duplicates on re-run)
- Handles API errors gracefully

**Tests:**
- Unit: mock Anthropic SDK, verify prompt construction + parsing + error handling
- Integration: mock API via MSW, verify 5 prompts in DB, idempotency, auth check

---

## Phase 10: Settings + Polish

**Goal:** Settings page, UI polish, loading states, error handling, mobile-first audit, accessibility.

**Build:**
- `src/app/api/users/me/route.ts` -- PATCH (update username, avatar)
- `src/app/(main)/settings/page.tsx`
- Components: `ProfileSettings`, `NotificationPrefs` (shell), `DisplayPrefs` (shell)
- UI components: `Toast`, `EmptyState`, `LoadingSkeleton`, `ErrorBoundary`
- Mobile responsive audit (375px)
- Accessibility pass (ARIA, keyboard nav)

**Acceptance criteria:**
- Update username (uniqueness enforced) and avatar
- Loading skeletons on all views
- Empty states where appropriate
- Toast notifications for key actions
- Fully functional at 375px
- Keyboard accessible, no critical axe-core violations

**Tests:**
- Unit: Toast, EmptyState, LoadingSkeleton, settings validation
- Integration: PATCH user endpoint
- E2E: mobile viewport walkthrough, settings update, accessibility audit

---

## File Structure (Final)

```
src/
  middleware.ts
  app/
    layout.tsx
    (main)/
      layout.tsx
      page.tsx                       # Open Topics
      closed/page.tsx
      prompts/[id]/page.tsx
      stats/page.tsx
      leaderboard/page.tsx
      settings/page.tsx
      admin/flags/page.tsx
    onboarding/page.tsx
    api/
      auth/callback/route.ts
      prompts/route.ts
      prompts/[id]/route.ts
      prompts/[id]/pitches/route.ts
      prompts/[id]/flags/route.ts
      pitches/[id]/route.ts
      pitches/[id]/reactions/route.ts
      pitches/[id]/flags/route.ts
      users/me/route.ts
      users/[id]/stats/route.ts
      leaderboard/route.ts
      admin/flags/route.ts
      cron/close-prompts/route.ts
      cron/generate-prompts/route.ts
  components/
    auth/          # LoginButton, UserMenu
    layout/        # Header, BottomNav
    prompts/       # PromptCard, CreatePromptModal, CountdownTimer, ResultsView
    pitches/       # PitchList, PitchCard, PitchInput, PitchEditModal, RankBadge
    reactions/     # ReactionBar, ReactionCounts
    flags/         # FlagButton, FlagReasonPicker
    stats/         # StatsSummary, PitchHistory, ReactionBreakdown
    leaderboard/   # LeaderboardTable, LeaderboardRow
    settings/      # ProfileSettings, NotificationPrefs, DisplayPrefs
    ui/            # Pagination, Toast, EmptyState, LoadingSkeleton, ErrorBoundary
  hooks/           # useUser, usePrompts
  lib/
    supabase/      # client.ts, server.ts, admin.ts
    validators/    # prompt.ts, pitch.ts
    ai/            # prompt-generator.ts
    auth.ts
    config.ts
    ranking.ts
    api-error.ts
  types/
    database.ts
    enums.ts
supabase/
  migrations/      # 001-006
vercel.json
```
