/**
 * Centralized type definitions for Predecessor Build Lab.
 * Re-exports domain types from simulation engine and sync modules,
 * and defines shared UI state types used across views.
 */

// ── Domain Types (re-exported from simulation engine) ─────────────────────────
export type {
  HeroDoc,
  HeroAbility,
  HeroBaseStats,
  HeroDnaProfile,
  HeroAugment,
  ItemDoc,
  EternalDoc,
  BuildDna,
  MilestoneStats,
  BuildAnalysisResult,
} from '@/lib/simulation/engine'

// ── Sync Types ────────────────────────────────────────────────────────────────
export type { SavedBuild } from '@/lib/sync/build-sync'
export type { SavedPost } from '@/lib/sync/post-sync'

// ── Re-export sync constants ──────────────────────────────────────────────────
export {
  FREE_BUILD_LIMIT,
  PREMIUM_BUILD_LIMIT,
} from '@/lib/sync/build-sync'

export {
  FREE_POST_LIMIT,
  PREMIUM_POST_LIMIT,
} from '@/lib/sync/post-sync'

// ── UI State Types ────────────────────────────────────────────────────────────
export type TabId = 'home' | 'lab' | 'guides' | 'heroes' | 'feed' | 'library' | 'saved' | 'meta' | 'profile'

export type MetaGameMode = 'ranked' | 'unranked' | 'aram'

export type MetaRankTier = 'all' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'paragon'

export type LibrarySection = 'heroes' | 'items' | 'crests' | 'eternals' | 'patches'

export type FeedFilter = 'all' | 'official' | 'ai_posts' | 'youtube'

export type BrowserTab = 'items' | 'crests' | 'eternals' | 'augments'

// ── Dashboard Props (passed via getStaticProps) ───────────────────────────────
export interface DashboardProps {
  heroes: import('@/lib/simulation/engine').HeroDoc[]
  items: import('@/lib/simulation/engine').ItemDoc[]
  eternals: import('@/lib/simulation/engine').EternalDoc[]
  feedItems: any[]
  metaSnapshots: any[]
  metaNarratives: any[]
  patches: any[]
  aggregatedStats: Record<string, Record<string, {
    win_rate: number
    pick_rate: number
    ban_rate: number
    match_count: number
  }>>
  newestHero: import('@/lib/simulation/engine').HeroDoc | null
}
