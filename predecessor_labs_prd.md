# Predecessor Labs — Product Requirements Document

> **Version:** 1.0  
> **Status:** Foundation Draft  
> **Author:** Antigravity (for review)  
> **Last Updated:** 2026-07-14

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Core Pillars](#2-core-pillars)
3. [Guiding Principles](#3-guiding-principles)
4. [Target Audience](#4-target-audience)
5. [Data Architecture & Knowledge Engine](#5-data-architecture--knowledge-engine)
6. [Omeda.city API Reference](#6-omedacity-api-reference)
7. [Asset Management](#7-asset-management)
8. [Navigation Structure](#8-navigation-structure)
9. [Feature Specifications](#9-feature-specifications)
10. [Build DNA System](#10-build-dna-system)
11. [AI Integration Layer](#11-ai-integration-layer)
12. [Free vs Premium Structure](#12-free-vs-premium-structure)
13. [Monetisation Strategy](#13-monetisation-strategy)
14. [Long-Term Roadmap](#14-long-term-roadmap)
15. [Open Questions](#15-open-questions)

---

## 1. Product Vision

Predecessor Labs is an intelligent companion platform for the game **Predecessor** — a third-person MOBA developed by Omeda Studios.

This is not a build database. The goal is to create a platform that helps players **understand**, **simulate**, **compare**, and **optimise** their decisions through a combination of deterministic calculation, curated knowledge, and AI-assisted coaching.

The core premise: **Data calculates. AI explains. Players improve.**

---

## 2. Core Pillars

| Pillar | Description |
|---|---|
| **Simulation** | A deterministic build and matchup engine. Accurate hero stat calculations, item impact modelling, and build performance scoring — all computed locally before any AI is involved. |
| **Knowledge** | A complete Predecessor information hub: heroes, items, crests, eternals, abilities, meta trends, patch history, and community content. |
| **Intelligence** | AI-powered explanations that interpret the data and provide human-readable coaching, recommendations, and strategic insight. AI never calculates — it interprets. |

---

## 3. Guiding Principles

1. **Deterministic first.** The application's own engine produces all statistics and comparisons. AI is strictly used for explanation and analysis, never for computation.
2. **Honest intelligence.** AI analysis should be direct, evidence-based, and willing to challenge user decisions. It should not simply praise builds.
3. **Data integrity.** The Firebase database is the source of truth. External APIs are synchronisation sources only.
4. **No lock-in.** Core features are free. Premium features enhance the experience but are never required to use the app meaningfully.
5. **Database first.** Before any UI or layout work begins, an extensively robust database and retrieval system must be in place. The Knowledge Engine is the backbone of everything.

---

## 4. Target Audience

| Segment | Description |
|---|---|
| **New players** | Learning hero roles, item categories, and basic build concepts. |
| **Mid-tier players** | Building optimised, contextual builds and understanding meta shifts. |
| **Competitive players** | Performing detailed hero matchup analysis and build theory-crafting. |
| **Creators & enthusiasts** | Sharing builds and content; discovering trending strategies. |

---

## 5. Data Architecture & Knowledge Engine

> [!IMPORTANT]
> The Predecessor Knowledge Engine is the backbone of the entire platform. All UI features depend on this layer being robust, complete, and accurately maintained.

### 5.1 Database Platform

**Firebase** (Firestore + Firebase Storage) serves as the primary data store.

- All data served to the client comes from Firebase.
- External APIs are never queried directly by clients.
- A server-side sync layer manages ingestion from Omeda.city / pred.gg.

### 5.2 Data Categories

| Category | Type | Update Frequency | Source |
|---|---|---|---|
| Heroes | Static | Per patch (~4–6 weeks) | Omeda.city API |
| Items | Static | Per patch | Omeda.city API |
| Crests | Static | Per patch | Omeda.city API |
| Eternals | Static | Per patch | Omeda.city API |
| Abilities | Static | Per patch | Omeda.city API |
| Builds (community) | Static | Per patch + on-demand | Omeda.city API |
| Match data | Dynamic | Every 12–24 hours | Omeda.city API |
| Hero statistics | Dynamic | Every 12–24 hours | Omeda.city API |
| Leaderboard | Dynamic | Every 12–24 hours | Omeda.city API |
| Player data | Dynamic | On-demand / cached | Omeda.city API |
| Meta trends | Derived | Computed from match data | Internal engine |
| Patch notes | Static | Per patch | Manual / official sources |

### 5.3 Firestore Collections Schema

```
/heroes/{heroSlug}
  id, name, display_name, slug, image_url
  classes[], roles[]
  stats[4]  // [damage, durability, cc, mobility] - 1-10 scale
  abilities[]
    display_name, key, image_url
    game_description, menu_description
    cooldown[], cost[]
  base_stats
    max_health[], max_mana[], physical_power[]
    physical_armor[], magical_armor[]
    attack_speed[], attack_range[]
    base_movement_speed[], cleave[]
    base_health_regeneration[], base_mana_regeneration[]
    basic_attack_time[]
  last_updated, patch_version

/items/{itemSlug}
  id, game_id, name, display_name, slug, image_url
  price, total_price
  slot_type  // Crest, Passive, Active, Trinket
  rarity     // Common, Uncommon, Rare, Epic, Legendary
  aggression_type
  hero_class
  stats{}    // key-value stat bonuses
  effects[]
    name, active, condition, cooldown, menu_description
  requirements[]   // item slugs
  build_paths[]    // item slugs
  last_updated, patch_version

/meta_snapshots/{date}
  hero_win_rates{}
  hero_pick_rates{}
  popular_builds{}
  trending_items[]
  computed_at

/players/{playerId}
  display_name, rank, mmr
  statistics{}, hero_statistics[]
  cached_at

/matches/{matchId}
  raw match data
  ingested_at

/builds/{buildId}
  hero_id, role
  items[], crests[], eternals[]
  player_id, name, skill_order
  version, created_at
```

### 5.4 Calculation Engine

All build statistics are computed deterministically within the application. No AI or external service is involved.

**Stat sources per hero at level N:**

- `base_stats[N]` — pulled directly from the hero data array (18 values, index 0–17 = Level 1–18)
- Item bonuses — flat stat additions from `item.stats{}`
- Item effects — calculated conditionally based on effect logic
- Scaling coefficients — stored per item where applicable

**Computed outputs:**

| Metric | Formula Notes |
|---|---|
| Total HP | `base_stats.max_health[level-1] + sum(item.stats.max_health)` |
| Total Physical Power | `base_stats.physical_power[level-1] + sum(item.stats.physical_power)` |
| Effective HP (Physical) | `Total HP × (1 + Physical Armor / 100)` |
| Effective HP (Magical) | `Total HP × (1 + Magical Armor / 100)` |
| Attack Speed | `base_stats.attack_speed[level-1] + (sum(item.stats.attack_speed) / 100)` |
| DPS (Basic) | `Physical Power × Attack Speed` |
| Ability damage (scaled) | `base_ability_damage + (AP × scaling_coefficient)` |

> [!NOTE]
> Specific formulas for penetration, lifesteal, omni-vamp, and conditional item effects will be finalised during the engine implementation phase based on Predecessor's actual game mechanics. These should be validated against observed in-game results.

---

## 6. Omeda.city API Reference

> **Base URL:** `https://omeda.city`  
> **Note:** The site is migrating to `https://pred.gg`. Both should be supported. No rate limits currently enforced — use responsibly.

### 6.1 Static Data Endpoints (Patch-cadence sync)

| Endpoint | Description |
|---|---|
| `GET /heroes.json` | All heroes with full stats, abilities, base_stats |
| `GET /heroes/{hero_name}.json` | Single hero detail |
| `GET /items.json` | All items including crests, actives, trinkets |
| `GET /items/{item_name}.json` | Single item detail |

**Hero data shape (key fields):**
```json
{
  "id": 54,
  "name": "Terra",
  "display_name": "Terra",
  "slug": "terra",
  "image": "/assets/91a5c5becfc823d0.webp",
  "stats": [7, 6, 3, 5],  // [damage, durability, cc, mobility]
  "classes": ["Fighter"],
  "roles": ["Offlane", "Jungle"],
  "abilities": [
    {
      "display_name": "Wild Rush",
      "image": "/assets/...",
      "game_description": "...",
      "menu_description": "...",
      "cooldown": [18.0, 17.0, 16.0, 15.0, 14.0],
      "cost": [80.0, 80.0, 80.0, 80.0, 80.0],
      "key": "RMB"
    }
  ],
  "base_stats": {
    "max_health": [710.0, 801.0, ..., 2920.0],  // 18 values (L1-L18)
    "physical_power": [67.0, ..., 146.9],
    "physical_armor": [35.0, ..., 123.4],
    "magical_armor": [33.0, ..., 61.9],
    "attack_speed": [1.2, ..., 1.455],
    "base_movement_speed": [695.0],
    "attack_range": [300.0],
    "max_mana": [330.0, ..., 1265.0],
    "base_health_regeneration": [2.1, ..., 5.84],
    "base_mana_regeneration": [1.5, ..., 5.24],
    "basic_attack_time": [1.15],
    "cleave": [0.2]
  }
}
```

**Item data shape (key fields):**
```json
{
  "id": 30,
  "game_id": 200403,
  "name": "WizardCrest",
  "display_name": "Wizard Crest",
  "slug": "wizard-crest",
  "image": "/assets/ddf8c5f962304110.webp",
  "price": 0,
  "total_price": 0,
  "slot_type": "Crest",
  "rarity": "Legendary",
  "aggression_type": "Offense",
  "hero_class": "Mage",
  "stats": {
    "magical_power": 15.0,
    "max_mana": 125.0,
    "ability_haste": 6.0
  },
  "effects": [
    {
      "name": "Legendary Magician",
      "active": false,
      "condition": "On Ability Hits to Heroes...",
      "cooldown": null,
      "menu_description": "..."
    }
  ],
  "requirements": ["MagicianCrest"],
  "build_paths": ["Epoch", "Soulbearer", "TimeFluxBand", "Voidgazer"]
}
```

### 6.2 Dynamic Data Endpoints (12–24 hour sync)

| Endpoint | Description | Key Params |
|---|---|---|
| `GET /dashboard/hero_statistics.json` | Aggregated hero win/pick rates | `hero_ids[]`, `time_frame`, `game_mode` |
| `GET /matches.json` | Chronological match list | `timestamp`, `cursor`, `per_page` (max 100) |
| `GET /matches/{match_id}.json` | Single match full data | — |
| `GET /players.json` | Leaderboard | `page`, `filter[name]`, `filter[include_inactive]` |
| `GET /players/{player_id}.json` | Player profile | — |
| `GET /players/{player_id}/matches.json` | Player match history | `time_frame`, `page`, `per_page`, `filter[hero_id]`, `filter[role]` |
| `GET /players/{player_id}/statistics.json` | Player stats | `time_frame` |
| `GET /players/{player_id}/hero_statistics.json` | Per-hero player stats | `hero_ids[]`, `time_frame`, `filter[role]` |
| `GET /builds.json` | Community builds | `page`, `filter[hero_id]`, `filter[role]`, `filter[order]` (latest/trending/popular) |
| `GET /builds/{build_id}.json` | Single build | — |

### 6.3 Sync Strategy

**Patch-cadence sync (manual trigger + scheduled):**
- Triggered manually after each game patch by admin
- Also runs on a monthly fallback schedule
- Syncs heroes, items, crests, eternals, abilities to Firestore

**Dynamic sync (automated cron):**
- Every 12 hours: hero_statistics, match data ingestion (cursor-paginated)
- Every 24 hours: leaderboard snapshot, meta trend computation
- Player data: fetched on-demand and cached with TTL

**Image assets:**
- On initial sync, download and store all `/assets/*.webp` images to Firebase Storage
- Serve all images from Firebase Storage CDN, never from omeda.city directly
- Asset URL stored in Firestore document alongside data

---

## 7. Asset Management

### 7.1 Asset Priority

1. **Firebase Storage** (primary) — images ingested from API and stored
2. **Manually provided assets** — uploaded to designated folders
3. **Direct API URL** (fallback only) — used if Firebase storage unavailable

### 7.2 Manual Asset Folder Structure

> [!IMPORTANT]
> Approximately 90% of hero and item assets are already available locally. Place them in the following folder structure within the project before the database sync runs. The sync script will prioritise these over API fetches if a file with the matching name exists.

```
/assets/
  /heroes/
    terra.webp
    shinbi.webp
    gideon.webp
    gadget.webp
    mourn.webp
    ikra.webp
    ... (one file per hero, named by slug)

  /items/
    wizard-crest.webp
    titan-crest.webp
    aegis-of-agawar.webp
    combustion.webp
    ... (one file per item, named by slug)

  /abilities/
    terra_wild-rush.webp
    shinbi_rushing-beat.webp
    ... (named as {hero_slug}_{ability_slug}.webp)

  /ui/
    ... (app icons, backgrounds, placeholder images)
```

> [!NOTE]
> For any missing heroes or items (~10% of assets), the sync script will attempt to download from the Omeda.city API CDN (`https://omeda.city/assets/{hash}.webp`) and store to Firebase Storage automatically.

---

## 8. Navigation Structure

The app uses a **bottom navigation bar** with five sections:

| Tab | Icon | Description |
|---|---|---|
| **Lab** | Flask / Beaker | Core build and simulation experience |
| **Feed** | Newspaper | Predecessor news, community content, creator posts |
| **Library** | Book | Full searchable knowledge database |
| **Saved** | Bookmark | Locally stored builds (cloud sync in future) |
| **Meta** | Chart / Graph | Meta tracker — rising heroes, trends, patch analysis |

### Global Search

Available from any tab via a persistent search bar or keyboard shortcut.

Searches across:
- Heroes (by name, class, role)
- Items (by name, type, stat)
- Abilities (by name)
- Builds (by hero, role, name)
- Patch notes

---

## 9. Feature Specifications

### 9.1 Entry Experience (Lab Landing)

On first open:
1. User lands on the **Lab** page
2. A fade-in CTA appears: **"Pick Your Hero"**
3. User either:
   - Selects a hero from a visual hero grid → begins the Lab flow
   - Dismisses / skips → enters the Feed

No account or sign-in required initially. All user data (saves, preferences) stored locally.

---

### 9.2 Lab — Step 1: Hero Selection & Overview

After selecting a hero, a **collapsible hero overview panel** appears.

**Displays:**
- Hero portrait (image asset)
- Hero class (e.g. Fighter, Mage, Assassin, Support, Sharpshooter)
- Roles (e.g. Offlane, Jungle, Midlane, Carry, Support)
- Short description / lore blurb
- Abilities grid (icon, name, key binding)
- Clicking an ability shows: game_description, menu_description, cooldowns per rank, cost per rank
- Base stats at Level 1

---

### 9.3 Lab — Step 2: Level Simulation

A **level slider** (1 → 18) dynamically recalculates and displays:

| Stat | Source |
|---|---|
| Health | `base_stats.max_health[level-1]` |
| Mana | `base_stats.max_mana[level-1]` |
| Physical Power | `base_stats.physical_power[level-1]` |
| Physical Armor | `base_stats.physical_armor[level-1]` |
| Magical Armor | `base_stats.magical_armor[level-1]` |
| Attack Speed | `base_stats.attack_speed[level-1]` |
| Movement Speed | `base_stats.base_movement_speed[0]` (flat) |
| HP Regen | `base_stats.base_health_regeneration[level-1]` |
| Mana Regen | `base_stats.base_mana_regeneration[level-1]` |
| Attack Range | `base_stats.attack_range[0]` (flat) |
| Cleave | `base_stats.cleave[0]` (flat) |

Ability values also update dynamically as the user adjusts the level slider (ability ranks unlock at levels 1, 4, 6, 8, 10 by default).

---

### 9.4 Lab — Step 3: Build Creation

Users select:
- Up to **6 items** (from full item database, filtered by hero class if desired)
- 1 **Crest** (filtered from Crest slot_type items)
- Eternals (if applicable — displayed separately)

**UI behaviour:**
- Item grid shows icons, name, total price, slot type, rarity
- Clicking an item adds it to the build slot; clicking again removes it
- Build visually updates in real time
- Running stat totals update dynamically as items are added
- Build path validation: warn if item prerequisites are not met

**Build summary panel shows:**
- Total gold cost
- All combined stat bonuses
- Effective HP (physical and magical)
- Total item effects list

---

### 9.5 Build DNA

Every build receives a **visual identity profile** across 7 dimensions:

| Dimension | Description |
|---|---|
| **Burst** | One-shot potential — high peak damage output in short windows |
| **Sustain** | Lifesteal, healing, shields, over-time damage resistance |
| **Tankiness** | Raw durability — HP + armour totals |
| **Scaling** | How much power is gained late-game vs early-game |
| **Mobility** | Movement speed bonuses, gap-close potential |
| **Utility** | CC, anti-heal, shred, team-wide effects |
| **Objective Damage** | Items with Max HP % damage effects or structure damage bonuses |

Each dimension is scored 0–10 based on deterministic item/stat analysis.

**Visual representation:**
```
Burst:             ████████░░  8.0
Sustain:           ████░░░░░░  4.0
Tankiness:         ██████░░░░  6.0
Scaling:           ████████░░  8.0
Mobility:          ███░░░░░░░  3.0
Utility:           █████░░░░░  5.0
Objective Damage:  ██████░░░░  6.0
```

This is displayed alongside a plain-language build identity tag, e.g.:
- *"Late-game Burst Assassin"*
- *"Frontline Tank with Crowd Control"*
- *"Sustained Damage Sharpshooter"*

---

### 9.6 Build Simulation

When the user triggers **"Simulate Your Build"**, the app runs the calculation engine and produces a full report.

**Report sections:**

#### Statistical Breakdown
At each milestone:
- Level 1 (base)
- After Tier 1 item completed
- After Tier 2 items completed
- After Tier 3 items completed
- Full 6-item build

Shows total stats, delta from previous milestone, power spikes identified.

#### Power Spike Analysis
Flag moments where the build has disproportionate power:
- *"Power spike at first item complete — Burst potential jumps 40%"*
- *"Late-game breakpoint at full build — Effective HP exceeds most tanks"*

#### Strengths & Weaknesses

**Auto-generated from deterministic rules:**

| Signal | Condition |
|---|---|
| "High burst potential" | Burst DNA score > 7 |
| "Strong anti-tank" | Build contains physical/magical penetration > 25 |
| "Low survivability" | Effective HP < threshold for hero class |
| "Weak early game" | First item total price > 2,500 gold |
| "CC-heavy" | Multiple items with utility effects |

#### Build Confidence Score

```
Confidence: 87%

Based on:
  ✓ Current patch data
  ✓ Deterministic stat calculations
  ✓ Historical win-rate correlation
  ~ Limited match data for this exact combination
```

Confidence factors:
- Patch recency (higher = more confidence)
- Amount of match data for hero + role combination
- Whether items are in active use at high ranks
- Deviation from known high-performing builds

---

### 9.7 Hero Comparison

Users can select a second hero alongside the first.

**Comparison view shows:**
- Side-by-side stat table at matching level
- DNA profile comparison (two overlapping radar charts or bar pairs)
- Scaling difference graph (stat growth across levels 1–18)

**If both heroes have builds:**
- **Matchup Score** generated from deterministic formula

```
Matchup Score: 64 / 100

Advantage Breakdown:
  Early Game:    -8   (Hero B has superior Level 1-5 stats)
  Scaling:      +15   (Hero A outscales significantly)
  Teamfight:    +12   (Hero A's AoE and CC superior)
  Survivability: +5   (Hero A has higher Effective HP)
  Mobility:      -3   (Hero B has movement advantage)
```

> [!NOTE]
> The Matchup Score formula will be designed separately. It must always explain WHY. The score is meaningless without the contributing factors displayed.

---

### 9.8 Explain This

Contextual explanations available throughout the app — most without AI.

**Trigger points:**
- "Why is this item stronger for my build?"
- "Why is my matchup score low?"
- "Why does this stat matter?"
- "What does this effect do?"

**Explanation sources (in priority order):**
1. **Deterministic rule engine** — comparisons, threshold explanations, stat context
2. **Curated text library** — pre-written explanations for common concepts
3. **AI (premium)** — deeper analysis when deterministic explanations are insufficient

**Example deterministic explanation:**
> *"Combustion improves your build because your magical penetration goes from 9 to 18. Against a hero with 60 magical armor, this changes your effective magic penetration from 15% to 30% — meaning your abilities deal 17% more damage to this target."*

---

### 9.9 Feed

A visually differentiated Predecessor content hub.

**Content sources:**
- Official Predecessor blog / patch notes
- Official social media (X/Twitter, Instagram)
- Reddit (`r/PredecessorGame`)
- YouTube creator content
- Featured creator content (sponsored)

**Post types:**
| Type | Visual Treatment |
|---|---|
| Official | Omeda Studios badge, distinct border |
| Community | Standard card |
| Creator | Creator avatar, platform badge |
| Sponsored/Featured | "Featured" tag — always clearly labelled |

Posts displayed chronologically. Infinite scroll or paginated.

**Monetisation:**
- Creators can pay for **featured placement** of content
- Sponsored sections always clearly labelled — never disguised as organic

---

### 9.10 Library

Searchable knowledge database.

**Sections:**
- **Heroes** — full hero roster with class, role, abilities, stats
- **Items** — complete item database with build paths, effects, stat values
- **Crests** — crest slot items with evolution paths
- **Eternals** — eternal items (separate display from standard items)
- **Abilities** — searchable ability database with descriptions and values
- **Patch History** — patch-by-patch change log

**Library item detail pages show:**
- Full stat block
- All effects with conditions
- Item build path (what it builds from, what it builds into)
- Historical availability (which patches it existed in)
- Related items (items in the same aggression_type group)
- Community build frequency (how often it appears in popular builds)

---

### 9.11 Saved Builds

**Phase 1 (Local):**
- Builds saved to device localStorage / IndexedDB
- Displayed in a named list
- Support for custom lab names (user names their build session)

**Phase 2 (Cloud — future):**
- User accounts
- Cloud sync via Firebase Authentication
- Public build sharing with unique URLs

---

### 9.12 Meta Tracker

A practical, player-focused meta view — not just patch notes.

**Components:**

| Section | Description |
|---|---|
| Rising Heroes | Heroes whose win rate / pick rate has increased since last snapshot |
| Falling Heroes | Heroes whose performance is declining |
| Popular Builds | Most common item combinations per hero per role |
| Trending Items | Items appearing in more builds than previous period |
| Meta Shifts | Detected changes in team composition patterns |
| Patch Analysis | AI summary of patch changes and their practical impact |

**Data source:**
- Computed from `dashboard/hero_statistics` snapshots
- Match data ingested via cursor-paginated `/matches.json` sync
- Delta computed between snapshots (e.g., current week vs previous week)

---

## 10. Build DNA System

### Scoring Methodology

Each DNA dimension is scored 0–10 using a weighted combination of item stats and effects.

| Dimension | Primary Signals |
|---|---|
| Burst | `magical_power`, `physical_power`, `physical_penetration`, `magical_penetration`, `critical_chance` — especially items tagged `aggression_type: Burst` |
| Sustain | `lifesteal`, `magical_lifesteal`, `omnivamp`, `heal_shield_increase`, `health_regeneration` |
| Tankiness | `max_health`, `physical_armor`, `magical_armor`, items tagged `aggression_type: Defense` |
| Scaling | Items with stack-accumulation effects (`AdeptusStack`, `Alternator`, `Malice`), late-game multipliers |
| Mobility | `movement_speed`, items with movement passives or dashes |
| Utility | Items with `condition` effects involving CC, anti-heal (`AntiHeal` aggression_type), shred effects |
| Objective Damage | Items with % max health damage, structure damage bonuses |

### Build Identity Tags

Based on the top-2 DNA dimensions:

| Top Dimensions | Tag |
|---|---|
| Burst + Scaling | Late-Game Burst |
| Sustain + Tankiness | Frontline Bruiser |
| Burst + Mobility | Diving Assassin |
| Utility + Tankiness | Disruptive Tank |
| Sustain + Scaling | Hypercarry |
| Burst + Utility | CC-Burst Mage |

---

## 11. AI Integration Layer

> [!IMPORTANT]
> AI is **never** used to calculate statistics. The calculation engine produces all numbers. AI receives pre-computed data as input and produces natural-language output only.

### 11.1 Free AI Features

- **Explain This** — simple contextual explanations triggered in-app
- **Meta Summaries** — brief AI-written summaries of meta shifts (e.g., "This patch buffed physical penetration items, which has elevated Sharpshooters significantly in ranked play")

### 11.2 Premium AI Features

**Full Build Analysis** — user submits a build and receives:

**Input provided to AI:**
```json
{
  "hero": { ...hero_data },
  "level": 18,
  "build": [ ...item_data ],
  "computed_stats": { ...all_calculated_stats },
  "build_dna": { ...dna_scores },
  "matchup": { ...matchup_data },
  "meta_context": { ...current_meta_snapshot },
  "patch_version": "current"
}
```

**AI output format:**
1. Build overview (2–3 sentences, direct assessment)
2. Strengths — specific and evidence-referenced
3. Weaknesses — honest, not softened
4. Item choices — explains why each item is or isn't optimal
5. Alternative suggestions — with specific reasoning
6. Meta comparison — how this build compares to current meta builds for the hero

**Tone guidance:**
- Direct and analytical
- Evidence-based ("Your physical penetration of 35 means you bypass 35% of enemy armor...")
- Willing to criticise ("The inclusion of X item is suboptimal here because...")
- Never simply validating ("Great build!") without substantiation

---

## 12. Free vs Premium Structure

| Feature | Free | Premium |
|---|---|---|
| Hero library & stats | ✅ | ✅ |
| Item library & build paths | ✅ | ✅ |
| Level simulation | ✅ | ✅ |
| Build creation (up to 3 saved) | ✅ | ✅ |
| Build DNA profile | ✅ | ✅ |
| Strengths & Weaknesses | ✅ | ✅ |
| Build Confidence Score | ✅ | ✅ |
| Explain This (deterministic) | ✅ | ✅ |
| Meta Tracker (summary) | ✅ | ✅ |
| Hero Comparison | ✅ | ✅ |
| Matchup Score | ✅ | ✅ |
| Feed | ✅ | ✅ |
| Unlimited saved builds | ❌ | ✅ |
| Full AI Build Analysis | ❌ | ✅ |
| AI Explain This (deep) | ❌ | ✅ |
| AI meta analysis (detailed) | ❌ | ✅ |
| Priority data refresh | ❌ | ✅ |
| Cloud build sync | ❌ | ✅ (future) |
| Ad-free experience | ❌ | ✅ |

---

## 13. Monetisation Strategy

| Stream | Description |
|---|---|
| **Premium subscription** | Monthly / annual plan unlocking all premium features |
| **Feed sponsored content** | Creators pay for featured placement — clearly labelled |
| **Display advertising** | Shown to free users only — never to premium |

---

## 14. Long-Term Roadmap

| Phase | Features |
|---|---|
| **Phase 1 (Foundation)** | Knowledge Engine, Firebase sync, Hero/Item Library, Lab (basic), Meta Tracker |
| **Phase 2 (Simulation)** | Level simulation, Build DNA, Strengths/Weaknesses, Explain This, Build Confidence |
| **Phase 3 (Intelligence)** | AI Build Analysis (premium), Matchup Score, Hero Comparison |
| **Phase 4 (Accounts)** | User accounts, cloud sync, public build sharing, creator profiles |
| **Phase 5 (Community)** | Draft assistant, team composition analysis, Discord integration |
| **Phase 6 (Coaching)** | Personal performance coaching, replay analysis, improvement tracking |

---

## 15. Open Questions

> [!IMPORTANT]
> These items need resolution before or during implementation. Please review and provide answers or decisions.

1. **Eternals data source** — The Omeda.city API exposes items (which may include eternal-category items) but there is no dedicated `/eternals.json` endpoint documented. Do you have local eternal data, or should these be filtered from the items endpoint by `slot_type` or `rarity`? Can you share how eternals are structured in-game?

2. **Matchup Score formula** — The score formula is referenced as "to be developed separately." Do you want to define this before implementation, or should a placeholder formula be built first and refined later?

3. **Feed content sources** — Which specific sources should be prioritised first? (Reddit, official blog, YouTube, X?) Do you have API keys or RSS feeds for any of these?

4. **AI provider** — Which AI provider/model will power the premium AI features? (e.g., Gemini, OpenAI, Claude?) This affects the API integration layer design.

5. **Domain / hosting** — Will this be hosted on Firebase Hosting, Vercel, or elsewhere? This affects build pipeline decisions.

6. **Platform priority** — Web app first? Or simultaneously targeting iOS/Android via React Native or Flutter?

7. **"Lab naming"** — The concept mentions users naming their lab sessions. What is the intended UX here — does naming happen at save time, or is the session always named from creation?

8. **Manual asset confirmation** — Can you confirm the local folder path where your ~90% asset collection lives so we can reference it in the sync script?

9. **Ability rank unlock levels** — Do abilities in Predecessor follow a fixed unlock schedule (e.g., RMB at 1, Q at 2, E at 4, R at 6)? This affects how the level slider updates displayed ability values.

10. **pred.gg migration** — The Omeda.city news mentions moving to `pred.gg`. Should we build the sync layer targeting `pred.gg` as primary with `omeda.city` as fallback, or vice versa?

---

*End of Document — Predecessor Labs PRD v1.0*
