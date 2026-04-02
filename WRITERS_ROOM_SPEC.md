# Writers Room — Product Spec

**Version:** 0.5
**Date:** April 2026

---

## What This Is

Writers Room is a comedy writing gym. Users write pitches against prompts, react to each other's pitches, and track their improvement over time. The core loop is: prompt opens → writers submit pitches and react to each other simultaneously → prompt closes → results reveal.

---

## Core Loop

### Prompts (Topics)

A prompt is a topic that writers submit pitches against. Multiple prompts can be open simultaneously.

**Who can create prompts:**
- Any logged-in user can create a prompt. Each user can have a max of 2 open prompts at a time. This default limit should be stored as a configurable value (per-user overrides will come later but the schema should support it).
- The system auto-generates 5 prompts daily at 9:00 AM EST. These are AI-generated topics. Implementation: use the Anthropic API to generate 5 comedy writing prompts each morning via a scheduled job. Prompts should be varied — mix of topical headlines, setups needing punchlines, format constraints ("write a fake Yelp review for..."), and absurdist premises.

**Prompt timing:**
Writing and voting happen simultaneously — there is no separate voting phase. A prompt is either open or closed (derived from `opens_at` and `closes_at` — see Data Model). While open, users can submit pitches and react to other pitches at the same time. When the prompt closes, submissions and reactions stop, results are computed, and authors are revealed.
- AI-generated daily prompts: open at 9:00 AM EST, close at 6:00 PM EST. Results reveal immediately on close.
- User-created prompts: default duration of 24 hours. Creator can adjust from 1 hour to 3 days at creation time. For MVP, cap at 3 days. (Post-MVP: allow longer durations like month-long prompts.)

**Prompt anonymity:** The creator of a prompt is anonymous while the prompt is open. Creator identity is revealed when the prompt closes. AI-generated prompts are labeled as system-generated.

**Prompt fields:**
- id
- body (the prompt text)
- prompt_type (headline, setup, format, topical, evergreen)
- created_by (user_id, nullable for system-generated)
- is_system_generated (boolean)
- opens_at (timestamp)
- closes_at (timestamp)
- submission_count (cached — maintained by DB trigger on pitches table, accounts for soft deletes)
- created_at

**Open/closed status** is derived: a prompt is open when `now() >= opens_at AND now() < closes_at`, and closed when `now() >= closes_at`. There is no stored status column.

### Pitches

Writers submit pitches against open prompts.

- **No limit on pitches per prompt per writer.** Store a configurable default cap of 50 per user per prompt as a safeguard against abuse, but this should feel unlimited in practice. If a user hits the cap, show: "You've hit the pitch limit of [X] for this topic. You can delete a pitch to add a new one."
- **1000 character max per pitch.** Favor creative freedom over forced brevity.
- **Editing:** Authors can edit their pitch within a window of 5 minutes from creation OR until the prompt closes, whichever is sooner. After this window, the pitch is locked. If a pitch has been edited, display a small "(edited)" indicator. Reactions on the pitch are preserved through edits.
- **Deleting:** Authors can soft-delete their own pitch at any time while the prompt is open. Soft-deleting hides the pitch and all associated reactions from all views. The record is retained for moderation audit trails.
- **Anonymous while prompt is open.** Other users cannot see who wrote a pitch until results are revealed. The author CAN see which pitches are their own (visually distinguished in the UI).
- **Authors cannot react to their own pitches.** Enforced at the API level.
- **Reaction visibility:** While a prompt is open, reaction counts are hidden from all users. Users can react but cannot see how many reactions a pitch has received. Users CAN see their own previously-given reaction when revisiting a pitch. Counts are revealed only when the prompt closes. This ensures independent voting without bandwagon effects.
- **Pitch ordering:** While a prompt is open, pitches are displayed in random order (shuffled per page load). When a prompt is closed, pitches are displayed in chronological order (by created_at). Paginate results in both cases to handle prompts with large numbers of pitches.
- **Author reveal rule:** When results are posted, author identity is revealed ONLY on pitches that received a minimum number of total reactions (any type). Pitches below the threshold remain anonymous to other users (the author can always see their own). This is not a privacy guarantee — it is a social mechanic to encourage risk-taking. Store the minimum reaction threshold as a configurable value (starting at 3).

**Pitch fields:**
- id
- prompt_id (foreign key)
- user_id (foreign key)
- body (text, max 1000 chars)
- created_at
- updated_at
- deleted_at (timestamp, nullable — soft delete)
- laugh_count (cached)
- smile_count (cached)
- surprise_count (cached)
- total_reaction_count (cached — used for reveal threshold)
- edited_at (timestamp, nullable — set when author edits within the edit window)
- rank (computed when prompt closes, based on laugh_count; ties share the same rank)
- is_revealed (boolean — whether author identity is shown, set when prompt closes based on threshold)

### Reactions (Voting)

Three reactions, each representing a different kind of comedic quality:

