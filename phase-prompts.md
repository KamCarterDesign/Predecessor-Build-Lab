# Predecessor Labs — Phase Execution Prompts

> These prompts are designed to be used as the **opening message** when starting work on each phase.  
> Each prompt is self-contained with full context, references, and success criteria.  
> Copy and paste the relevant section when beginning a new phase.

---

## Phase 1 Prompt — Foundation: Knowledge Engine & Data Layer

```
We are building Predecessor Labs — an intelligent companion platform for the game Predecessor by Omeda Studios.

The PRD is located at:
C:\Users\conce\.gemini\antigravity-ide\brain\ce799f29-1b83-4609-bf6b-4cbcad7bb547\predecessor_labs_prd.md

Phase specifications are at:
C:\Users\conce\.gemini\antigravity-ide\brain\ce799f29-1b83-4609-bf6b-4cbcad7bb547\phases\phase-specifications.md

We are in Phase 1: Foundation — Knowledge Engine & Data Layer.

The workspace is: c:\Users\conce\Desktop\Work\Predecessor Build Lab

CONTEXT:
- Primary data source: https://omeda.city (REST API, no auth required, no rate limits currently)
- Firebase will be our database (Firestore) and file storage (Firebase Storage)
- Hosting: Vercel
- Mobile: Flutter (Phase 2+, not needed yet)
- The app is a Next.js web application

KEY FACTS ABOUT THE DATA:
- Heroes endpoint: GET https://omeda.city/heroes.json
  Returns full hero data including base_stats as 18-element arrays (index 0 = Level 1)
  Image assets at: https://omeda.city/assets/{hash}.webp
- Items endpoint: GET https://omeda.city/items.json
  Returns all items. Tier derivation:
    Tier 1: price === total_price AND requirements is empty
    Tier 2: has requirements AND has build_paths
    Tier 3 / is_final_item: build_paths is empty or null
  Crests: slot_type === "Crest", final crests have rarity === "Legendary"
- Eternals: NOT in the Omeda.city API. Must be scraped from https://pred.gg/eternals
  There are 12 eternals in 6 categories:
    Anomalies: Aion, Demiurge
    Divines: Exarch, Lotus
    Dreadnoughts: Idrisil, Krix
    Harbingers: Marrow, Vermis
    Primarchs: Nihil, Thraex
    Sovereigns: Vesh, Xyris
  Each has a main effect + 6 minor blessings (2 groups of 3)
  Individual pages at: https://pred.gg/eternals/{Name}
- Dynamic data: match data, hero statistics
  GET https://omeda.city/matches.json (cursor-paginated, max 100 per page)
  GET https://omeda.city/dashboard/hero_statistics.json?time_frame=1W&game_mode=ranked

ASSET PIPELINE (important):
- Always download image assets from CDN to Firebase Storage during sync
- DO NOT serve images directly from omeda.city in the app
- Store Firebase Storage CDN URL back in the Firestore document

FIRESTORE SCHEMA:
Collections required: /heroes/{slug}, /items/{slug}, /eternals/{slug},
/meta_snapshots/{date}, /meta_narratives/{patchVersion},
/players/{id}, /matches/{id}, /builds/{id}
Full schema is in the PRD document.

HERO-ITEM SYNERGY SCORING:
From ingested match data, compute per (heroSlug, itemSlug) pair:
  win_rate = wins_with_item / games_with_item
  synergy_score = win_rate × log(sample_size + 1)
Store in meta_snapshots.item_synergies

META NARRATIVE GENERATION (no AI):
Compare current vs previous meta_snapshot deltas.
Use template strings to produce human-readable summaries.
Store in /meta_narratives/{patchVersion}.

YOUR TASKS FOR PHASE 1:
1. Scaffold the Next.js project with Vercel deployment config
2. Set up Firebase (Firestore + Storage + Cloud Functions)
3. Build the hero sync script (omeda.city → Firestore + asset download)
4. Build the items sync script with tier derivation logic
5. Build the eternals scraper (pred.gg/eternals)
6. Build the dynamic sync (match data + hero statistics, cursor-paginated)
7. Build the hero-item synergy computation function
8. Build the meta snapshot engine
9. Build the meta narrative template engine
10. Create a minimal admin page to trigger manual syncs and view status

Read the PRD thoroughly before starting. Ask any clarifying questions before writing code.
Success criteria: all data in Firestore with correct schema, assets in Firebase Storage, cron sync running cleanly.
```

---

## Phase 2 Prompt — Simulation: Lab, Build DNA, Build Analysis

```
We are building Predecessor Labs. Phase 1 (Knowledge Engine) is complete.

PRD: C:\Users\conce\.gemini\antigravity-ide\brain\ce799f29-1b83-4609-bf6b-4cbcad7bb547\predecessor_labs_prd.md
Phase specs: C:\Users\conce\.gemini\antigravity-ide\brain\ce799f29-1b83-4609-bf6b-4cbcad7bb547\phases\phase-specifications.md

We are in Phase 2: Simulation — Lab, Build DNA, Build Analysis.

CONTEXT:
- Firebase data layer is complete (Phase 1 done)
- Next.js web app on Vercel
- Flutter mobile app shell may be started but is secondary priority in this phase
- All data served from Firebase — never directly from Omeda.city

KEY FEATURES TO BUILD:

1. HERO SELECTION SCREEN
   - Visual grid of all heroes
   - Filter by class and role
   - On selection: show collapsible hero overview panel
     (portrait, class, roles, abilities grid, base stats at Level 1)

2. LEVEL SLIDER (1–18)
   - Real-time recalculation of all base stats
   - Source: base_stats arrays from Firestore hero document
   - stat_at_level(N) = base_stats.stat_array[N - 1]

3. ITEM BROWSER WITH FILTERS
   - DEFAULT: show only Tier 3 (is_final_item: true) items
   - DEFAULT CRESTS: show only final/Legendary crests
   - Filter controls: Tier (1/2/3), Class, Type, Aggression Type, Name search
   - Item cards: icon, name, total_price, aggression_type, rarity badge

4. BUILD CONSTRUCTION
   - 6 item slots + 1 crest slot + 1 eternal slot
   - Click to add/remove
   - Real-time stat panel updates on every change
   - Build path validation (warn if prerequisites not met)

5. BUILD DNA ENGINE
   Formula in PRD section 13. Key points:
   - 7 dimensions: Burst, Sustain, Tankiness, Scaling, Mobility, Utility, Objective Damage
   - Scored 0–10 per dimension
   - Hero DNA modifiers (pre-computed, stored on hero document) are ADDED to item scores
   - Visualised as a horizontal bar chart
   - Build identity tag from top-2 dimensions (see tag table in PRD section 13.3)

6. STRENGTHS & WEAKNESSES ENGINE
   Rule-based, deterministic. Examples:
   - Burst DNA > 7 → "High burst potential"
   - Physical penetration > 25 → "Strong anti-tank"
   - Effective HP < class threshold → "Low survivability"
   - First item cost > 2,500g → "Weak early game"

7. BUILD CONFIDENCE ENGINE
   Factors: patch recency, match data sample size, hero-item synergy scores,
   item combo win rate, deviation from popular builds.
   Output: score (0–100%) + breakdown of contributing factors.

8. NON-AI BUILD ANALYSIS (FREE TIER)
   Template-driven human-readable report. NO AI/LLM involved.
   Shows: stat totals, Effective HP, strengths/weaknesses,
   comparison vs popular builds for this hero/role,
   confidence score with explanation.
   Must generate in < 500ms.

9. POWER SPIKE ANALYSIS
   At each item milestone, compute stat deltas.
   Flag when a stat jumps significantly vs previous milestone.

10. BUILD NAMING & SAVING
    - Session builds persist until app close
    - Save modal prompts for build name (required) + optional description
    - Saved to localStorage (web) / local storage (Flutter)
    - Saved Builds tab: list with thumbnail, hero, role, gold cost

STAT CALCULATION FORMULAS (from PRD section 8):
- Effective HP (Physical) = total_health × (1 + total_phys_armor / 100)
- CDR% = ability_haste / (100 + ability_haste)
- Attack Speed = 1 / (basic_attack_time / attack_speed_multiplier)
- See full formulas in PRD section 8

DESIGN REQUIREMENTS:
- Premium aesthetic — dark mode, glassmorphism, smooth animations
- The design must WOW on first impression
- Responsive: works on desktop, tablet, and mobile
- Item filter must feel like pred.gg/items in function

Read the PRD thoroughly. The calculation engine should be a shared TypeScript library
usable by both Next.js and Flutter (via a shared API route or standalone package).
```

---

## Phase 3 Prompt — Intelligence: AI Features & Hero Comparison