| Reaction | Emoji | Meaning |
|----------|-------|---------|
| Smile | 😄 | "That's clever, I see what you did" — craft recognition |
| Laugh | 😂 | "That actually got me" — genuine funniness |
| Surprise | 😮 | "Didn't see that coming" — originality, weird-funny |

**Voting rules:**
- Must have an account to react.
- One reaction per user per pitch (pick one of three, or none). Enforced at DB level.
- Users can change their reaction on a pitch at any time while the prompt is open.
- Users can revisit prompts they've voted on and see their previous reactions displayed.
- Authors cannot react to their own pitches. Enforced at API level.
- Visitors without accounts can browse closed prompts and see results but cannot react.
- **Hard cutoff on close:** When a prompt closes, reactions are no longer accepted. If a user is viewing an open prompt when it closes, the UI should detect the closure and transition to the closed prompt view.

**Ranking:** Pitches are ranked by 😂 laugh count. Ties share the same rank. Secondary sort for ties: chronological (earlier created_at ranks higher). All three reaction counts are displayed on every pitch for texture, but the leaderboard sorts by laughs only.

**Reaction fields:**
- id
- submission_id (foreign key)
- user_id (foreign key)
- reaction_type (enum: smile, laugh, surprise)
- created_at
- updated_at
- UNIQUE constraint on (submission_id, user_id)

### Flagging

Users can flag both prompts and pitches while a prompt is open. Swipe gesture on mobile to reveal flag options.

**Flag reasons (pitches):**
- Offensive
- Duplicate (same pitch submitted by someone else on this prompt)
- Plagiarized (stolen from elsewhere)

**Flag reasons (prompts):**
- Offensive
- Duplicate
- Plagiarized

**Pitch flag fields:**
- id
- submission_id (foreign key)
- user_id (foreign key — who flagged)
- reason (enum: offensive, duplicate, plagiarized)
- created_at
- UNIQUE constraint on (submission_id, user_id) — one flag per user per pitch

**Prompt flag fields:**
- id
- prompt_id (foreign key)
- user_id (foreign key — who flagged)
- reason (enum: offensive, duplicate, plagiarized)
- created_at
- UNIQUE constraint on (prompt_id, user_id) — one flag per user per prompt

For MVP, flags are collected and surfaced in an admin view. No auto-moderation. Manual review. Track flag volume per user to identify bad-faith flaggers over time.

---

## Views (Navigation Priority)

Listed in order of importance. This is the primary navigation structure.

### 1. Open Topics (Default View)
The landing page. Shows all currently open prompts. Each prompt card shows: prompt text, time remaining, number of pitches so far. Tapping a prompt opens it to read pitches, submit your own, and react to others.

### 2. Closed Topics
Archive of completed prompts. Shows prompt text, winning pitch(es), total participation count. Tapping opens the full results with all pitches in chronological order, reactions visible, and revealed authors (where threshold is met).