```
We are building Predecessor Labs. Phases 1 and 2 are complete.

PRD: C:\Users\conce\.gemini\antigravity-ide\brain\ce799f29-1b83-4609-bf6b-4cbcad7bb547\predecessor_labs_prd.md
Phase specs: C:\Users\conce\.gemini\antigravity-ide\brain\ce799f29-1b83-4609-bf6b-4cbcad7bb547\phases\phase-specifications.md

We are in Phase 3: Intelligence — AI Features, Matchup Score, Hero Comparison.

KEY FEATURES TO BUILD:

1. HERO COMPARISON
   - User selects a second hero alongside the first in the Lab
   - Side-by-side stat table at matching level
   - Scaling graph (stat growth across levels 1–18)
   - DNA profile comparison (dual bar chart or radar)

2. MATCHUP SCORE ENGINE (placeholder formula)
   matchup_score = 50
     + (hero_a_scaling_dna - hero_b_scaling_dna) × 2.5
     + (hero_a_effective_hp - hero_b_effective_hp) / 200
     + (hero_a_utility_dna - hero_b_utility_dna) × 1.5
     - (hero_b_mobility_dna - hero_a_mobility_dna) × 1.0
     + early_game_delta × 1.5
   Clamped to [0, 100]. MUST always show contributing factors — score alone is meaningless.

3. EXPLAIN THIS — RULES ENGINE
   Architecture:
   - Context detection: what triggered the explanation?
   - Data query: relevant stats, deltas, synergy scores
   - Template selection + value interpolation → output string
   
   Must cover at minimum:
   - Item added: "Adding X increases your magical penetration from A to B..."
   - DNA dimension change: "This item boosts your Burst score from 6.2 to 7.8 because..."
   - Confidence delta: "Confidence dropped because this item has low synergy with {hero}..."
   - Matchup factor: "Your Scaling advantage (+15) comes from..."

4. AI BUILD ANALYSIS (PREMIUM)
   AI provider: Gemini by default. User can switch to OpenAI or Claude in settings.
   Use a unified adapter so the provider is swappable.
   
   Input context (pre-computed, never let AI calculate):
   {
     hero: hero_data,
     level: 18,
     build: [item_data],
     computed_stats: all_stats,
     build_dna: dna_scores,
     matchup: matchup_data (if set),
     meta_context: current_meta_snapshot,
     popular_builds: top_3_builds_for_hero_role,
     synergy_scores: hero_item_synergy_data,
     patch_version: current
   }
   
   Output format: streamed response structured as:
   1. Build overview (2–3 sentences, direct assessment)
   2. Strengths (specific, evidence-referenced)
   3. Weaknesses (honest, not softened)
   4. Item critique (each item: keep/swap/why)
   5. Alternative suggestions with reasoning
   6. Meta comparison vs popular builds

   Tone: Direct, analytical, willing to criticise, never just validating.

5. AI EXPLAIN THIS (PREMIUM)
   For questions beyond the rules engine's scope.
   E.g. "Is this build right for the current meta against heavy-tank compositions?"
   Same provider adapter as AI Build Analysis.

6. PREMIUM GATE
   Stripe subscription check.
   AI features behind paywall. Rules engine is free.

Read the PRD section 14 for full AI integration details.
```

---

## Phase 4 Prompt — Discovery: Feed, Meta Tracker, Search

```
We are building Predecessor Labs. Phases 1–3 are complete.

PRD: C:\Users\conce\.gemini\antigravity-ide\brain\ce799f29-1b83-4609-bf6b-4cbcad7bb547\predecessor_labs_prd.md
Phase specs: C:\Users\conce\.gemini\antigravity-ide\brain\ce799f29-1b83-4609-bf6b-4cbcad7bb547\phases\phase-specifications.md

We are in Phase 4: Discovery — Feed, Meta Tracker, Global Search.

KEY FEATURES TO BUILD:

1. FEED
   Sources:
   - Official Predecessor blog: https://www.predecessorgame.com/en-US/news
     Scrape or RSS feed. Parse articles into feed items.
   - Reddit r/PredecessorGame: https://www.reddit.com/r/PredecessorGame.json
     Public JSON API, no auth required. Pull hot + new posts.
   
   Display:
   - Chronological order, infinite scroll or pagination
   - Source badges: "Official" (distinct border), "Reddit" (Reddit icon + upvote count)
   - Sponsored/featured posts: "Featured" label, always clearly labelled
   - Post card: thumbnail, title, source, timestamp, excerpt
   
   Future sources (not Phase 4): YouTube, X/Twitter, Discord

2. META TRACKER
   Data from: /meta_snapshots/{latest} in Firestore
   
   Sections:
   - Rising Heroes: heroes with positive win_rate / pick_rate delta vs previous snapshot
   - Falling Heroes: negative delta
   - Popular Builds: top item combos per hero per role
   - Trending Items: items with highest appearance delta
   - Meta Narrative: from /meta_narratives/{currentPatch} — stats-driven text, NO AI
   
   Popular builds here serve as a reference baseline visible to all users.
   When a user hovers/clicks a popular build item, they should be able to open it in the Lab.

3. LIBRARY (full version)
   Hero detail pages: full ability breakdown, stat table at all levels (interactive slider)
   Item detail pages:
     - Full stat block + effects
     - Build path tree (visual, shows what it builds from and into)
     - Tier badge (1 / 2 / 3)
     - "Appears in X% of popular {class} builds" badge
     - Historical patch presence
     - Related items by aggression_type
   Crest detail pages
   Eternal detail pages: main effect + 6 minor blessings in 2 groups
   Patch history section (manual input per patch)

4. GLOBAL SEARCH
   Searches: heroes, items, abilities, builds, patch notes
   Implementation: Algolia or Firestore composite query
   Must return results in < 300ms
   Search result types clearly differentiated (hero chip, item chip, etc.)

5. FEATURED PLACEMENT SYSTEM
   Creators can have content marked as "Featured" in the Feed
   Implementation: a Firestore /featured_content collection
   Admin can toggle featured status
   Featured items always carry a "Featured" badge — NEVER hidden

Read the PRD sections 12.11, 12.12, 12.13 for detailed specs on each feature.
```