### 3. User Stats (Your Profile)
Your own writing history and performance data:
- Total reps (prompts you've submitted to)
- Pitch history organized by prompt, with reaction counts per pitch
- Aggregate reaction breakdown over time (your ratio of 😄/😂/😮 across all pitches)
- Best finish (highest rank on a single prompt)
- Total laughs received (lifetime)

### 4. Leaderboard
Global rankings with multiple breakdowns. Views include: total lifetime 😂 laugh count, average laughs per pitch, most reps (total prompts participated in), best batting average (% of pitches finishing top 3, minimum 100 pitches to qualify). More breakdowns will be added over time.

### 5. Settings
Account management, notification preferences, display preferences.

---

## Accounts & Access

**Visitor (no account):**
- Can browse closed topics and see full results: all pitches ranked, reaction counts, revealed authors
- Cannot react, cannot submit, cannot create prompts

**Logged-in user (free account):**
- Full access to everything: submit pitches, react, create prompts, view all results, full profile and stats
- This is the complete experience. No premium tier in MVP.

---

## Data Model Summary

### Users
- id (uuid, PK)
- username (unique)
- email (unique)
- avatar_url (nullable)
- max_open_prompts (integer, default 2)
- created_at
- total_reps (cached/computed)
- total_laughs (cached/computed)

**User aggregate maintenance:** `total_reps` and `total_laughs` are updated by a database trigger. `total_reps` increments when a user's first non-deleted pitch is inserted for a given prompt. `total_laughs` is updated by the same trigger that maintains pitch reaction counts — when a laugh reaction is added/changed/removed, propagate the delta to the pitch author's `total_laughs`.

### Prompts
- id (uuid, PK)
- body (text)
- prompt_type (enum: headline, setup, format, topical, evergreen)
- created_by (uuid, FK to users, nullable for system)
- is_system_generated (boolean, default false)
- opens_at (timestamp)
- closes_at (timestamp)
- submission_count (integer, default 0 — cached, maintained by DB trigger, excludes soft-deleted pitches)
- created_at

Open/closed is derived from timestamps: `open` when `now() >= opens_at AND now() < closes_at`, `closed` when `now() >= closes_at`.

### Pitches
- id (uuid, PK)
- prompt_id (uuid, FK)
- user_id (uuid, FK)
- body (text, max 1000)
- laugh_count (integer, default 0)
- smile_count (integer, default 0)
- surprise_count (integer, default 0)
- total_reaction_count (integer, default 0)
- rank (integer, nullable — set on prompt close, ties share rank)
- is_revealed (boolean, default false — set on prompt close)
- edited_at (timestamp, nullable)
- deleted_at (timestamp, nullable — soft delete)
- created_at
- updated_at

### Reactions
- id (uuid, PK)
- pitch_id (uuid, FK)
- user_id (uuid, FK)
- reaction_type (enum: smile, laugh, surprise)
- created_at
- updated_at
- UNIQUE (pitch_id, user_id)

### Pitch Flags
- id (uuid, PK)
- pitch_id (uuid, FK)
- user_id (uuid, FK)
- reason (enum: offensive, duplicate, plagiarized)
- created_at
- UNIQUE (pitch_id, user_id)

### Prompt Flags
- id (uuid, PK)
- prompt_id (uuid, FK)
- user_id (uuid, FK)
- reason (enum: offensive, duplicate, plagiarized)
- created_at
- UNIQUE (prompt_id, user_id)

### App Config (key-value store for system-wide settings)
- key (text, PK)
- value (text/json)
- Examples: `min_reactions_for_reveal` = 3, `default_max_open_prompts` = 2, `default_pitch_cap_per_prompt` = 50

---

## Indexes

Key indexes beyond primary keys and unique constraints:

- **Prompts:** `(opens_at, closes_at)` — for querying open/closed prompts efficiently
- **Pitches:** `(prompt_id, deleted_at, created_at)` — for listing pitches on a prompt (filtered by not-deleted, ordered chronologically)
- **Pitches:** `(prompt_id, deleted_at, laugh_count DESC)` — for ranking pitches on prompt close
- **Pitches:** `(user_id, deleted_at, prompt_id)` — for user profile: which prompts a user has pitched on
- **Reactions:** `(pitch_id, user_id)` — covered by UNIQUE constraint
- **Reactions:** `(user_id, pitch_id)` — for looking up "did I already react to this pitch"
- **Pitch Flags:** `(pitch_id)` — for admin moderation view
- **Prompt Flags:** `(prompt_id)` — for admin moderation view

---

## Scheduled Jobs

**Daily prompt generation:**
- Runs at 9:00 AM EST daily
- Calls Anthropic API to generate 5 varied comedy writing prompts
- Creates prompt records with opens_at = 9:00 AM EST, closes_at = 6:00 PM EST same day
- Marks as is_system_generated = true

**Prompt close job:**
- When closes_at is reached: compute ranks (order by laugh_count desc, then created_at asc for ties, excluding soft-deleted pitches), set is_revealed = true on pitches where total_reaction_count >= configured threshold, reveal prompt creator identity. Update user `total_reps` if not already handled by trigger.

---

## Technical Constraints

- **Anonymity enforcement:** The API must never expose user_id on pitches for open prompts (except to the author themselves). This is enforced at the API level to prevent UI leaks.
- **Reaction count hiding:** The API must not return reaction counts on pitches for open prompts. Counts are only exposed after the prompt closes. The API DOES return the requesting user's own reaction (if any) on each pitch, so the UI can display it.
- **Cached count consistency:** Use database triggers on the reactions table to maintain cached reaction counts (laugh_count, smile_count, surprise_count, total_reaction_count) on pitches and total_laughs on users. Triggers must handle inserts, updates (reaction type changes), and deletes atomically. A separate trigger on the pitches table maintains submission_count on prompts (accounting for soft deletes).
- **Self-reaction prevention:** The API must reject reactions where reaction.user_id = pitch.user_id.
- **Pitch editing:** The API must reject edits to pitches where `min(created_at + 5 minutes, prompt.closes_at)` has passed. Set edited_at on successful edit.
- **Pitch soft-deletion:** The API must allow authors to soft-delete their own pitches while the prompt is open. Set deleted_at = now(). Soft-deleted pitches are excluded from all queries except admin moderation views. Associated reactions are preserved in the database but hidden.
- **Pitch cap:** Enforce max pitches per user per prompt at the API level using the configurable cap value. Count only non-deleted pitches toward the cap.
- **Prompt creation cap:** Enforce max open prompts per user at the API level using the user's max_open_prompts value.
- **Hard cutoff on prompt close:** The API must reject pitch submissions and reactions for prompts where `now() >= closes_at`. No grace period.

---

## Stack Recommendation

- **Frontend:** React (Next.js), mobile-first responsive web
- **Backend:** Next.js API routes
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (Google OAuth only for MVP)
- **AI prompt generation:** Anthropic API (Claude) via scheduled serverless function
- **Hosting:** Vercel + Supabase