---

## Phase 5 Prompt — Accounts: Auth, Cloud Sync, Sharing

```
We are building Predecessor Labs. Phases 1–4 are complete.

PRD: C:\Users\conce\.gemini\antigravity-ide\brain\ce799f29-1b83-4609-bf6b-4cbcad7bb547\predecessor_labs_prd.md
Phase specs: C:\Users\conce\.gemini\antigravity-ide\brain\ce799f29-1b83-4609-bf6b-4cbcad7bb547\phases\phase-specifications.md

We are in Phase 5: Accounts — Auth, Cloud Sync, Public Sharing.

KEY FEATURES TO BUILD:

1. FIREBASE AUTHENTICATION
   - Email/password sign up and login
   - Google OAuth
   - Profile page: display name, subscription status
   - JWT token management (web + Flutter)

2. CLOUD BUILD SYNC
   - On login, sync local builds to Firestore /users/{uid}/builds/
   - Conflict resolution: last-modified wins
   - Unlimited builds for premium users; free users capped at 3 synced builds

3. PREMIUM SUBSCRIPTION
   - Stripe billing integration
   - Monthly and annual tiers
   - Webhook to update user's premium status in Firestore on subscription events
   - Premium unlocks: AI features, unlimited builds, cloud sync, ad-free

4. PUBLIC BUILD SHARING
   - Generate unique shareable URL per build (e.g. /builds/{buildId})
   - Shared builds are public, no login required to view
   - Viewer can open a shared build in their Lab session

5. CREATOR PROFILES
   - Creators can claim a public profile page
   - Profile page shows their public builds, sorted by popularity
   - Foundation for future featured content monetisation
```

---

## Phase 6 Prompt — Community: Draft, Compositions, Discord

```
We are building Predecessor Labs. Phases 1–5 are complete.

We are in Phase 6: Community — Draft Assistant, Team Compositions, Discord.

KEY FEATURES TO BUILD:

1. DRAFT ASSISTANT
   - 5v5 hero pick/ban interface
   - As heroes are picked, generate team composition DNA profiles
   - Flag synergies and counter-picks based on hero class/role/DNA
   - Suggest remaining picks to complete a balanced composition

2. TEAM COMPOSITION ANALYSER
   - Takes any 5-hero team
   - Generates aggregate DNA profile for the team
   - Identifies: team strengths, weaknesses, win conditions, weak points
   - Comparison against common meta compositions

3. DISCORD INTEGRATION
   - Share builds to Discord via webhook
   - Rich embed: hero portrait, build items, DNA bars, confidence score
   - "Share to Discord" button on saved builds

4. COMMUNITY BUILDS SECTION
   - Curated, high-rated builds per hero (from community contributions)
   - Voting system for build quality
   - Creator attribution on community builds
```

---

## Phase 7 Prompt — Coaching: Player Performance & Improvement

```
We are building Predecessor Labs. Phases 1–6 are complete.

We are in Phase 7: Coaching — Player Performance & Improvement Tracking.

KEY FEATURES TO BUILD:

1. PLAYER LOOKUP
   - Search by player name
   - API: GET https://omeda.city/players.json?filter[name]={name}
   - Then: GET https://omeda.city/players/{id}/statistics.json
   - Show: rank, MMR, win rate, KDA, most played heroes

2. PLAYER HERO STATISTICS
   - GET https://omeda.city/players/{id}/hero_statistics.json
   - Show per-hero win rate, games played, KDA
   - Trend graph over time (if enough data)

3. MATCH HISTORY
   - GET https://omeda.city/players/{id}/matches.json
   - Per-match: hero played, result, KDA, items built, role

4. BUILD COMPARISON (COACHING)
   - Compare a player's actual item builds from match history
   vs. meta popular builds for that hero
   - Flag deviations: "You frequently skip X, which appears in 71% of top builds"

5. IMPROVEMENT INSIGHTS
   - Patterns across recent matches
   - "Your win rate with Carries is 58% but 41% in Jungle — consider focusing roles"
   - Deterministic rule-based suggestions, no AI required

6. REPLAY ANALYSIS (ASPIRATIONAL)
   - Requires official replay API (TBD, API-dependent)
   - Not guaranteed — flag as stretch goal
```

---

*End of Phase Prompts*
