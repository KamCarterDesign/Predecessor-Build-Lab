import React, { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { getFirestore } from '@/lib/firebase-admin'
import { calculateBuildStats, HeroDoc, ItemDoc, EternalDoc, BuildAnalysisResult, BuildDna } from '@/lib/simulation/engine'
import { calculateMatchupScore } from '@/lib/simulation/matchup'
import { explainDeterministic, ExplanationResult } from '@/lib/simulation/rules-engine'
import { parseDescription, getStatIconHtml } from '@/lib/utils/description-parser'
import { useAuth } from '@/lib/auth-context'
import { AuthModal } from '@/components/auth/AuthModal'
import { ProfileDashboard } from '@/components/profile/ProfileDashboard'
import { syncBuildsToCloud, fetchCloudBuilds, saveCloudBuild, deleteCloudBuild, FREE_BUILD_LIMIT, PREMIUM_BUILD_LIMIT, SavedBuild } from '@/lib/sync/build-sync'
import { SubscriptionModal } from '@/components/premium/SubscriptionModal'
import { CommunityBuilds } from '@/components/community/CommunityBuilds'

interface DashboardProps {
  heroes: HeroDoc[]
  items: ItemDoc[]
  eternals: EternalDoc[]
  feedItems: any[]
  metaSnapshots: any[]
  metaNarratives: any[]
}

export async function getServerSideProps() {
  try {
    const db = getFirestore()
    const heroesSnap = await db.collection('heroes').get()
    const itemsSnap = await db.collection('items').get()
    const eternalsSnap = await db.collection('eternals').get()
    
    const feedItemsSnap = await db.collection('feed_items').orderBy('timestamp', 'desc').limit(50).get()
    const metaSnapshotsSnap = await db.collection('meta_snapshots').orderBy('computed_at', 'desc').limit(5).get()
    const metaNarrativesSnap = await db.collection('meta_narratives').orderBy('last_updated', 'desc').limit(5).get()

    const heroes = heroesSnap.docs.map((doc: any) => doc.data())
    const items = itemsSnap.docs.map((doc: any) => doc.data())
    const eternals = eternalsSnap.docs.map((doc: any) => doc.data())
    const feedItems = feedItemsSnap.docs.map((doc: any) => doc.data())
    const metaSnapshots = metaSnapshotsSnap.docs.map((doc: any) => doc.data())
    const metaNarratives = metaNarrativesSnap.docs.map((doc: any) => doc.data())

    return {
      props: {
        heroes: JSON.parse(JSON.stringify(heroes)),
        items: JSON.parse(JSON.stringify(items)),
        eternals: JSON.parse(JSON.stringify(eternals)),
        feedItems: JSON.parse(JSON.stringify(feedItems)),
        metaSnapshots: JSON.parse(JSON.stringify(metaSnapshots)),
        metaNarratives: JSON.parse(JSON.stringify(metaNarratives)),
      },
    }
  } catch (error) {
    console.error('Error fetching server side props:', error)
    return {
      props: {
        heroes: [],
        items: [],
        eternals: [],
        feedItems: [],
        metaSnapshots: [],
        metaNarratives: [],
      },
    }
  }
}

const dnaTooltips: Record<string, string> = {
  burst: "Burst factors in power (magical/physical depending on scaling) multiplied by critical strike or penetration, representing your potential to deal massive damage quickly. It compares level 1 baselines and accounts for item power, penetrations, and basic attack crits.",
  tankiness: "Tankiness is based on a hero's health, armor, and stat growth over time. Since base stats are factored in, no hero starts at 0, and naturally sturdier heroes like Steel will scale and widen the gap against squishier heroes like Gadget.",
  scaling: "Scaling tracks flat values added by stacking passive abilities (e.g. Renna's soul stacks, Gadget's magic power stacks), items that scale over time (like Overlord health stacks from unit kills), and Eternals. Excludes standard level stat growth; if none are present, it remains 0.",
  mobility: "Mobility is calculated from base movement speed, movement speed growth, and dash/teleport abilities, enhanced by flat percentage increases from items, abilities, and Eternals.",
  objective_damage: "Objective Damage represents the capability to deal increased damage to monsters, minions, or structures. It sums flat percentage increases provided by hero abilities, items, or Eternals.",
  sustain: "Sustain measures health regeneration, shields, healing abilities, and lifesteal or omnivamp sources from your kit and items.",
  utility: "Utility represents crowd control capabilities, including stuns, slows, silences, pulls, and roots from abilities and item passives.",
}

const STAT_PRIORITY: Record<string, number> = {
  physical_power: 1,
  magical_power: 2,
  energy_power: 2,
  max_health: 3,
  health: 3,
  physical_armor: 4,
  magical_armor: 5,
  ability_haste: 6,
  physical_penetration: 7,
  magical_penetration: 8,
  critical_chance: 9,
  crit_chance: 9,
  attack_speed: 10,
  lifesteal: 11,
  magical_lifesteal: 12,
  omnivamp: 13,
  heal_shield_increase: 14,
  max_mana: 15,
  mana: 15,
  health_regeneration: 16,
  base_health_regeneration: 16,
  mana_regeneration: 17,
  base_mana_regeneration: 17,
  movement_speed: 18,
  tenacity: 19,
  gold_per_second: 20,
}

export function sortItemStats(stats: Record<string, number> = {}): [string, number][] {
  return Object.entries(stats)
    .filter(([_, val]) => val !== 0 && val !== null && val !== undefined)
    .sort(([keyA], [keyB]) => {
      const priorityA = STAT_PRIORITY[keyA] ?? 99
      const priorityB = STAT_PRIORITY[keyB] ?? 99
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      return keyA.localeCompare(keyB)
    })
}

function getStatIconId(statKey: string): string {
  if (statKey.includes('physical_power')) return 'ADIconOrange'
  if (statKey.includes('magical_power') || statKey.includes('energy_power')) return 'APIconBlue'
  if (statKey.includes('health_regeneration') || statKey.includes('base_health_regeneration')) return 'HealthRegen'
  if (statKey.includes('health') || statKey.includes('max_health')) return 'HealthIconGreen'
  if (statKey.includes('physical_armor')) return 'ArmorOrange'
  if (statKey.includes('magical_armor')) return 'MRIcon'
  if (statKey.includes('haste')) return 'AbilityHaste'
  if (statKey.includes('physical_penetration')) return 'PhysPen'
  if (statKey.includes('magical_penetration')) return 'MagPen'
  if (statKey.includes('crit')) return 'CritIconGold'
  if (statKey.includes('attack_speed')) return 'ASIconOrange'
  if (statKey.includes('magical_lifesteal')) return 'MagicalLifesteal'
  if (statKey.includes('lifesteal')) return 'Lifesteal'
  if (statKey.includes('omnivamp')) return 'Omnivamp'
  if (statKey.includes('heal_shield')) return 'HealShield'
  if (statKey.includes('mana_regeneration') || statKey.includes('base_mana_regeneration')) return 'ManaRegen'
  if (statKey.includes('mana') || statKey.includes('max_mana')) return 'ManaBlue'
  if (statKey.includes('movement_speed')) return 'MovementSpeed'
  if (statKey.includes('tenacity')) return 'Tenacity'
  if (statKey.includes('gold_per_second')) return 'GoldPerSecond'
  return 'BonusDamage'
}

export default function Dashboard({ heroes = [], items = [], eternals = [], feedItems = [], metaSnapshots = [], metaNarratives = [] }: DashboardProps) {
  // ── Tab State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'lab' | 'feed' | 'library' | 'saved' | 'meta' | 'profile'>('lab')
  
  // ── Auth State ──────────────────────────────────────────────────────────────
  const { user, isPremium } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // ── Lab State ──────────────────────────────────────────────────────────────
  const [selectedHero, setSelectedHero] = useState<HeroDoc | null>(null)
  const [levelA, setLevelA] = useState<number>(1)
  const [buildItems, setBuildItems] = useState<ItemDoc[]>([])
  const [buildCrest, setBuildCrest] = useState<ItemDoc | null>(null)
  const [buildEternal, setBuildEternal] = useState<EternalDoc | null>(null)
  const [buildRole, setBuildRole] = useState<string>('Offlane')

  // ── Hero B (Comparison) State ──────────────────────────────────────────────
  const [selectedHeroB, setSelectedHeroB] = useState<HeroDoc | null>(null)
  const [levelB, setLevelB] = useState<number>(1)
  const [buildItemsB, setBuildItemsB] = useState<ItemDoc[]>([])
  const [buildCrestB, setBuildCrestB] = useState<ItemDoc | null>(null)
  const [buildEternalB, setBuildEternalB] = useState<EternalDoc | null>(null)
  const [buildRoleB, setBuildRoleB] = useState<string>('Offlane')
  const [isHeroBModalOpen, setIsHeroBModalOpen] = useState(false)
  const [activeBuild, setActiveBuild] = useState<'A' | 'B'>('A')

  // ── Premium & AI States ──────────────────────────────────────────────────
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'claude'>('gemini')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiAnalysisText, setAiAnalysisText] = useState('')
  const [aiExplainText, setAiExplainText] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isExplaining, setIsExplaining] = useState(false)

  // ── Explanation Rules Modal State ──────────────────────────────────────────
  const [explanationModal, setExplanationModal] = useState<ExplanationResult | null>(null)

  // ── Hero Filter State ──────────────────────────────────────────────────────
  const [heroSearch, setHeroSearch] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('All')
  const [selectedRole, setSelectedRole] = useState<string>('All')

  // ── Item Filter State ──────────────────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState('')
  const [itemTierFilter, setItemTierFilter] = useState<number>(3) // Default: Tier 3 (final)
  const [itemClassFilter, setItemClassFilter] = useState<string>('All')
  const [browserTab, setBrowserTab] = useState<'items' | 'crests' | 'eternals'>('items')
  const [visibleItemsCount, setVisibleItemsCount] = useState(16)
  const [visibleCrestsCount, setVisibleCrestsCount] = useState(16)
  const [visibleEternalsCount, setVisibleEternalsCount] = useState(16)
  const [activeStatFilters, setActiveStatFilters] = useState<string[]>([])
  const [selectedBlessings, setSelectedBlessings] = useState<string[]>([])
  const [selectedBlessingsB, setSelectedBlessingsB] = useState<string[]>([])
  const [shareSuccess, setShareSuccess] = useState(false)

  // ── Ability Overview Modal/Drawer ──────────────────────────────────────────
  const [selectedAbility, setSelectedAbility] = useState<any>(null)

  // ── Saved Builds State ─────────────────────────────────────────────────────
  const [savedBuilds, setSavedBuilds] = useState<any[]>([])
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [saveBuildName, setSaveBuildName] = useState('')
  const [saveBuildDesc, setSaveBuildDesc] = useState('')
  const [isPendingSaveAfterAuth, setIsPendingSaveAfterAuth] = useState(false)
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  // ── Global Search States ───────────────────────────────────────────────────
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false)

  // ── Library Sub-Navigation and Detailed Detail states ──────────────────────
  const [librarySection, setLibrarySection] = useState<'heroes' | 'items' | 'crests' | 'eternals' | 'patches'>('heroes')
  const [selectedLibraryHero, setSelectedLibraryHero] = useState<HeroDoc | null>(null)
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<ItemDoc | null>(null)
  const [selectedLibraryEternal, setSelectedLibraryEternal] = useState<EternalDoc | null>(null)
  const [libraryHeroLevel, setLibraryHeroLevel] = useState<number>(1)

  // ── Revamped Feed States ───────────────────────────────────────────────────
  const [feedFilter, setFeedFilter] = useState<'all' | 'official' | 'ai_posts' | 'youtube'>('all')
  const [ugcVideos, setUgcVideos] = useState<any[]>([])
  const [loadingUgc, setLoadingUgc] = useState<boolean>(false)
  const [selectedUgcVideoId, setSelectedUgcVideoId] = useState<string | null>(null)
  
  const [aiPosts, setAiPosts] = useState<any[]>([])
  const [loadingAiPosts, setLoadingAiPosts] = useState<boolean>(false)
  const [aiCategoryFilter, setAiCategoryFilter] = useState<string>('all')
  const [selectedAiPostModal, setSelectedAiPostModal] = useState<any | null>(null)

  const [officialNewsItems, setOfficialNewsItems] = useState<any[]>([])
  const [loadedFeedItems, setLoadedFeedItems] = useState<any[]>(feedItems)
  const [loadingMoreFeed, setLoadingMoreFeed] = useState(false)
  const [hasMoreFeed, setHasMoreFeed] = useState(true)

  // Fetch UGC YouTube Videos, AI Posts, and Official News on mount or filter change
  useEffect(() => {
    async function loadFeedData() {
      setLoadingUgc(true)
      setLoadingAiPosts(true)
      try {
        const [ytRes, postsRes, officialRes] = await Promise.all([
          fetch('/api/youtube/playlist'),
          fetch('/api/posts'),
          fetch('/api/feed?source=official&limit=20'),
        ])
        
        const ytData = await ytRes.json()
        if (ytData.videos) setUgcVideos(ytData.videos)

        const postsData = await postsRes.json()
        if (postsData.posts) setAiPosts(postsData.posts)

        const officialData = await officialRes.json()
        if (officialData.items) setOfficialNewsItems(officialData.items)
      } catch (err) {
        console.error('Error fetching revamped feed data:', err)
      } finally {
        setLoadingUgc(false)
        setLoadingAiPosts(false)
      }
    }

    loadFeedData()
  }, [])

  const maxFeedLimit = feedFilter === 'all' ? 150 : 50

  useEffect(() => {
    let active = true
    async function initFilter() {
      setLoadingMoreFeed(true)
      try {
        const res = await fetch(`/api/feed?source=${feedFilter}&limit=20`)
        const data = await res.json()
        if (data.success && active) {
          setLoadedFeedItems(data.items)
          setHasMoreFeed(data.items.length === 20 && data.items.length < maxFeedLimit)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoadingMoreFeed(false)
      }
    }
    
    if (feedFilter === 'all' && feedItems.length > 0 && loadedFeedItems.length === feedItems.length) {
      setHasMoreFeed(feedItems.length < maxFeedLimit)
      return
    }

    initFilter()
    return () => {
      active = false
    }
  }, [feedFilter])

  const loadMoreFeedItems = async () => {
    if (loadingMoreFeed || !hasMoreFeed || loadedFeedItems.length >= maxFeedLimit) return
    setLoadingMoreFeed(true)
    try {
      const lastItem = loadedFeedItems[loadedFeedItems.length - 1]
      const lastTimestamp = lastItem ? lastItem.timestamp : ''
      const limitToFetch = Math.min(20, maxFeedLimit - loadedFeedItems.length)
      if (limitToFetch <= 0) {
        setHasMoreFeed(false)
        return
      }
      const res = await fetch(`/api/feed?source=${feedFilter}&limit=${limitToFetch}&lastTimestamp=${encodeURIComponent(lastTimestamp)}`)
      const data = await res.json()
      if (data.success) {
        const newItems = data.items
        const updatedItems = [...loadedFeedItems, ...newItems]
        setLoadedFeedItems(updatedItems)
        setHasMoreFeed(newItems.length === limitToFetch && updatedItems.length < maxFeedLimit)
      }
    } catch (err) {
      console.error('Error loading more feed:', err)
    } finally {
      setLoadingMoreFeed(false)
    }
  }

  const observerRef = React.useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hasMoreFeed || loadingMoreFeed) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreFeedItems()
        }
      },
      { threshold: 0.1 }
    )

    const currentSentinel = observerRef.current
    if (currentSentinel) {
      observer.observe(currentSentinel)
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel)
      }
    }
  }, [loadedFeedItems, hasMoreFeed, loadingMoreFeed, feedFilter])

  const [hoveredItem, setHoveredItem] = useState<ItemDoc | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  // Load saved builds on client mount & sync if user logged in
  useEffect(() => {
    const loadAndSyncBuilds = async () => {
      if (user) {
        // Fetch saved builds for current authenticated user directly from Firebase
        const cloudBuilds = await fetchCloudBuilds(user.uid)
        
        // If there were local guest builds in localStorage prior to logging in, sync them up to tier limit
        const local = localStorage.getItem('predecessor_saved_builds')
        if (local) {
          try {
            const localBuilds = JSON.parse(local)
            if (localBuilds.length > 0) {
              const maxLimit = isPremium ? PREMIUM_BUILD_LIMIT : FREE_BUILD_LIMIT
              await syncBuildsToCloud(user.uid, localBuilds, maxLimit)
              const mergedCloud = await fetchCloudBuilds(user.uid)
              setSavedBuilds(mergedCloud)
              localStorage.setItem('predecessor_saved_builds', JSON.stringify(mergedCloud))
              return
            }
          } catch (e) {
            console.error(e)
          }
        }

        setSavedBuilds(cloudBuilds)
        localStorage.setItem('predecessor_saved_builds', JSON.stringify(cloudBuilds))
      } else {
        // User logged out / unauthenticated: Clear React state & localStorage so builds do not persist across logouts
        setSavedBuilds([])
        localStorage.removeItem('predecessor_saved_builds')
      }
    }
    
    loadAndSyncBuilds()
  }, [user, isPremium])

  // ── Filter Data ────────────────────────────────────────────────────────────
  const filteredHeroes = useMemo(() => {
    return heroes.filter((hero) => {
      const matchesSearch = hero.display_name.toLowerCase().includes(heroSearch.toLowerCase())
      const matchesClass = selectedClass === 'All' || hero.classes.includes(selectedClass)
      const matchesRole = selectedRole === 'All' || hero.roles.includes(selectedRole)
      return matchesSearch && matchesClass && matchesRole
    })
  }, [heroes, heroSearch, selectedClass, selectedRole])

  useEffect(() => {
    setVisibleItemsCount(16)
    setVisibleCrestsCount(16)
    setVisibleEternalsCount(16)
  }, [browserTab, itemSearch, itemClassFilter, itemTierFilter, activeStatFilters])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAbility(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.display_name.toLowerCase().includes(itemSearch.toLowerCase())
      
      // Tier filter
      let matchesTier = true
      if (itemTierFilter === 3) {
        matchesTier = item.is_final_item === true
      } else if (itemTierFilter === 2) {
        matchesTier = item.tier === 2
      } else if (itemTierFilter === 1) {
        matchesTier = item.tier === 1
      }

      const matchesClass = itemClassFilter === 'All' || item.hero_class === itemClassFilter
      
      // Stat filters
      let matchesStats = true
      if (activeStatFilters.length > 0) {
        for (const stat of activeStatFilters) {
          if (stat === 'physical_power' && !((item.stats.physical_power || 0) > 0)) matchesStats = false;
          if (stat === 'magical_power' && !((item.stats.magical_power || 0) > 0 || (item.stats.energy_power || 0) > 0)) matchesStats = false;
          if (stat === 'health' && !((item.stats.max_health || 0) > 0 || (item.stats.health || 0) > 0)) matchesStats = false;
          if (stat === 'ability_haste' && !((item.stats.ability_haste || 0) > 0)) matchesStats = false;
          if (stat === 'physical_armor' && !((item.stats.physical_armor || 0) > 0)) matchesStats = false;
          if (stat === 'magical_armor' && !((item.stats.magical_armor || 0) > 0)) matchesStats = false;
          if (stat === 'physical_penetration' && !((item.stats.physical_penetration || 0) > 0)) matchesStats = false;
          if (stat === 'magical_penetration' && !((item.stats.magical_penetration || 0) > 0)) matchesStats = false;
          if (stat === 'crit_chance' && !((item.stats.crit_chance || item.stats.critical_chance || 0) > 0)) matchesStats = false;
          if (stat === 'attack_speed' && !((item.stats.attack_speed || 0) > 0)) matchesStats = false;
          if (stat === 'lifesteal' && !((item.stats.lifesteal || 0) > 0)) matchesStats = false;
          if (stat === 'magical_lifesteal' && !((item.stats.magical_lifesteal || 0) > 0)) matchesStats = false;
          if (stat === 'omnivamp' && !((item.stats.omnivamp || 0) > 0)) matchesStats = false;
          if (stat === 'heal_shield_increase' && !((item.stats.heal_shield_increase || 0) > 0)) matchesStats = false;
          if (stat === 'max_mana' && !((item.stats.max_mana || item.stats.mana || 0) > 0)) matchesStats = false;
          if (stat === 'health_regeneration' && !((item.stats.health_regeneration || item.stats.base_health_regeneration || 0) > 0)) matchesStats = false;
          if (stat === 'mana_regeneration' && !((item.stats.mana_regeneration || item.stats.base_mana_regeneration || 0) > 0)) matchesStats = false;
          if (stat === 'movement_speed' && !((item.stats.movement_speed || 0) > 0)) matchesStats = false;
          if (stat === 'tenacity' && !((item.stats.tenacity || 0) > 0)) matchesStats = false;
          if (stat === 'gold_per_second' && !((item.stats.gold_per_second || 0) > 0)) matchesStats = false;
        }
      }

      return matchesSearch && matchesTier && matchesClass && matchesStats
    })
  }, [items, itemSearch, itemTierFilter, itemClassFilter, activeStatFilters])

  // Crests filtered by legendary status if final tier or tier 3 selected
  const filteredCrests = useMemo(() => {
    return items.filter((item) => {
      if (item.slot_type !== 'Crest') return false
      const matchesSearch = item.display_name.toLowerCase().includes(itemSearch.toLowerCase())
      
      // legendary crests only by default
      if (itemTierFilter === 3) {
        return matchesSearch && item.rarity === 'Legendary'
      }
      return matchesSearch
    })
  }, [items, itemSearch, itemTierFilter])

  // ── Global Search Computations ─────────────────────────────────────────────
  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return []
    const q = globalSearchQuery.toLowerCase()
    const results: Array<{
      type: 'hero' | 'item' | 'crest' | 'eternal' | 'ability'
      name: string
      sub: string
      raw: any
      heroContext?: any
    }> = []

    // Match heroes
    heroes.forEach((h) => {
      if (h.display_name.toLowerCase().includes(q) || h.name.toLowerCase().includes(q)) {
        results.push({ type: 'hero', name: h.display_name, sub: `Hero (${h.classes.join(', ')})`, raw: h })
      }
      // Match abilities inside heroes
      h.abilities?.forEach((ab: any) => {
        if (ab.display_name.toLowerCase().includes(q) || (ab.game_description && ab.game_description.toLowerCase().includes(q))) {
          results.push({ type: 'ability', name: ab.display_name, sub: `Ability on ${h.display_name}`, raw: ab, heroContext: h })
        }
      })
    })

    // Match items & crests
    items.forEach((item) => {
      if (item.display_name.toLowerCase().includes(q)) {
        const isCrest = item.slot_type === 'Crest'
        results.push({
          type: isCrest ? 'crest' : 'item',
          name: item.display_name,
          sub: `${isCrest ? 'Crest' : 'Item'} - Cost: ${item.total_price}g (${item.aggression_type || 'General'})`,
          raw: item
        })
      }
    })

    // Match eternals
    eternals.forEach((et) => {
      if (et.display_name?.toLowerCase().includes(q) || et.name?.toLowerCase().includes(q) || (et.description && et.description.toLowerCase().includes(q))) {
        results.push({ type: 'eternal', name: et.display_name || et.name, sub: `Eternal - Category: ${et.category || 'General'}`, raw: et })
      }
    })

    return results.slice(0, 10) // Cap results for sub-300ms rendering
  }, [globalSearchQuery, heroes, items, eternals])

  // ── Real-Time Simulation Calculation ──────────────────────────────────────
  const analysisResult = useMemo(() => {
    if (!selectedHero) return null
    return calculateBuildStats(selectedHero, levelA, buildItems, buildCrest, buildEternal, {
      allHeroes: heroes,
      minorBlessings: selectedBlessings
    })
  }, [selectedHero, levelA, buildItems, buildCrest, buildEternal, heroes, selectedBlessings])

  const analysisResultB = useMemo(() => {
    if (!selectedHeroB) return null
    return calculateBuildStats(selectedHeroB, levelB, buildItemsB, buildCrestB, buildEternalB, {
      allHeroes: heroes,
      minorBlessings: selectedBlessingsB
    })
  }, [selectedHeroB, levelB, buildItemsB, buildCrestB, buildEternalB, heroes, selectedBlessingsB])

  const matchupResult = useMemo(() => {
    if (!selectedHero || !analysisResult || !selectedHeroB || !analysisResultB) return null
    return calculateMatchupScore(selectedHero, analysisResult, selectedHeroB, analysisResultB)
  }, [selectedHero, analysisResult, selectedHeroB, analysisResultB])

  // ── Build Path Validation ──────────────────────────────────────────────────
  const buildPathWarnings = useMemo(() => {
    const warnings: string[] = []
    if (buildItems.length === 0) return warnings

    buildItems.forEach((item) => {
      if (item.requirements && item.requirements.length > 0) {
        // Check if at least one requirement is satisfied in the build
        const hasReq = item.requirements.some((reqSlug) =>
          buildItems.some((bi) => bi.slug === reqSlug)
        )
        // If it has requirements but NONE are present in build, throw warning
        if (!hasReq) {
          warnings.push(`Warning: ${item.display_name} requires intermediate items (e.g. ${item.requirements.join(', ')}) to build.`)
        }
      }
    })
    return warnings
  }, [buildItems])

  // ── Build Action Handlers ──────────────────────────────────────────────────
  const addBuildItem = (item: ItemDoc) => {
    if (activeBuild === 'B') {
      if (buildItemsB.length >= 6) return
      if (item.tier === 3 && buildItemsB.some((bi) => bi.slug === item.slug)) return
      setBuildItemsB([...buildItemsB, item])
    } else {
      if (buildItems.length >= 6) return
      if (item.tier === 3 && buildItems.some((bi) => bi.slug === item.slug)) return
      setBuildItems([...buildItems, item])
    }
  }

  const removeBuildItem = (index: number) => {
    const next = [...buildItems]
    next.splice(index, 1)
    setBuildItems(next)
  }

  const removeBuildItemB = (index: number) => {
    const next = [...buildItemsB]
    next.splice(index, 1)
    setBuildItemsB(next)
  }

  // ── AI Build Analysis Streaming ──────────────────────────────────────────
  const runAIAnalysis = async () => {
    if (!selectedHero || !analysisResult) return
    setIsAnalyzing(true)
    setAiAnalysisText('')

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPremium,
          provider: aiProvider,
          apiKey: aiApiKey,
          hero: activeBuild === 'B' ? selectedHeroB : selectedHero,
          level: activeBuild === 'B' ? levelB : levelA,
          build: activeBuild === 'B' ? buildItemsB : buildItems,
          computed_stats: activeBuild === 'B' ? analysisResultB?.totalStats : analysisResult?.totalStats,
          build_dna: activeBuild === 'B' ? analysisResultB?.dna : analysisResult?.dna,
          matchup: matchupResult,
          meta_context: null
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        setAiAnalysisText(`Error: ${errorText || 'Failed to generate AI analysis'}`)
        setIsAnalyzing(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setAiAnalysisText((prev) => prev + chunk)
      }
    } catch (e: any) {
      setAiAnalysisText(`Error: ${e.message || String(e)}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── AI Explain This Strategic Query ────────────────────────────────────────
  const runAIExplain = async () => {
    if (!selectedHero || !analysisResult || !aiQuestion) return
    setIsExplaining(true)
    setAiExplainText('')

    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPremium,
          provider: aiProvider,
          apiKey: aiApiKey,
          question: aiQuestion,
          hero: activeBuild === 'B' ? selectedHeroB : selectedHero,
          level: activeBuild === 'B' ? levelB : levelA,
          build: activeBuild === 'B' ? buildItemsB : buildItems,
          computed_stats: activeBuild === 'B' ? analysisResultB?.totalStats : analysisResult?.totalStats,
          build_dna: activeBuild === 'B' ? analysisResultB?.dna : analysisResult?.dna
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        setAiExplainText(`Error: ${errorText || 'Failed to generate explanation'}`)
        setIsExplaining(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setAiExplainText((prev) => prev + chunk)
      }
    } catch (e: any) {
      setAiExplainText(`Error: ${e.message || String(e)}`)
    } finally {
      setIsExplaining(false)
    }
  }

  // Helper to trigger Rules-engine explanations
  const triggerExplanation = (
    contextType: 'item_added' | 'dna_change' | 'confidence_delta' | 'matchup_factor',
    extraData: any
  ) => {
    const explanation = explainDeterministic(contextType, {
      hero: selectedHero || undefined,
      beforeStats: analysisResult?.baseStats,
      afterStats: analysisResult?.totalStats,
      beforeDna: { burst: 0, sustain: 0, tankiness: 0, scaling: 0, mobility: 0, utility: 0, objective_damage: 0 },
      afterDna: analysisResult?.dna,
      ...extraData
    })
    setExplanationModal(explanation)
  }

  // ── Save Build Handler ─────────────────────────────────────────────────────
  const performSaveBuild = async (name: string, description: string) => {
    if (!selectedHero || !name) return

    const maxLimit = isPremium ? PREMIUM_BUILD_LIMIT : FREE_BUILD_LIMIT
    if (savedBuilds.length >= maxLimit) {
      alert(`You have reached your limit of ${maxLimit} saved builds. ${!isPremium ? 'Upgrade to Premium for up to 100 builds!' : ''}`)
      return
    }

    const goldA = buildItems.reduce((acc, curr) => acc + curr.total_price, 0) + (buildCrest?.total_price || 0)
    const goldB = selectedHeroB
      ? buildItemsB.reduce((acc, curr) => acc + curr.total_price, 0) + (buildCrestB?.total_price || 0)
      : 0

    const nowIso = new Date().toISOString()

    const newBuild: SavedBuild = {
      id: Date.now().toString(),
      name: name,
      description: description,
      // Hero A Specs
      heroSlug: selectedHero.slug,
      heroName: selectedHero.display_name,
      role: buildRole,
      level: levelA,
      items: buildItems.map((i) => i.slug),
      crest: buildCrest?.slug || null,
      eternal: buildEternal?.slug || null,
      gold: goldA,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    // Include Hero B Specs if selectedHeroB is active
    if (selectedHeroB) {
      newBuild.heroBSlug = selectedHeroB.slug
      newBuild.heroBName = selectedHeroB.display_name
      newBuild.roleB = buildRoleB
      newBuild.levelB = levelB
      newBuild.itemsB = buildItemsB.map((i) => i.slug)
      newBuild.crestB = buildCrestB?.slug || null
      newBuild.eternalB = buildEternalB?.slug || null
      newBuild.goldB = goldB
      newBuild.totalGold = goldA + goldB
    }

    const updated = [newBuild, ...savedBuilds]
    setSavedBuilds(updated)
    localStorage.setItem('predecessor_saved_builds', JSON.stringify(updated))

    if (user) {
      await saveCloudBuild(user.uid, newBuild)
    }

    setIsSaveModalOpen(false)
    setSaveBuildName('')
    setSaveBuildDesc('')
    setIsPendingSaveAfterAuth(false)
    setActiveTab('saved')
  }

  const triggerSaveBuild = () => {
    if (!selectedHero || !saveBuildName) return

    // Require user account to complete save, preserving fields and opening AuthModal if unauthenticated
    if (!user) {
      setIsSaveModalOpen(false)
      setIsPendingSaveAfterAuth(true)
      setIsAuthModalOpen(true)
      return
    }

    performSaveBuild(saveBuildName, saveBuildDesc)
  }

  // Automatically execute pending save once user signs in / registers
  useEffect(() => {
    if (user && isPendingSaveAfterAuth && saveBuildName && selectedHero) {
      performSaveBuild(saveBuildName, saveBuildDesc)
    }
  }, [user, isPendingSaveAfterAuth])

  const deleteSavedBuild = async (id: string) => {
    const updated = savedBuilds.filter((b) => b.id !== id)
    setSavedBuilds(updated)
    localStorage.setItem('predecessor_saved_builds', JSON.stringify(updated))
    if (user) {
      await deleteCloudBuild(user.uid, id)
    }
  }

  const loadSavedBuild = (build: any) => {
    // Load Hero A
    const heroA = heroes.find((h) => h.slug === build.heroSlug)
    if (heroA) {
      setSelectedHero(heroA)
      setLevelA(build.level || 1)
      setBuildRole(build.role || 'Offlane')
      const matchedItemsA = (build.items || []).map((slug: string) => items.find((i) => i.slug === slug)).filter(Boolean) as ItemDoc[]
      setBuildItems(matchedItemsA)
      setBuildCrest(items.find((i) => i.slug === build.crest) || null)
      setBuildEternal(eternals.find((e) => e.slug === build.eternal) || null)
    }

    // Load Hero B if present in saved composition
    if (build.heroBSlug) {
      const heroB = heroes.find((h) => h.slug === build.heroBSlug)
      if (heroB) {
        setSelectedHeroB(heroB)
        setLevelB(build.levelB || 1)
        setBuildRoleB(build.roleB || 'Offlane')
        const matchedItemsB = (build.itemsB || []).map((slug: string) => items.find((i) => i.slug === slug)).filter(Boolean) as ItemDoc[]
        setBuildItemsB(matchedItemsB)
        setBuildCrestB(items.find((i) => i.slug === build.crestB) || null)
        setBuildEternalB(eternals.find((e) => e.slug === build.eternal) || null)
      }
    } else {
      setSelectedHeroB(null)
      setBuildItemsB([])
      setBuildCrestB(null)
      setBuildEternalB(null)
    }

    setActiveTab('lab')
  }

  const handleShareBuild = () => {
    if (!analysisResult) return;
    
    const yourHeroName = selectedHero ? selectedHero.display_name : 'N/A';
    const enemyHeroName = selectedHeroB ? selectedHeroB.display_name : 'N/A';
    
    const itemsText = buildItems.map(i => i.display_name).join(', ') || 'No items';
    const itemsTextB = buildItemsB.map(i => i.display_name).join(', ') || 'No items';

    let matchupText = 'No enemy selected.';
    if (matchupResult) {
      matchupText = 'Offensive Axis:\n' + matchupResult.offensive.explanation + '\n\n' +
                    'Defensive Axis:\n' + matchupResult.defensive.explanation + '\n\n' +
                    'Neutral Axis:\n' + matchupResult.neutral.explanation;
    }

    let shareText = '🔥 PREDECESSOR BUILD LAB REPORT 🔥\n' +
                    'Your Ultimate Predecessor Strategy Companion\n' +
                    'Build Lab URL: https://predbuildlab.gg\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
                    'YOUR HERO: ' + yourHeroName + ' (Lvl ' + levelA + ')\n' +
                    'Crest: ' + (buildCrest?.display_name || 'None') + '\n' +
                    'Items: ' + itemsText + '\n' +
                    'Eternal: ' + (buildEternal?.display_name || buildEternal?.name || 'None') + (selectedBlessings.length > 0 ? ' (' + selectedBlessings.join(', ') + ')' : '') + '\n\n' +
                    '🧬 YOUR DNA SCORES:\n' +
                    'Burst: ' + analysisResult.dna.burst.toFixed(1) + '/10 | Tankiness: ' + analysisResult.dna.tankiness.toFixed(1) + '/10 | Mobility: ' + analysisResult.dna.mobility.toFixed(1) + '/10 | Sustain: ' + analysisResult.dna.sustain.toFixed(1) + '/10\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
                    'ENEMY HERO: ' + enemyHeroName + (selectedHeroB ? ' (Lvl ' + levelB + ')' : '') + '\n' +
                    'Enemy Crest: ' + (buildCrestB?.display_name || 'None') + '\n' +
                    'Enemy Items: ' + itemsTextB + '\n' +
                    'Enemy Eternal: ' + (buildEternalB?.display_name || buildEternalB?.name || 'None') + (selectedBlessingsB.length > 0 ? ' (' + selectedBlessingsB.join(', ') + ')' : '') + '\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
                    '⚔️ MATCHUP OVERVIEW:\n' +
                    matchupText + '\n\n' +
                    '👉 Build your winning strategies today at Predecessor Build Lab!';

    navigator.clipboard.writeText(shareText.trim()).then(() => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    });
  };

  const handleHeroSelect = (hero: HeroDoc) => {
    setSelectedHero(hero);
    setLevelA(1);
    setLevelB(1);
    setBuildItems([]);
    setBuildCrest(null);
    setBuildEternal(null);
    setSelectedHeroB(null);
    setBuildItemsB([]);
    setBuildCrestB(null);
    setBuildEternalB(null);
  };

  return (
    <div onMouseMove={handleMouseMove} style={{ backgroundColor: '#090d16', color: '#f1f5f9', minHeight: '100vh', fontFamily: '"Chakra Petch", system-ui, -apple-system, sans-serif', paddingBottom: '90px' }}>
      <Head>
        <title>Predecessor Build Lab — Simulated Theorycrafting</title>
        <meta name="description" content="Simulate hero statistics, experiment with custom item/crest combinations, analyze build DNA, strengths and weaknesses, and power spikes." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;500;600;700&family=Russo+One&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes slowPan {
            0% { background-position: 50% 30%; }
            50% { background-position: 55% 40%; }
            100% { background-position: 50% 30%; }
          }
          .parallax-header {
            animation: slowPan 40s ease-in-out infinite;
          }
          .russo-font {
            font-family: 'Russo One', sans-serif !important;
          }
          .lab-layout-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
          }
          @media (min-width: 992px) {
            .lab-layout-grid {
              grid-template-columns: 280px 1fr;
            }
          }
          .quick-select-list::-webkit-scrollbar {
            width: 6px;
          }
          .quick-select-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
          }
          .quick-select-list::-webkit-scrollbar-thumb {
            background: rgba(124, 58, 237, 0.3);
            border-radius: 4px;
          }
          .quick-select-list::-webkit-scrollbar-thumb:hover {
            background: rgba(124, 58, 237, 0.5);
          }
        ` }} />
      </Head>

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(9, 13, 22, 0.7)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>🧪</div>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '0.05em', color: '#f8fafc' }}>PREDECESSOR <span style={{ color: '#3b82f6' }}>LABS</span></span>
        </div>

        {/* Global Search Bar */}
        <div style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            placeholder="🔍 Search heroes, items, abilities..."
            value={globalSearchQuery}
            onChange={(e) => {
              setGlobalSearchQuery(e.target.value)
              setShowGlobalSearchResults(true)
            }}
            onFocus={() => setShowGlobalSearchResults(true)}
            style={{ width: '100%', padding: '8px 12px', background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
          />
          {showGlobalSearchResults && globalSearchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111827', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', marginTop: '6px', maxHeight: '300px', overflowY: 'auto', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
              {globalSearchResults.map((res, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setShowGlobalSearchResults(false)
                    setGlobalSearchQuery('')
                    if (res.type === 'hero') {
                      setSelectedLibraryHero(res.raw)
                      setLibrarySection('heroes')
                      setActiveTab('library')
                    } else if (res.type === 'ability') {
                      setSelectedLibraryHero(res.heroContext)
                      setLibrarySection('heroes')
                      setActiveTab('library')
                    } else if (res.type === 'item') {
                      setSelectedLibraryItem(res.raw)
                      setLibrarySection('items')
                      setActiveTab('library')
                    } else if (res.type === 'crest') {
                      setSelectedLibraryItem(res.raw)
                      setLibrarySection('crests')
                      setActiveTab('library')
                    } else if (res.type === 'eternal') {
                      setSelectedLibraryEternal(res.raw)
                      setLibrarySection('eternals')
                      setActiveTab('library')
                    }
                  }}
                  style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#f8fafc' }}>{res.name}</span>
                    <span style={{ fontSize: '0.65rem', background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{res.type}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{res.sub}</span>
                </div>
              ))}
            </div>
          )}
          {showGlobalSearchResults && globalSearchQuery && globalSearchResults.length === 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#111827', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', marginTop: '6px', padding: '12px', zIndex: 100, color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>
              No results found
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedHero && (
            <button onClick={() => { setSelectedHero(null); setSelectedHeroB(null); setBuildItemsB([]); }} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✕ Reset Hero A
            </button>
          )}
          {selectedHeroB && (
            <button onClick={() => { setSelectedHeroB(null); setBuildItemsB([]); }} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✕ Reset Hero B
            </button>
          )}
        </div>
      </header>

      {/* ── PARALLAX BANNER (Only in Initial Lab state) ── */}
      {activeTab === 'lab' && !selectedHero && (
        <div className="parallax-header" style={{
          position: 'relative',
          height: '280px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          backgroundImage: 'linear-gradient(to bottom, rgba(9,13,22,0.3) 0%, rgba(9,13,22,0.85) 80%, #090d16 100%), url("/assets/hero-bg.jpg")',
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ zIndex: 2, padding: '0 20px' }}>
            <h1 className="russo-font" style={{
              fontSize: '3.2rem',
              fontWeight: 900,
              margin: '0 0 10px 0',
              letterSpacing: '3px',
              color: '#f8fafc',
              textShadow: '0 4px 12px rgba(0,0,0,0.85), 0 0 30px rgba(124,58,237,0.3)',
              textTransform: 'uppercase'
            }}>
              Pick Your Hero
            </h1>
            <p style={{
              color: '#A78BFA',
              fontSize: '1.15rem',
              fontWeight: 500,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              letterSpacing: '1px',
              margin: 0
            }}>
              Select a champion to enter the simulated theorycrafting sandbox
            </p>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────────────── */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
        
        {/* ── 1. LAB TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'lab' && (
          <div>
            {!selectedHero ? (
              // HERO SELECTION GRID & QUICK SELECT
              <div className="lab-layout-grid" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                {/* LEFT COLUMN: Name Search & Quick List Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', height: 'fit-content' }}>
                  <h3 className="russo-font" style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '0.05em', color: '#cbd5e1' }}>Search Champion</h3>
                  
                  {/* Search Input Box */}
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                      <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Enter hero name..."
                      value={heroSearch}
                      onChange={(e) => setHeroSearch(e.target.value)}
                      style={{ width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px 10px 36px', color: 'white', fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '8px 0' }} />

                  <h3 className="russo-font" style={{ fontSize: '1rem', fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: '0.05em', color: '#cbd5e1' }}>Quick Selection</h3>
                  
                  {/* Quick Select scrollable list */}
                  <div className="quick-select-list" style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {filteredHeroes.map((hero) => (
                      <div
                        key={hero.slug}
                        onClick={() => handleHeroSelect(hero)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        className="quick-select-row"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(124, 58, 237, 0.08)'
                          e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.3)'
                          e.currentTarget.style.transform = 'translateX(4px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.01)'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)'
                          e.currentTarget.style.transform = 'translateX(0)'
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={hero.image_url} alt={hero.display_name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#cbd5e1' }}>{hero.display_name}</span>
                          <span style={{ fontSize: '0.65rem', color: '#7c3aed', textTransform: 'uppercase' }}>{hero.classes[0]}</span>
                        </div>
                      </div>
                    ))}
                    {filteredHeroes.length === 0 && (
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>No heroes found</div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Filters and main selection grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* FILTER PANEL */}
                  <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                    <span className="russo-font" style={{ fontSize: '0.85rem', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Class Filter:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['All', 'Fighter', 'Tank', 'Mage', 'Assassin', 'Support', 'Sharpshooter'].map((cls) => {
                        const isActive = selectedClass === cls;
                        return (
                          <button
                            key={cls}
                            onClick={() => setSelectedClass(cls)}
                            style={{
                              padding: '6px 14px',
                              border: isActive ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              background: isActive ? '#7c3aed' : '#090d16',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              letterSpacing: '0.5px',
                              transition: 'all 0.2s',
                              fontFamily: 'inherit',
                              boxShadow: isActive ? '0 0 12px rgba(124,58,237,0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.5)';
                                e.currentTarget.style.background = 'rgba(124, 58, 237, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.background = '#090d16';
                              }
                            }}
                          >
                            {cls}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PORTRAIT SELECTION GRID */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                    {filteredHeroes.map((hero) => (
                      <div
                        key={hero.slug}
                        onClick={() => handleHeroSelect(hero)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#111827',
                          border: '1px solid rgba(255,255,255,0.05)',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-6px)'
                          e.currentTarget.style.borderColor = '#7c3aed'
                          e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0,0,0,0.5), 0 0 15px rgba(124, 58, 237, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                        }}
                      >
                        <div style={{ aspectRatio: '1/1', background: '#1e293b', overflow: 'hidden', position: 'relative' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={hero.image_url} alt={hero.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '12px 8px',
                            background: 'linear-gradient(to top, rgba(9,13,22,0.95) 20%, rgba(9,13,22,0.4) 70%, transparent 100%)',
                            textAlign: 'center'
                          }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.5px', color: '#f8fafc' }}>{hero.display_name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // HERO SELECTED: LAB SIMULATION VIEW
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
                
                {/* LEFT COLUMN: HERO OVERVIEW & CALCULATED STATS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* HERO OVERVIEW CARD */}
                  <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedHero.image_url} alt={selectedHero.display_name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6', margin: '0 auto 6px auto' }} />
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{selectedHero.display_name}</div>
                        <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Your Hero</span>
                      </div>

                      {selectedHeroB ? (
                        <div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={selectedHeroB.image_url} alt={selectedHeroB.display_name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #a855f7', margin: '0 auto 6px auto' }} />
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{selectedHeroB.display_name}</div>
                          <span style={{ fontSize: '0.75rem', color: '#a855f7' }}>Enemy Hero</span>
                        </div>
                      ) : (
                        <div
                          onClick={() => setIsHeroBModalOpen(true)}
                          style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}
                        >
                          <span style={{ fontSize: '1.5rem', color: '#94a3b8' }}>+</span>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Add Enemy Hero</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Your Role</span>
                        <select
                           value={buildRole}
                           onChange={(e) => setBuildRole(e.target.value)}
                           style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '4px', color: 'white', fontSize: '0.75rem' }}
                        >
                          {['Offlane', 'Jungle', 'Midlane', 'Carry', 'Support'].map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </div>

                      {selectedHeroB && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>Enemy Role</span>
                          <select
                            value={buildRoleB}
                            onChange={(e) => setBuildRoleB(e.target.value)}
                            style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '4px', color: 'white', fontSize: '0.75rem' }}
                          >
                            {['Offlane', 'Jungle', 'Midlane', 'Carry', 'Support'].map(role => <option key={role} value={role}>{role}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* LEVEL SLIDERS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.875rem' }}>
                          <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>Your Hero Level</span>
                          <strong style={{ color: '#3b82f6' }}>Lvl {levelA}</strong>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="18"
                          value={levelA}
                          onChange={(e) => setLevelA(parseInt(e.target.value))}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </div>

                      {selectedHeroB && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.875rem' }}>
                            <span style={{ color: '#a855f7', fontWeight: 'bold' }}>Enemy Hero Level</span>
                            <strong style={{ color: '#a855f7' }}>Lvl {levelB}</strong>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="18"
                            value={levelB}
                            onChange={(e) => setLevelB(parseInt(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ABILITIES SECTION */}
                  <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>Hero Abilities</h4>
                    
                    {/* Hero A Abilities */}
                    <div>
                      {selectedHeroB && (
                        <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>Hero A</span>
                          <span>{selectedHero.display_name}</span>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                        {selectedHero.abilities.map((ability) => (
                          <div
                            key={ability.key}
                            onClick={() => setSelectedAbility({ ...ability, heroName: selectedHero.display_name, heroColor: '#3b82f6' })}
                            style={{ cursor: 'pointer', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(59, 130, 246, 0.3)', position: 'relative' }}
                            title={`${selectedHero.display_name} - ${ability.display_name}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={ability.image_url} alt={ability.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', top: 2, right: 2, background: 'black', borderRadius: '3px', padding: '1px 3px', fontSize: '10px', fontWeight: 'bold' }}>
                              {ability.key}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hero B Abilities */}
                    {selectedHeroB && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#a855f7', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>Hero B</span>
                          <span>{selectedHeroB.display_name}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                          {selectedHeroB.abilities.map((ability) => (
                            <div
                              key={ability.key}
                              onClick={() => setSelectedAbility({ ...ability, heroName: selectedHeroB.display_name, heroColor: '#a855f7' })}
                              style={{ cursor: 'pointer', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(168, 85, 247, 0.3)', position: 'relative' }}
                              title={`${selectedHeroB.display_name} - ${ability.display_name}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={ability.image_url} alt={ability.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: 2, right: 2, background: 'black', borderRadius: '3px', padding: '1px 3px', fontSize: '10px', fontWeight: 'bold' }}>
                                {ability.key}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* REAL-TIME STATS PANEL */}
                  {analysisResult && (
                    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Stats Summary</span>
                        <span style={{ fontSize: '0.8rem', color: '#10b981' }}>{selectedHeroB ? 'A vs B' : 'Calculated'}</span>
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
                        {/* Headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          <span>Metric</span>
                          <span style={{ color: '#3b82f6', textAlign: 'right' }}>A</span>
                          <span style={{ color: '#a855f7', textAlign: 'right' }}>{selectedHeroB ? 'B' : ''}</span>
                        </div>

                        {[
                          { name: 'Max Health', key: 'max_health', tooltip: 'Total health points from base hero stats and items.', format: (v: number) => `${Math.round(v)} HP` },
                          { name: 'Max Mana', key: 'max_mana', tooltip: 'Total mana pool for ability usage.', format: (v: number) => `${Math.round(v)} MP` },
                          { name: 'Phys Power', key: 'physical_power', tooltip: 'Increases damage of physical abilities and basic attacks.', format: (v: number) => `${Math.round(v)}` },
                          { name: 'Mag Power', key: 'magical_power', tooltip: 'Increases damage of magical abilities.', format: (v: number) => `${Math.round(v)}` },
                          { name: 'Phys Armor', key: 'physical_armor', tooltip: 'Mitigates incoming physical damage.', format: (v: number) => `${Math.round(v)}` },
                          { name: 'Mag Armor', key: 'magical_armor', tooltip: 'Mitigates incoming magical damage.', format: (v: number) => `${Math.round(v)}` },
                        ].map((stat) => (
                          <div
                            key={stat.key}
                            onClick={() => triggerExplanation('item_added', {
                              item: buildItems[buildItems.length - 1]
                            })}
                            style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', cursor: 'pointer' }}
                            title={stat.tooltip + " (Click to explain this stat delta with rules engine)"}
                          >
                            <span style={{ color: '#94a3b8' }}>{stat.name}</span>
                            <span style={{ textAlign: 'right', fontWeight: 'bold' }}>{stat.format(analysisResult.totalStats[stat.key] || 0)}</span>
                            <span style={{ textAlign: 'right', fontWeight: 'bold', color: '#a855f7' }}>
                              {analysisResultB ? stat.format(analysisResultB.totalStats[stat.key] || 0) : ''}
                            </span>
                          </div>
                        ))}

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr' }} title="Effective Health against physical damage, accounting for armor mitigation.">
                          <span style={{ color: '#94a3b8' }}>EHP (Physical)</span>
                          <strong style={{ color: '#ef4444', textAlign: 'right' }}>{Math.round(analysisResult.effectiveHpPhys)}</strong>
                          <strong style={{ color: '#ef4444', textAlign: 'right' }}>
                            {analysisResultB ? Math.round(analysisResultB.effectiveHpPhys) : ''}
                          </strong>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr' }} title="Effective Health against magical damage, accounting for armor mitigation.">
                          <span style={{ color: '#94a3b8' }}>EHP (Magical)</span>
                          <strong style={{ color: '#3b82f6', textAlign: 'right' }}>{Math.round(analysisResult.effectiveHpMag)}</strong>
                          <strong style={{ color: '#3b82f6', textAlign: 'right' }}>
                            {analysisResultB ? Math.round(analysisResultB.effectiveHpMag) : ''}
                          </strong>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr' }} title="Cooldown Reduction percentage derived from Ability Haste.">
                          <span style={{ color: '#94a3b8' }}>CDR %</span>
                          <strong style={{ textAlign: 'right' }}>{Math.round(analysisResult.cdrPct * 100)}%</strong>
                          <strong style={{ textAlign: 'right', color: '#a855f7' }}>
                            {analysisResultB ? `${Math.round(analysisResultB.cdrPct * 100)}%` : ''}
                          </strong>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr' }} title="Number of basic attacks per second.">
                          <span style={{ color: '#94a3b8' }}>Atk Speed</span>
                          <strong style={{ textAlign: 'right' }}>{analysisResult.attacksPerSecond.toFixed(2)}/s</strong>
                          <strong style={{ textAlign: 'right', color: '#a855f7' }}>
                            {analysisResultB ? `${analysisResultB.attacksPerSecond.toFixed(2)}/s` : ''}
                          </strong>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }} title="Value of basic attacks (LMB) including contributions from power, items, and scaling.">
                          <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Basic Attack Power</span>
                          <strong style={{ color: '#f59e0b', textAlign: 'right' }}>{Math.round(analysisResult.basicAttackPower)}</strong>
                          <strong style={{ color: '#f59e0b', textAlign: 'right' }}>
                            {analysisResultB ? Math.round(analysisResultB.basicAttackPower) : ''}
                          </strong>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }} title="Sustainability: Lifesteal / Magical Lifesteal / Omnivamp %">
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>Sustainability</span>
                          <strong style={{ color: '#10b981', textAlign: 'right' }}>
                            {`${analysisResult.totalStats.lifesteal || 0}/${analysisResult.totalStats.magical_lifesteal || 0}/${analysisResult.totalStats.omnivamp || 0}%`}
                          </strong>
                          <strong style={{ color: '#10b981', textAlign: 'right' }}>
                            {analysisResultB ? `${analysisResultB.totalStats.lifesteal || 0}/${analysisResultB.totalStats.magical_lifesteal || 0}/${analysisResultB.totalStats.omnivamp || 0}%` : ''}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: WORKSPACE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* BUILD PATH WARNINGS REMOVED */}

                  {/* BUILD CONSTRUCTION SLOTS */}
                  <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0 }}>Build Loadout</h3>
                        {selectedHeroB && (
                          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <button
                              onClick={() => setActiveBuild('A')}
                              style={{ padding: '3px 6px', border: 'none', cursor: 'pointer', background: activeBuild === 'A' ? '#3b82f6' : '#090d16', color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}
                            >
                              Build A
                            </button>
                            <button
                              onClick={() => setActiveBuild('B')}
                              style={{ padding: '3px 6px', border: 'none', cursor: 'pointer', background: activeBuild === 'B' ? '#a855f7' : '#090d16', color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}
                            >
                              Build B
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                          Gold: <strong style={{ color: '#eab308' }}>
                            {activeBuild === 'A'
                              ? buildItems.reduce((sum, item) => sum + item.total_price, 0) + (buildCrest ? buildCrest.total_price : 0)
                              : buildItemsB.reduce((sum, item) => sum + item.total_price, 0) + (buildCrestB ? buildCrestB.total_price : 0)
                            }g
                          </strong>
                        </span>
                        <button
                          disabled={!selectedHero}
                          onClick={() => setIsSaveModalOpen(true)}
                          style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', background: !selectedHero ? '#374151' : '#10b981', color: 'white', fontWeight: 'bold', fontSize: '0.85rem', cursor: !selectedHero ? 'not-allowed' : 'pointer' }}
                        >
                          💾 Save Build
                        </button>
                      </div>
                    </div>

                    {/* Active loadout slots rendering */}
                    {activeBuild === 'A' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 64px))', gap: '8px', justifyContent: 'center' }}>
                        {/* Crest Slot */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', color: '#94a3b8' }}>Crest</span>
                          <div
                            onClick={() => setBuildCrest(null)}
                            onMouseEnter={() => buildCrest && setHoveredItem(buildCrest)}
                            onMouseLeave={() => setHoveredItem(null)}
                            style={{ width: '100%', aspectRatio: '1/1', border: '2px dashed rgba(59,130,246,0.3)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(59,130,246,0.02)' }}
                          >
                            {buildCrest ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={buildCrest.image_url} alt={buildCrest.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '1rem', color: '#3b82f6' }}>+</span>
                            )}
                          </div>
                        </div>

                        {/* 6 Item Slots */}
                        {[...Array(6)].map((_, i) => {
                          const item = buildItems[i]
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              <span style={{ fontSize: '9px', color: '#94a3b8' }}>Slot {i + 1}</span>
                              <div
                                onClick={() => item && removeBuildItem(i)}
                                onMouseEnter={() => item && setHoveredItem(item)}
                                onMouseLeave={() => setHoveredItem(null)}
                                style={{ width: '100%', aspectRatio: '1/1', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: item ? 'pointer' : 'default', background: 'rgba(255,255,255,0.01)' }}
                              >
                                {item ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.image_url} alt={item.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: '1rem', color: '#475569' }}>-</span>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {/* Eternal Slot */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', color: '#94a3b8' }}>Eternal</span>
                          <div
                            onClick={() => setBuildEternal(null)}
                            style={{ width: '100%', aspectRatio: '1/1', border: '2px dashed rgba(168,85,247,0.3)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(168,85,247,0.02)' }}
                          >
                            {buildEternal ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={buildEternal.image_url} alt={buildEternal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '1rem', color: '#a855f7' }}>+</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 64px))', gap: '8px', justifyContent: 'center' }}>
                        {/* Crest B Slot */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', color: '#94a3b8' }}>Crest</span>
                          <div
                            onClick={() => setBuildCrestB(null)}
                            onMouseEnter={() => buildCrestB && setHoveredItem(buildCrestB)}
                            onMouseLeave={() => setHoveredItem(null)}
                            style={{ width: '100%', aspectRatio: '1/1', border: '2px dashed rgba(168,85,247,0.3)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(168,85,247,0.02)' }}
                          >
                            {buildCrestB ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={buildCrestB.image_url} alt={buildCrestB.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '1rem', color: '#a855f7' }}>+</span>
                            )}
                          </div>
                        </div>

                        {/* 6 Items B Slots */}
                        {[...Array(6)].map((_, i) => {
                          const item = buildItemsB[i]
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              <span style={{ fontSize: '9px', color: '#94a3b8' }}>Slot {i + 1}</span>
                              <div
                                onClick={() => item && removeBuildItemB(i)}
                                onMouseEnter={() => item && setHoveredItem(item)}
                                onMouseLeave={() => setHoveredItem(null)}
                                style={{ width: '100%', aspectRatio: '1/1', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: item ? 'pointer' : 'default', background: 'rgba(255,255,255,0.01)' }}
                              >
                                {item ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.image_url} alt={item.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: '1rem', color: '#475569' }}>-</span>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {/* Eternal B Slot */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', color: '#94a3b8' }}>Eternal</span>
                          <div
                            onClick={() => setBuildEternalB(null)}
                            style={{ width: '100%', aspectRatio: '1/1', border: '2px dashed rgba(168,85,247,0.3)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(168,85,247,0.02)' }}
                          >
                            {buildEternalB ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={buildEternalB.image_url} alt={buildEternalB.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '1rem', color: '#a855f7' }}>+</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Meta Alignment Indicator */}
                    {((activeBuild === 'A' ? selectedHero : selectedHeroB)?.popular_build) && (
                      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                        {(() => {
                          const currentHero = activeBuild === 'A' ? selectedHero : selectedHeroB;
                          const currentBuildItems = activeBuild === 'A' ? buildItems : buildItemsB;
                          const currentCrest = activeBuild === 'A' ? buildCrest : buildCrestB;
                          const currentEternal = activeBuild === 'A' ? buildEternal : buildEternalB;
                          const pop = currentHero?.popular_build;
                          if (!pop) return null;

                          const matchingItems = currentBuildItems.filter(item => pop.item_slugs?.includes(item.slug)).length;
                          const crestMatches = currentCrest && pop.crest_slug === currentCrest.slug;
                          const eternalMatches = currentEternal && pop.eternal_slug && currentEternal.slug.toLowerCase().includes(pop.eternal_slug.toLowerCase());

                          let statusText = '🔴 Off-Meta / Experimental';
                          let statusBg = 'rgba(239, 68, 68, 0.1)';
                          let statusBorder = 'rgba(239, 68, 68, 0.3)';
                          let statusColor = '#f87171';

                          if (matchingItems >= 5) {
                            statusText = '🟢 Core Meta Build';
                            statusBg = 'rgba(16, 185, 129, 0.1)';
                            statusBorder = 'rgba(16, 185, 129, 0.3)';
                            statusColor = '#34d399';
                          } else if (matchingItems >= 3) {
                            statusText = '🟡 Close to Meta';
                            statusBg = 'rgba(234, 179, 8, 0.1)';
                            statusBorder = 'rgba(234, 179, 8, 0.3)';
                            statusColor = '#facc15';
                          } else if (matchingItems >= 1) {
                            statusText = '🟠 Partial Meta';
                            statusBg = 'rgba(249, 115, 22, 0.1)';
                            statusBorder = 'rgba(249, 115, 22, 0.3)';
                            statusColor = '#fb923c';
                          }

                          return (
                            <div style={{ background: statusBg, border: `1px solid ${statusBorder}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: statusColor }}>{statusText}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({matchingItems}/{pop.item_slugs?.length || 6} items match pred.gg meta)</span>
                                </div>
                                {pop.win_rate && (
                                  <span style={{ fontSize: '0.75rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                                    Meta WR: {pop.win_rate}% ({pop.match_count?.toLocaleString() || 0} matches)
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <span>Crest Match: {crestMatches ? '✅ Yes' : currentCrest ? '❌ No' : '⚪ Not Selected'}</span>
                                <span>Eternal Match: {eternalMatches ? '✅ Yes' : currentEternal ? '❌ No' : '⚪ Not Selected'}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* ITEM / CREST / ETERNAL BROWSER PANEL */}
                  <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>Item & Blessing Browser</h3>
                    
                    {/* BROWSER TABS */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                      {(['items', 'crests', 'eternals'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setBrowserTab(tab)}
                          style={{
                            background: browserTab === tab ? '#3b82f6' : 'rgba(255,255,255,0.02)',
                            border: '1px solid ' + (browserTab === tab ? '#3b82f6' : 'rgba(255,255,255,0.1)'),
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            color: 'white',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* SEARCH INPUT */}
                    <div style={{ marginBottom: '20px' }}>
                      <input
                        type="text"
                        placeholder={`Search ${browserTab}...`}
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        style={{ width: '100%', maxWidth: '400px', background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 12px', color: 'white' }}
                      />
                    </div>

                    {/* STAT FILTER BUTTONS (Items tab only, alphabetical order with icons) */}
                    {browserTab === 'items' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8' }}>Filter:</div>
                        
                        {/* Tier Filters */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                          {[1, 2, 3].map((t) => {
                            const isActive = itemTierFilter === t;
                            return (
                              <button
                                key={t}
                                onClick={() => setItemTierFilter(t)}
                                style={{
                                  background: isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
                                  border: '1px solid ' + (isActive ? '#3b82f6' : 'rgba(255,255,255,0.08)'),
                                  borderRadius: '6px',
                                  padding: '5px 12px',
                                  fontSize: '0.75rem',
                                  color: isActive ? '#60a5fa' : '#cbd5e1',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  transition: 'all 0.2s',
                                }}
                              >
                                Tier {t}
                              </button>
                            );
                          })}
                        </div>

                        {/* Stat Filters */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {[
                            // FIRST 4 POSITIONS (Physical Power, Magical Power, Health, Ability Haste)
                            { key: 'physical_power', label: 'Physical Power', iconId: 'ADIconOrange' },
                            { key: 'magical_power', label: 'Magical Power', iconId: 'APIconBlue' },
                            { key: 'health', label: 'Health', iconId: 'HealthIconGreen' },
                            { key: 'ability_haste', label: 'Ability Haste', iconId: 'AbilityHaste' },

                            // ALL REMAINING STAT FILTERS
                            { key: 'physical_armor', label: 'Physical Armor', iconId: 'ArmorOrange' },
                            { key: 'magical_armor', label: 'Magical Armor', iconId: 'MRIcon' },
                            { key: 'physical_penetration', label: 'Physical Penetration', iconId: 'PhysPen' },
                            { key: 'magical_penetration', label: 'Magical Penetration', iconId: 'MagPen' },
                            { key: 'crit_chance', label: 'Critical Chance', iconId: 'CritIconGold' },
                            { key: 'attack_speed', label: 'Attack Speed', iconId: 'ASIconOrange' },
                            { key: 'lifesteal', label: 'Lifesteal', iconId: 'Lifesteal' },
                            { key: 'magical_lifesteal', label: 'Magical Lifesteal', iconId: 'MagicalLifesteal' },
                            { key: 'omnivamp', label: 'Omnivamp', iconId: 'Omnivamp' },
                            { key: 'heal_shield_increase', label: 'Heal & Shield Power', iconId: 'HealShield' },
                            { key: 'max_mana', label: 'Mana', iconId: 'ManaBlue' },
                            { key: 'health_regeneration', label: 'Health Regen', iconId: 'HealthRegen' },
                            { key: 'mana_regeneration', label: 'Mana Regen', iconId: 'ManaRegen' },
                            { key: 'movement_speed', label: 'Movement Speed', iconId: 'MovementSpeed' },
                            { key: 'tenacity', label: 'Tenacity', iconId: 'Tenacity' },
                            { key: 'gold_per_second', label: 'Gold / Sec', iconId: 'GoldPerSecond' },
                          ].map((stat) => {
                            const isActive = activeStatFilters.includes(stat.key);
                            return (
                              <button
                                key={stat.key}
                                onClick={() => {
                                  if (isActive) {
                                    setActiveStatFilters(activeStatFilters.filter(k => k !== stat.key));
                                  } else {
                                    setActiveStatFilters([...activeStatFilters, stat.key]);
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
                                  border: '1px solid ' + (isActive ? '#3b82f6' : 'rgba(255,255,255,0.08)'),
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '0.8rem',
                                  color: isActive ? '#60a5fa' : '#cbd5e1',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'center' }} dangerouslySetInnerHTML={{ __html: getStatIconHtml(stat.iconId, 16) }} />
                                <span>{stat.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ITEMS LIST (Displayed in full, no max-height or scroll constraints) */}
                    <div>
                      {browserTab === 'items' && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {filteredItems.filter(i => i.slot_type !== 'Crest').slice(0, visibleItemsCount).map((item) => (
                              <div
                                key={item.slug}
                                onClick={() => addBuildItem(item)}
                                onMouseEnter={() => setHoveredItem(item)}
                                onMouseLeave={() => setHoveredItem(null)}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px',
                                  padding: '16px',
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={item.image_url} alt={item.display_name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                                  <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{item.display_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.total_price}g • {item.aggression_type || 'Neutral'}</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                                  {sortItemStats(item.stats || {}).map(([statKey, val]) => {
                                    const statLabel = statKey.replace(/_/g, ' ');
                                    const iconId = getStatIconId(statKey);
                                    return (
                                      <span key={statKey} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>
                                        <span style={{ display: 'flex', alignItems: 'center' }} dangerouslySetInnerHTML={{ __html: getStatIconHtml(iconId, 12) }} />
                                        {val} {statLabel}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                          {filteredItems.filter(i => i.slot_type !== 'Crest').length > visibleItemsCount && (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                              <button
                                onClick={() => setVisibleItemsCount(prev => prev + 16)}
                                style={{ padding: '8px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'background 0.2s' }}
                              >
                                Load More Items
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {browserTab === 'crests' && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {filteredCrests.slice(0, visibleCrestsCount).map((crestItem) => (
                              <div
                                key={crestItem.slug}
                                onClick={() => {
                                  if (activeBuild === 'B') {
                                    setBuildCrestB(crestItem)
                                  } else {
                                    setBuildCrest(crestItem)
                                  }
                                }}
                                onMouseEnter={() => setHoveredItem(crestItem)}
                                onMouseLeave={() => setHoveredItem(null)}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px',
                                  padding: '16px',
                                  background: 'rgba(59,130,246,0.04)',
                                  border: '1px solid rgba(59,130,246,0.15)',
                                  borderRadius: '12px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={crestItem.image_url} alt={crestItem.display_name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                                  <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#60a5fa' }}>{crestItem.display_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{crestItem.total_price}g • Crest</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                                  {sortItemStats(crestItem.stats || {}).map(([statKey, val]) => {
                                    const statLabel = statKey.replace(/_/g, ' ');
                                    const iconId = getStatIconId(statKey);
                                    return (
                                      <span key={statKey} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>
                                        <span style={{ display: 'flex', alignItems: 'center' }} dangerouslySetInnerHTML={{ __html: getStatIconHtml(iconId, 12) }} />
                                        {val} {statLabel}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                          {filteredCrests.length > visibleCrestsCount && (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                              <button
                                onClick={() => setVisibleCrestsCount(prev => prev + 16)}
                                style={{ padding: '8px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'background 0.2s' }}
                              >
                                Load More Crests
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {browserTab === 'eternals' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                              {eternals.slice(0, visibleEternalsCount).map((et) => {
                                const isSelected = (activeBuild === 'B' ? buildEternalB : buildEternal)?.slug === et.slug;
                                return (
                                  <div
                                    key={et.slug}
                                    onClick={() => {
                                      if (activeBuild === 'B') {
                                        setBuildEternalB(et)
                                        setSelectedBlessingsB([])
                                      } else {
                                        setBuildEternal(et)
                                        setSelectedBlessings([])
                                      }
                                    }}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '12px',
                                      padding: '16px',
                                      background: isSelected ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                                      border: '1px solid ' + (isSelected ? '#a855f7' : 'rgba(255,255,255,0.05)'),
                                      borderRadius: '12px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={et.image_url} alt={et.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                                      <div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#c084fc' }}>{et.display_name || et.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#a855f7' }}>Eternal Category</div>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }} dangerouslySetInnerHTML={{ __html: parseDescription(et.description) }} />
                                  </div>
                                );
                              })}
                            </div>
                            {eternals.length > visibleEternalsCount && (
                              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                                <button
                                  onClick={() => setVisibleEternalsCount(prev => prev + 16)}
                                  style={{ padding: '8px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'background 0.2s' }}
                                >
                                  Load More Eternals
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Minor Blessings Config */}
                          {(activeBuild === 'B' ? buildEternalB : buildEternal) && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px' }}>
                              <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '8px' }}>
                                Configure Minor Blessings for {(activeBuild === 'B' ? buildEternalB : buildEternal)?.display_name || (activeBuild === 'B' ? buildEternalB : buildEternal)?.name}
                              </h4>
                              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>Select up to 2 minor blessings (one from Group A, one from Group B).</p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                {['A', 'B'].map((group) => {
                                  const currentEternal = activeBuild === 'B' ? buildEternalB : buildEternal;
                                  const blessingsInGroup = currentEternal?.minor_blessings?.filter(b => b.group === group) || [];
                                  
                                  if (blessingsInGroup.length === 0) return null;

                                  return (
                                    <div key={group}>
                                      <strong style={{ color: group === 'A' ? '#3b82f6' : '#a855f7', fontSize: '0.85rem', display: 'block', marginBottom: '12px' }}>
                                        Group {group} Blessings
                                      </strong>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {blessingsInGroup.map((bless) => {
                                          const currentBlessings = activeBuild === 'B' ? selectedBlessingsB : selectedBlessings;
                                          const isChecked = currentBlessings.includes(bless.name);
                                          return (
                                            <label
                                              key={bless.name}
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                padding: '12px',
                                                background: isChecked ? 'rgba(168,85,247,0.05)' : 'rgba(255,255,255,0.01)',
                                                border: '1px solid ' + (isChecked ? '#a855f7' : 'rgba(255,255,255,0.05)'),
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={(e) => {
                                                    let next = [...currentBlessings];
                                                    if (e.target.checked) {
                                                      // Remove any other blessing in the SAME group
                                                      next = next.filter(n => {
                                                        const b = currentEternal?.minor_blessings?.find(mb => mb.name === n);
                                                        return !b || b.group !== group;
                                                      });
                                                      next.push(bless.name);
                                                    } else {
                                                      next = next.filter(n => n !== bless.name);
                                                    }
                                                    
                                                    if (activeBuild === 'B') {
                                                      setSelectedBlessingsB(next);
                                                    } else {
                                                      setSelectedBlessings(next);
                                                    }
                                                  }}
                                                  style={{ cursor: 'pointer' }}
                                                />
                                                <strong style={{ fontSize: '0.85rem' }}>{bless.name}</strong>
                                              </div>
                                              <span style={{ fontSize: '0.75rem', color: '#cbd5e1', marginLeft: '22px' }}>{bless.description}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {!(activeBuild === 'B' ? buildEternalB : buildEternal)?.minor_blessings?.length && (
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No minor blessings available.</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ANALYSIS RESULTS PANEL */}
                  {analysisResult && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Matchup Analysis Panel */}
                      {selectedHeroB && matchupResult && (
                        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
                          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Matchup Analysis</h4>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>1v1 dynamic breakdown of how Your Hero & Enemy Hero values collide.</p>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(['offensive', 'defensive', 'neutral'] as const).map((axisKey) => {
                              const axisLabels = {
                                offensive: { label: 'Offensive Axis', icon: '⚔️', color: '#ef4444' },
                                defensive: { label: 'Defensive Axis', icon: '🛡️', color: '#10b981' },
                                neutral: { label: 'Neutral Axis', icon: '⚖️', color: '#f59e0b' },
                              };
                              const labelInfo = axisLabels[axisKey];
                              const data = matchupResult[axisKey];
                              if (!data) return null;
                              return (
                                <div key={axisKey} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <strong style={{ fontSize: '0.95rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{labelInfo.icon}</span> <span>{labelInfo.label}</span>
                                    </strong>
                                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                      <span style={{ color: '#3b82f6' }}>{selectedHero.display_name}</span>
                                      <span style={{ color: '#94a3b8' }}>vs</span>
                                      <span style={{ color: '#a855f7' }}>{selectedHeroB.display_name}</span>
                                    </div>
                                  </div>
                                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: '1.4' }}>{data.explanation}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* DNA Profiling Visualisation */}
                        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 16px 0' }}>
                            DNA Profile Comparison
                          </h4>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {Object.entries(analysisResult.dna).map(([dim, score]) => {
                              const scoreB = analysisResultB?.dna[dim as keyof BuildDna] ?? 0
                              
                              const baseScore = analysisResult.baseDna[dim as keyof BuildDna] ?? 0;
                              const itemScore = analysisResult.itemDna[dim as keyof BuildDna] ?? 0;
                              
                              const baseScoreB = analysisResultB?.baseDna[dim as keyof BuildDna] ?? 0;
                              const itemScoreB = analysisResultB?.itemDna[dim as keyof BuildDna] ?? 0;

                              return (
                                <div key={dim} style={{ fontSize: '0.85rem' }}>
                                  <div
                                    onClick={() => triggerExplanation('dna_change', {
                                      dnaDimension: dim
                                    })}
                                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', cursor: 'pointer' }}
                                    title="Click to explain this DNA score with rules engine"
                                  >
                                    <span style={{ textTransform: 'capitalize', color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                                      {dim.replace('_', ' ')}
                                      {dnaTooltips[dim] && (
                                        <span 
                                          style={{ marginLeft: '6px', cursor: 'help', color: '#38bdf8', fontSize: '0.85rem' }}
                                          title={dnaTooltips[dim]}
                                        >
                                          ℹ️
                                        </span>
                                      )}
                                    </span>
                                    <strong>
                                      <span style={{ color: '#3b82f6' }}>{score.toFixed(1)}</span>
                                      {selectedHeroB && (
                                        <>
                                          <span style={{ color: '#cbd5e1', margin: '0 4px' }}>vs</span>
                                          <span style={{ color: '#a855f7' }}>{scoreB.toFixed(1)}</span>
                                        </>
                                      )}
                                    </strong>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <div style={{ fontSize: '9px', color: '#94a3b8' }}>Your Hero (Base {baseScore.toFixed(1)} + Items {itemScore.toFixed(1)})</div>
                                      <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ height: '100%', width: `${baseScore * 10}%`, background: '#3b82f6', transition: 'width 0.3s ease' }} title={`Base: ${baseScore.toFixed(1)}`} />
                                        <div style={{ height: '100%', width: `${itemScore * 10}%`, background: '#60a5fa', transition: 'width 0.3s ease' }} title={`Items: ${itemScore.toFixed(1)}`} />
                                      </div>
                                    </div>
                                    
                                    {selectedHeroB && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div style={{ fontSize: '9px', color: '#cbd5e1' }}>Enemy Hero (Base {baseScoreB.toFixed(1)} + Items {itemScoreB.toFixed(1)})</div>
                                        <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                                          <div style={{ height: '100%', width: `${baseScoreB * 10}%`, background: '#a855f7', transition: 'width 0.3s ease' }} title={`Base: ${baseScoreB.toFixed(1)}`} />
                                          <div style={{ height: '100%', width: `${itemScoreB * 10}%`, background: '#c084fc', transition: 'width 0.3s ease' }} title={`Items: ${itemScoreB.toFixed(1)}`} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Strengths & Weaknesses / Build Confidence */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 12px 0' }}>Strengths & Weaknesses</h4>
                            {selectedHeroB && analysisResultB ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '20px' }}>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '10px' }}>Your Hero ({selectedHero.display_name})</div>
                                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {analysisResult.strengths.map((str, i) => (
                                      <div key={i} style={{ color: '#34d399', display: 'flex', gap: '6px' }}>
                                        <span>✓</span> <span>{str}</span>
                                      </div>
                                    ))}
                                    {analysisResult.weaknesses.map((weak, i) => (
                                      <div key={i} style={{ color: '#f87171', display: 'flex', gap: '6px' }}>
                                        <span>!</span> <span>{weak}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '10px' }}>Enemy Hero ({selectedHeroB.display_name})</div>
                                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {analysisResultB.strengths.map((str, i) => (
                                      <div key={i} style={{ color: '#34d399', display: 'flex', gap: '6px' }}>
                                        <span>✓</span> <span>{str}</span>
                                      </div>
                                    ))}
                                    {analysisResultB.weaknesses.map((weak, i) => (
                                      <div key={i} style={{ color: '#f87171', display: 'flex', gap: '6px' }}>
                                        <span>!</span> <span>{weak}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {analysisResult.strengths.map((str, i) => (
                                  <div key={i} style={{ color: '#34d399', display: 'flex', gap: '6px' }}>
                                    <span>✓</span> <span>{str}</span>
                                  </div>
                                ))}
                                {analysisResult.weaknesses.map((weak, i) => (
                                  <div key={i} style={{ color: '#f87171', display: 'flex', gap: '6px' }}>
                                    <span>!</span> <span>{weak}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                            <h4
                              onClick={() => triggerExplanation('confidence_delta', {
                                confidenceDelta: analysisResult.confidenceScore - 50,
                                confidenceReason: analysisResult.confidenceBreakdown.join(', ')
                              })}
                              style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 6px 0', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
                              title="Click to explain confidence delta with rules engine"
                            >
                              <span>Build Confidence</span>
                              <strong style={{ color: '#3b82f6' }}>{analysisResult.confidenceScore}%</strong>
                            </h4>
                            <ul style={{ fontSize: '0.8rem', paddingLeft: '16px', color: '#94a3b8', margin: '10px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {analysisResult.confidenceBreakdown.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* PREMIUM AI COACHING VIEW */}
                      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
                          <div>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>AI Build Analysis & Strategic Coach</h4>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Stream deep build insights directly using your selected model provider.</p>
                          </div>
                          {!isPremium ? (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              🔒 Premium Feature
                            </div>
                          ) : (
                            <button
                              disabled={isAnalyzing}
                              onClick={runAIAnalysis}
                              style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#3b82f6', color: 'white', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                              {isAnalyzing ? 'Analyzing Build...' : '🚀 Start AI Analysis'}
                            </button>
                          )}
                        </div>

                        {isPremium && aiAnalysisText && (
                          <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                            {aiAnalysisText}
                          </div>
                        )}

                        {isPremium && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#f8fafc' }}>Ask AI strategic questions:</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                placeholder='e.g., "Is this build right for the current meta against heavy-tank compositions?"'
                                value={aiQuestion}
                                onChange={(e) => setAiQuestion(e.target.value)}
                                style={{ flex: 1, background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 12px', color: 'white', fontSize: '0.85rem' }}
                              />
                              <button
                                disabled={isExplaining || !aiQuestion}
                                onClick={runAIExplain}
                                style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#10b981', color: 'white', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
                              >
                                {isExplaining ? 'Thinking...' : 'Ask Coach'}
                              </button>
                            </div>
                            {aiExplainText && (
                              <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                                {aiExplainText}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* PREMIUM SHARE BUILD SECTION */}
                      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>Share Your Simulation Build</h4>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>Generate a copyable summary of your stats, items, and matchup analytics to share with other players.</p>
                        <button
                          onClick={handleShareBuild}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px 32px',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                          }}
                        >
                          {shareSuccess ? '✓ Copied Build Report!' : '🔗 Copy Shareable Build'}
                        </button>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

            {/* HERO B SELECTION DRAWER/OVERLAY */}
            {isHeroBModalOpen && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Select Opponent Hero (Hero B)</h3>
                    <button onClick={() => setIsHeroBModalOpen(false)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                    {heroes.filter(h => h.slug !== selectedHero?.slug).map((hero) => (
                      <div
                        key={hero.slug}
                        onClick={() => {
                          setSelectedHeroB(hero)
                          setBuildItemsB([])
                          setBuildCrestB(null)
                          setBuildEternalB(null)
                          setIsHeroBModalOpen(false)
                          setActiveBuild('B') // Automatically switch to Build B
                        }}
                        style={{ cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', padding: '6px' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={hero.image_url} alt={hero.display_name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 6px auto' }} />
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>{hero.display_name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* RULES ENGINE EXPLANATION MODAL */}
            {explanationModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '450px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#3b82f6' }}>{explanationModal.title}</h4>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600' }}>Context: {explanationModal.context}</span>
                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                    {explanationModal.explanation}
                  </p>
                  <button
                    onClick={() => setExplanationModal(null)}
                    style={{ width: '100%', padding: '10px', border: 'none', background: '#3b82f6', color: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── 2. SAVED BUILDS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'saved' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>Your Saved Build Specifications</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#cbd5e1', fontWeight: 'bold' }}>
                  {savedBuilds.length} / {isPremium ? PREMIUM_BUILD_LIMIT : FREE_BUILD_LIMIT} Saved Builds {isPremium ? '🌟 (Premium)' : '(Free)'}
                </span>
                {!isPremium && (
                  <button
                    onClick={() => setIsSubscriptionModalOpen(true)}
                    style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', color: '#090d16', border: 'none', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Upgrade to 100 Builds 🚀
                  </button>
                )}
              </div>
            </div>
            {!isPremium && (
              <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🕒</span>
                  <span style={{ fontSize: '0.85rem', color: '#fef08a' }}>
                    <strong>Free Tier Notice:</strong> Builds saved on free tier accounts are retained in cloud storage for <strong>14 days</strong>. Upgrade to Premium for permanent cloud storage & up to 100 build slots.
                  </span>
                </div>
                <button
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  style={{ padding: '4px 12px', background: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308', color: '#fef08a', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Keep Permanently 🌟
                </button>
              </div>
            )}
            {savedBuilds.length === 0 ? (
              <div style={{ padding: '40px', background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', textAlign: 'center', color: '#94a3b8' }}>
                No saved builds found. Go to the Lab sandbox to construct and save custom theorycrafting builds.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {savedBuilds.map((build) => {
                  const heroObjA = heroes.find(h => h.slug === build.heroSlug)
                  const heroObjB = build.heroBSlug ? heroes.find(h => h.slug === build.heroBSlug) : null
                  const totalCost = build.totalGold || ((build.gold || 0) + (build.goldB || 0))

                  return (
                    <div key={build.id} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', position: 'relative' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={heroObjA?.image_url} alt={build.heroName} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6', zIndex: 2 }} />
                          {heroObjB && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={heroObjB?.image_url} alt={build.heroBName} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #a855f7', marginLeft: '-16px', zIndex: 1 }} />
                          )}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{build.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {heroObjB ? `${build.heroName} vs ${build.heroBName} • Matchup Spec` : `${build.heroName} • ${build.role} • Lvl ${build.level}`}
                          </span>
                        </div>
                      </div>

                      {build.description && (
                        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0 }}>{build.description}</p>
                      )}

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#eab308', fontWeight: 'bold' }}>Cost: {totalCost}g</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => loadSavedBuild(build)}
                            style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: '#3b82f6', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            🧪 Load
                          </button>
                          <button
                            onClick={() => deleteSavedBuild(build.id)}
                            style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            ✕ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 3. META TRACKER TAB ──────────────────────────────────────────────── */}
        {/* ── 3. META TRACKER TAB ──────────────────────────────────────────────── */}
        {activeTab === 'meta' && (() => {
          const snapshot = metaSnapshots[0] || { hero_win_rates: {}, hero_pick_rates: {}, hero_tier_movements: {}, popular_builds: {}, trending_items: [] }
          const narrative = metaNarratives[0] || { summary: 'No active meta summary for this patch. Ingest more match stats to compute metrics.', observations: [] }

          // Convert snapshot hero deltas/rates to display lists
          const heroDeltaList = Object.entries(snapshot.hero_tier_movements || {}).map(([id, move]: any) => {
            const heroObj = heroes.find(h => String(h.id) === id || h.slug === id)
            return {
              id,
              hero: heroObj,
              delta: move.delta || 0,
              current_rank: move.current_rank,
              win_rate: snapshot.hero_win_rates[id] || 50
            }
          })

          const risingHeroes = heroDeltaList.filter(h => h.delta > 0).sort((a,b) => b.delta - a.delta).slice(0, 5)
          const fallingHeroes = heroDeltaList.filter(h => h.delta < 0).sort((a,b) => a.delta - b.delta).slice(0, 5)

          return (
            <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0, color: 'white' }}>Meta Tracker</h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Stats-derived metrics from analyzing match synergy and build frequencies.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={async () => {
                      await fetch('/api/admin/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'compute_meta' }) })
                      await fetch('/api/admin/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'compute_narrative' }) })
                      alert('Meta recalculated! Please refresh the page.')
                      window.location.reload()
                    }}
                    style={{ padding: '8px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    📈 Re-compute Snapshots
                  </button>
                </div>
              </div>

              {/* Grid sections */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                
                {/* Left Side: Narratives and Popular Builds */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Narrative Block */}
                  <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', margin: '0 0 12px 0' }}>Patch Meta Narrative Summary</h3>
                    <p style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 16px 0' }}>{narrative.summary}</p>
                    {narrative.observations && narrative.observations.length > 0 && (
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
                        {narrative.observations.map((obs: string, idx: number) => (
                          <li key={idx} style={{ lineHeight: '1.4' }}>{obs}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Popular Builds Grid */}
                  <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', margin: '0 0 16px 0' }}>Popular Reference Builds</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '-10px 0 20px 0' }}>Top combos per hero per role. Click a build to import and adjust it inside the Lab.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {Object.entries(snapshot.popular_builds || {}).slice(0, 6).map(([heroId, bList]: any) => {
                        const heroObj = heroes.find(h => String(h.id) === heroId || h.slug === heroId)
                        if (!heroObj) return null
                        return (
                          <div key={heroId} style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={heroObj.image_url} alt={heroObj.display_name} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                              <div>
                                <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', margin: 0, color: 'white' }}>{heroObj.display_name}</h4>
                                <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Role: {bList[0]?.role || 'General'}</span>
                              </div>
                            </div>

                            {/* Build Items */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {(bList[0]?.items || []).slice(0, 6).map((bi: any, index: number) => {
                                const matchedItem = items.find(i => i.slug === bi.slug || i.name === bi.name)
                                return (
                                  <div
                                    key={index}
                                    title={matchedItem?.display_name || bi.name}
                                    style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', background: '#1e293b' }}
                                  >
                                    {matchedItem ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={matchedItem.image_url} alt={matchedItem.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>⚔️</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            <button
                              onClick={() => {
                                if (activeBuild === 'B') {
                                  setSelectedHeroB(heroObj)
                                  setBuildRoleB(bList[0]?.role || 'Offlane')
                                  setLevelB(15)
                                  const loaded = (bList[0]?.items || []).map((bi: any) => items.find(i => i.slug === bi.slug || i.name === bi.name)).filter(Boolean) as ItemDoc[]
                                  setBuildItemsB(loaded)
                                  setBuildCrestB(null)
                                  setBuildEternalB(null)
                                } else {
                                  setSelectedHero(heroObj)
                                  setBuildRole(bList[0]?.role || 'Offlane')
                                  setLevelA(15)
                                  const loaded = (bList[0]?.items || []).map((bi: any) => items.find(i => i.slug === bi.slug || i.name === bi.name)).filter(Boolean) as ItemDoc[]
                                  setBuildItems(loaded)
                                  setBuildCrest(null)
                                  setBuildEternal(null)
                                }
                                setActiveTab('lab')
                              }}
                              style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              🧪 Open in Lab
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>

                {/* Right Side: Rising/Falling Lists and Trending Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Rising/Falling Panel */}
                  <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white', margin: '0 0 14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>🚀 Rising Heroes</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      {risingHeroes.map((h, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                          <span style={{ color: 'white', fontWeight: '500' }}>{h.hero?.display_name || h.id}</span>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{h.delta} rank delta</span>
                        </div>
                      ))}
                      {risingHeroes.length === 0 && <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>No rising hero signals in current snapshot.</span>}
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white', margin: '0 0 14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>📉 Falling Heroes</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {fallingHeroes.map((h, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                          <span style={{ color: 'white', fontWeight: '500' }}>{h.hero?.display_name || h.id}</span>
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{h.delta} rank delta</span>
                        </div>
                      ))}
                      {fallingHeroes.length === 0 && <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>No falling hero signals in current snapshot.</span>}
                    </div>
                  </div>

                  {/* Trending Items Panel */}
                  <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white', margin: '0 0 14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>🔥 Trending Items</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {(snapshot.trending_items || []).slice(0, 10).map((slug: string, i: number) => {
                        const itemObj = items.find(it => it.slug === slug)
                        if (!itemObj) return null
                        return (
                          <div
                            key={i}
                            title={itemObj.display_name}
                            onClick={() => {
                              setSelectedLibraryItem(itemObj)
                              setLibrarySection('items')
                              setActiveTab('library')
                            }}
                            style={{ cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', color: '#f1f5f9' }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={itemObj.image_url} alt={itemObj.display_name} style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
                            <span>{itemObj.display_name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )
        })()}

        {/* ── 4. REVAMPED FEED TAB ──────────────────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 'bold', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Predecessor Central Hub
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}>
                    UGC & AI Content Engine
                  </span>
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
                  The central hub for Predecessor UGC videos, AI-driven gameplay & hero guides, and official developer announcements.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href="/admin"
                  style={{ padding: '8px 14px', background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ⚙️ Admin AI Dashboard
                </a>
              </div>
            </div>

            {/* ── SECTION 1: ENDLESS HORIZONTAL YOUTUBE UGC CAROUSEL ───────────────── */}
            <div style={{ background: 'linear-gradient(180deg, #111827 0%, #0b0f19 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#ef4444' }}>📺</span> Predecessor UGC Video Hub
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Endless horizontal carousel • Powered by YouTube player resources</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const el = document.getElementById('ugc-carousel-container')
                      if (el) el.scrollBy({ left: -320, behavior: 'smooth' })
                    }}
                    style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    ← Left
                  </button>
                  <button
                    onClick={() => {
                      const el = document.getElementById('ugc-carousel-container')
                      if (el) el.scrollBy({ left: 320, behavior: 'smooth' })
                    }}
                    style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Right →
                  </button>
                </div>
              </div>

              {/* Horizontal Endless Scroll Container */}
              <div
                id="ugc-carousel-container"
                style={{
                  display: 'flex',
                  gap: '16px',
                  overflowX: 'auto',
                  scrollSnapType: 'x mandatory',
                  paddingBottom: '12px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#3b82f6 #111827',
                }}
              >
                {loadingUgc ? (
                  <div style={{ padding: '40px', color: '#94a3b8' }}>Loading YouTube playlist...</div>
                ) : (
                  // Duplicate items array to create seamless endless horizontal scroll feel
                  [...ugcVideos, ...ugcVideos].map((video, idx) => (
                    <div
                      key={`${video.id}_${idx}`}
                      onClick={() => setSelectedUgcVideoId(video.videoId)}
                      style={{
                        minWidth: '280px',
                        maxWidth: '280px',
                        scrollSnapAlign: 'start',
                        background: '#090d16',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                      {/* Thumbnail Container */}
                      <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#1e293b' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={video.thumbnailUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#ef4444', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '1.2rem', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.5)' }}>
                            ▶
                          </div>
                        </div>
                        {video.duration && (
                          <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.85)', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {video.duration}
                          </span>
                        )}
                      </div>

                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white', lineHeight: '1.3', lineClamp: 2, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {video.title}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: 'auto' }}>
                          <span>{video.channelName}</span>
                          {video.views && <span>{video.views} views</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── SECTION 2: TARGETED AI POSTS FEED (SEO DRIVER) ──────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🤖 Targeted Gameplay & Hero AI Guides
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>SEO-focused guides, hero breakdowns, and macro gameplay tutorials</span>
                </div>

                {/* Category Filters */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'All Guides' },
                    { id: 'gameplay', label: '🎮 Gameplay & Macro' },
                    { id: 'hero_guide', label: '⚔️ Hero Guides' },
                    { id: 'item_overview', label: '🛡️ Build & Item Overviews' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setAiCategoryFilter(cat.id)}
                      style={{
                        padding: '6px 14px',
                        background: aiCategoryFilter === cat.id ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                        color: aiCategoryFilter === cat.id ? 'white' : '#cbd5e1',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of AI Posts */}
              {loadingAiPosts ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading AI posts...</div>
              ) : aiPosts.filter((p) => aiCategoryFilter === 'all' || p.category === aiCategoryFilter).length === 0 ? (
                <div style={{ background: '#111827', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', color: '#94a3b8' }}>
                  No approved posts found for this category. Visit the <a href="/admin" style={{ color: '#38bdf8' }}>Admin Dashboard</a> to review or seed posts.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {aiPosts
                    .filter((p) => aiCategoryFilter === 'all' || p.category === aiCategoryFilter)
                    .map((post) => (
                      <div
                        key={post.id}
                        onClick={() => setSelectedAiPostModal(post)}
                        style={{
                          background: 'linear-gradient(180deg, #111827 0%, #0d1322 100%)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '16px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#3b82f6'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        {/* Header Badges */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', background: '#3b82f6', color: 'white', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                            {post.category?.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: 'white', lineHeight: '1.3' }}>
                          {post.title}
                        </h4>

                        {/* Summary */}
                        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineClamp: 3, WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {post.summary}
                        </p>

                        {/* Tags & Author */}
                        <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {post.tags?.slice(0, 3).map((t: string) => (
                              <span key={t} style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: '#38bdf8', borderRadius: '4px' }}>
                                #{t}
                              </span>
                            ))}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 'bold' }}>Read Full Guide →</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* ── SECTION 3: OFFICIAL PREDECESSOR NEWS ────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#3b82f6' }}>📰</span> Official Predecessor Announcements
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Direct developer updates from predecessors official news page (predecessorgame.com)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {officialNewsItems.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: '#111827',
                      border: '2px solid #3b82f6',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#1e293b' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', background: '#3b82f6', color: 'white', padding: '4px 8px', borderRadius: '6px' }}>
                          Official Announcement
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, color: 'white', lineHeight: '1.4' }}>{item.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineClamp: 3, WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.excerpt}</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '10px' }}>
                        <a
                          href={item.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none', padding: '6px 12px', background: '#3b82f6', color: 'white', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          Read on Predecessor Site ↗
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── MODAL 1: YOUTUBE VIDEO PLAYER ────────────────────────────────────── */}
            {selectedUgcVideoId && (
              <div
                onClick={() => setSelectedUgcVideoId(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.85)',
                  zIndex: 9999,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '20px',
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: '#0f172a',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '850px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontWeight: 'bold', color: 'white', fontSize: '0.95rem' }}>📺 Predecessor UGC Video Player</span>
                    <button
                      onClick={() => setSelectedUgcVideoId(null)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ aspectRatio: '16/9', width: '100%', background: 'black' }}>
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube-nocookie.com/embed/${selectedUgcVideoId}?autoplay=1`}
                      title="Predecessor UGC Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── MODAL 2: AI POST FULL READER ─────────────────────────────────────── */}
            {selectedAiPostModal && (
              <div
                onClick={() => setSelectedAiPostModal(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.85)',
                  zIndex: 9999,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '20px',
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: '#0f172a',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '800px',
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    color: '#f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
                    <div>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#3b82f6', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {selectedAiPostModal.category?.replace('_', ' ')}
                      </span>
                      <h2 style={{ margin: '8px 0 0 0', fontSize: '1.5rem', color: 'white' }}>{selectedAiPostModal.title}</h2>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                        Author: {selectedAiPostModal.author} • Published: {new Date(selectedAiPostModal.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAiPostModal(null)}
                      style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                      Close ✕
                    </button>
                  </div>

                  {/* Summary & Tags */}
                  <div style={{ background: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155', fontSize: '0.9rem' }}>
                    <div style={{ fontStyle: 'italic', color: '#cbd5e1' }}>"{selectedAiPostModal.summary}"</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {selectedAiPostModal.tags?.map((t: string) => (
                        <span key={t} style={{ padding: '2px 8px', background: '#0f172a', color: '#38bdf8', borderRadius: '4px', fontSize: '0.75rem' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Full Body Markdown Text */}
                  <div style={{ background: '#020617', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b', lineHeight: '1.6', fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
                    {selectedAiPostModal.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 5. LIBRARY TAB ───────────────────────────────────────────────────── */}
        {/* ── 5. LIBRARY TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'library' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Sub navigation buttons */}
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              {(['heroes', 'items', 'crests', 'eternals', 'patches'] as const).map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    setLibrarySection(sec)
                    setSelectedLibraryHero(null)
                    setSelectedLibraryItem(null)
                    setSelectedLibraryEternal(null)
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: librarySection === sec ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {sec}
                </button>
              ))}
            </div>

            {/* 5.1 HEROES SECTION */}
            {librarySection === 'heroes' && (
              <div>
                {!selectedLibraryHero ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                    {heroes.map((hero) => (
                      <div
                        key={hero.slug}
                        onClick={() => { setSelectedLibraryHero(hero); setLibraryHeroLevel(1); }}
                        style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', background: '#111827', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={hero.image_url} alt={hero.display_name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                        <div style={{ padding: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: 'white' }}>{hero.display_name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#111827', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button onClick={() => setSelectedLibraryHero(null)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>← Back to Heroes</button>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>{selectedLibraryHero.display_name} Detail</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                      {/* Left: Image, Level Slider, and dynamic stats */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedLibraryHero.image_url} alt={selectedLibraryHero.display_name} style={{ width: '100%', borderRadius: '12px', aspectRatio: '1/1', objectFit: 'cover' }} />
                        
                        <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                            <span>Interactive Stats Slider</span>
                            <strong style={{ color: '#3b82f6' }}>Level {libraryHeroLevel}</strong>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="18"
                            value={libraryHeroLevel}
                            onChange={(e) => setLibraryHeroLevel(Number(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer', marginBottom: '16px' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>Max Health</span>
                              <strong style={{ color: '#34d399' }}>{selectedLibraryHero.base_stats.max_health[libraryHeroLevel-1]}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>Max Mana</span>
                              <strong style={{ color: '#34d399' }}>{selectedLibraryHero.base_stats.max_mana[libraryHeroLevel-1]}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>Physical Power</span>
                              <strong style={{ color: '#3b82f6' }}>{selectedLibraryHero.base_stats.physical_power[libraryHeroLevel-1]}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>Magical Power</span>
                              <strong style={{ color: '#ec4899' }}>{selectedLibraryHero.base_stats.magical_power?.[libraryHeroLevel-1] ?? 0}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>Physical Armor</span>
                              <strong style={{ color: '#f59e0b' }}>{selectedLibraryHero.base_stats.physical_armor[libraryHeroLevel-1]}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>Magical Armor</span>
                              <strong style={{ color: '#a855f7' }}>{selectedLibraryHero.base_stats.magical_armor[libraryHeroLevel-1]}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Abilities overview */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'white', margin: 0 }}>Ability Breakdown</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {selectedLibraryHero.abilities?.map((ab: any, idx: number) => (
                            <div key={idx} style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={ab.image_url} alt={ab.display_name} style={{ width: '48px', height: '48px', borderRadius: '6px', alignSelf: 'flex-start' }} />
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ color: 'white', fontSize: '0.95rem' }}>{ab.display_name}</strong>
                                  <span style={{ fontSize: '0.7rem', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Key: {ab.key}</span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: parseDescription(ab.game_description) }} />
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }} dangerouslySetInnerHTML={{ __html: parseDescription(ab.menu_description) }} />
                                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', gap: '12px', marginTop: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                                  <span>Cooldown: {ab.cooldown?.join(' / ') || 'None'}s</span>
                                  <span>Mana: {ab.cost?.join(' / ') || 'None'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Most Popular Build Card (pred.gg) */}
                      {selectedLibraryHero.popular_build && (
                        <div style={{ background: '#090d16', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h5 style={{ fontWeight: 'bold', fontSize: '1rem', color: '#60a5fa', margin: 0 }}>📊 Most Popular Build (pred.gg)</h5>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Scraped weekly from live match statistics</span>
                            </div>
                            <button
                              onClick={() => {
                                const pop = selectedLibraryHero.popular_build;
                                if (!pop) return;
                                setSelectedHero(selectedLibraryHero);
                                const resolved = (pop.item_slugs || [])
                                  .map(slug => items.find(i => i.slug === slug))
                                  .filter((i): i is ItemDoc => Boolean(i));
                                setBuildItems(resolved);
                                if (pop.crest_slug) {
                                  const cr = items.find(i => i.slug === pop.crest_slug);
                                  if (cr) setBuildCrest(cr);
                                }
                                if (pop.eternal_slug) {
                                  const et = eternals.find(e => e.slug.toLowerCase() === pop.eternal_slug?.toLowerCase());
                                  if (et) setBuildEternal(et);
                                }
                                setActiveTab('lab');
                              }}
                              style={{ padding: '6px 14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              ⚡ Load Build in Lab
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Items */}
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {selectedLibraryHero.popular_build.item_slugs?.map((slug, idx) => {
                                const itemDoc = items.find(i => i.slug === slug);
                                return (
                                  <div key={idx} style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} title={itemDoc?.display_name || slug}>
                                    {itemDoc ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={itemDoc.image_url} alt={itemDoc.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{slug}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Crest */}
                            {selectedLibraryHero.popular_build.crest_slug && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '12px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Crest:</span>
                                {(() => {
                                  const cr = items.find(i => i.slug === selectedLibraryHero.popular_build?.crest_slug);
                                  return cr ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={cr.image_url} alt={cr.display_name} style={{ width: '28px', height: '28px', borderRadius: '4px' }} />
                                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#60a5fa' }}>{cr.display_name}</span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{selectedLibraryHero.popular_build.crest_slug}</span>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Stats badge */}
                            {selectedLibraryHero.popular_build.win_rate && (
                              <div style={{ marginLeft: 'auto', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', color: '#34d399', fontWeight: 'bold' }}>
                                {selectedLibraryHero.popular_build.win_rate}% Win Rate ({selectedLibraryHero.popular_build.match_count?.toLocaleString()} matches)
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 📚 Related AI Guides for Hero */}
                      {(() => {
                        const relatedPosts = aiPosts.filter(
                          (p) =>
                            p.heroId?.toLowerCase() === selectedLibraryHero.slug.toLowerCase() ||
                            p.tags?.some((t: string) => t.toLowerCase() === selectedLibraryHero.slug.toLowerCase() || t.toLowerCase() === selectedLibraryHero.display_name.toLowerCase())
                        )
                        if (relatedPosts.length === 0) return null
                        return (
                          <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              🤖 AI Guides & Posts tagged for {selectedLibraryHero.display_name}
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                              {relatedPosts.map((post) => (
                                <div
                                  key={post.id}
                                  onClick={() => setSelectedAiPostModal(post)}
                                  style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}
                                >
                                  <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold' }}>{post.category?.replace('_', ' ').toUpperCase()}</div>
                                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'white' }}>{post.title}</div>
                                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineClamp: 2, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.summary}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginTop: '4px', fontWeight: 'bold' }}>Read Guide →</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5.2 ITEMS SECTION */}
            {librarySection === 'items' && (
              <div>
                {!selectedLibraryItem ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                    {items.filter(i => i.slot_type !== 'Crest').map((item) => (
                      <div
                        key={item.slug}
                        onClick={() => setSelectedLibraryItem(item)}
                        style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', background: '#111827', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image_url} alt={item.display_name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                        <div style={{ padding: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: 'white' }}>{item.display_name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#111827', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button onClick={() => setSelectedLibraryItem(null)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>← Back to Items</button>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>{selectedLibraryItem.display_name} Detail</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                      {/* Left Block */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedLibraryItem.image_url} alt={selectedLibraryItem.display_name} style={{ width: '100%', borderRadius: '12px', aspectRatio: '1/1', objectFit: 'cover' }} />
                        <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Price:</span>
                            <strong style={{ color: '#eab308' }}>{selectedLibraryItem.total_price}g</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tier Classification:</span>
                            <span style={{ fontSize: '0.75rem', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Tier {selectedLibraryItem.tier || 3}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Aggression Type:</span>
                            <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>{selectedLibraryItem.aggression_type || 'General'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Popularity Signal:</span>
                            <span style={{ fontSize: '0.75rem', background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Appears in 48% of builds</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Stats and Build Trees */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Stats block */}
                        {selectedLibraryItem.stats && Object.keys(selectedLibraryItem.stats).length > 0 && (
                          <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px' }}>
                            <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'white', margin: '0 0 10px 0' }}>Item Stats Block</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                              {sortItemStats(selectedLibraryItem.stats).map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px' }}>
                                  <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                                  <strong style={{ color: '#3b82f6' }}>+{v}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Effects list */}
                        {selectedLibraryItem.effects && selectedLibraryItem.effects.length > 0 && (
                          <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px' }}>
                            <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'white', margin: '0 0 10px 0' }}>Passives & Actives</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {selectedLibraryItem.effects.map((eff, i) => (
                                <div key={i} style={{ fontSize: '0.85rem' }}>
                                  <strong style={{ color: '#10b981' }}>{eff.name}:</strong>
                                  <p style={{ color: '#cbd5e1', margin: '4px 0 0 0', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: parseDescription(eff.menu_description) }} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Build Path Tree */}
                        <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px' }}>
                          <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'white', margin: '0 0 10px 0' }}>Build Recipe Tree</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
                            {/* Builds from */}
                            {selectedLibraryItem.requirements && selectedLibraryItem.requirements.length > 0 ? (
                              <div style={{ display: 'flex', gap: '12px' }}>
                                {selectedLibraryItem.requirements.map((reqSlug) => {
                                  const reqObj = items.find(it => it.slug === reqSlug)
                                  if (!reqObj) return null
                                  return (
                                    <div
                                      key={reqSlug}
                                      onClick={() => setSelectedLibraryItem(reqObj)}
                                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={reqObj.image_url} alt={reqObj.display_name} style={{ width: '40px', height: '40px', borderRadius: '6px' }} />
                                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{reqObj.display_name}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Built from starting recipes directly</span>
                            )}
                            
                            <div style={{ fontSize: '1.2rem', color: '#3b82f6' }}>↓</div>

                            {/* Self */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(59,130,246,0.1)', padding: '10px 16px', borderRadius: '8px', border: '1px dashed #3b82f6' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={selectedLibraryItem.image_url} alt={selectedLibraryItem.display_name} style={{ width: '50px', height: '50px', borderRadius: '6px' }} />
                              <strong style={{ fontSize: '0.85rem', color: 'white' }}>{selectedLibraryItem.display_name} (Selected)</strong>
                            </div>

                            <div style={{ fontSize: '1.2rem', color: '#3b82f6' }}>↓</div>

                            {/* Builds into */}
                            {selectedLibraryItem.build_paths && selectedLibraryItem.build_paths.length > 0 ? (
                              <div style={{ display: 'flex', gap: '12px' }}>
                                {selectedLibraryItem.build_paths.map((pSlug) => {
                                  const pathObj = items.find(it => it.slug === pSlug)
                                  if (!pathObj) return null
                                  return (
                                    <div
                                      key={pSlug}
                                      onClick={() => setSelectedLibraryItem(pathObj)}
                                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={pathObj.image_url} alt={pathObj.display_name} style={{ width: '40px', height: '40px', borderRadius: '6px' }} />
                                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{pathObj.display_name}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>This is a Tier 3 final item (Terminal leaf)</span>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5.3 CRESTS SECTION */}
            {librarySection === 'crests' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                {items.filter(i => i.slot_type === 'Crest').map((crest) => (
                  <div
                    key={crest.slug}
                    onClick={() => { setSelectedLibraryItem(crest); setLibrarySection('items'); }}
                    style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', background: '#111827', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={crest.image_url} alt={crest.display_name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                    <div style={{ padding: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: 'white' }}>{crest.display_name}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 5.4 ETERNALS SECTION */}
            {librarySection === 'eternals' && (
              <div>
                {!selectedLibraryEternal ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {eternals.map((et) => (
                      <div
                        key={et.slug || et.name}
                        onClick={() => setSelectedLibraryEternal(et)}
                        style={{ cursor: 'pointer', background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={et.image_url || 'https://pred.gg/assets/5cb47a0f24283295.webp'} alt={et.display_name || et.name} style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                        <div>
                          <h4 style={{ fontWeight: 'bold', fontSize: '1rem', color: 'white', margin: 0 }}>{et.display_name || et.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>{et.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#111827', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button onClick={() => setSelectedLibraryEternal(null)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>← Back to Eternals</button>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>{selectedLibraryEternal.display_name || selectedLibraryEternal.name}</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedLibraryEternal.image_url || 'https://pred.gg/assets/5cb47a0f24283295.webp'} alt={selectedLibraryEternal.name} style={{ width: '100%', borderRadius: '12px', aspectRatio: '1/1', objectFit: 'cover' }} />
                        <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px', marginTop: '16px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                          <div>Category: <strong>{selectedLibraryEternal.category}</strong></div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px' }}>
                          <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'white', margin: '0 0 8px 0' }}>Main Passive / Active Effect</h4>
                          <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: parseDescription(selectedLibraryEternal.description) }} />
                        </div>

                        {selectedLibraryEternal.minor_blessings && selectedLibraryEternal.minor_blessings.length > 0 && (
                          <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px' }}>
                            <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'white', margin: '0 0 12px 0' }}>Minor Blessings</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div>
                                <strong style={{ color: '#3b82f6', fontSize: '0.8rem' }}>Group A Blessings</strong>
                                <ul style={{ fontSize: '0.75rem', paddingLeft: '16px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                  {selectedLibraryEternal.minor_blessings.filter((b: any) => b.group === 'A').map((b: any, i: number) => (
                                    <li key={i}><strong>{b.name}:</strong> <span dangerouslySetInnerHTML={{ __html: parseDescription(b.description) }} /></li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <strong style={{ color: '#a855f7', fontSize: '0.8rem' }}>Group B Blessings</strong>
                                <ul style={{ fontSize: '0.75rem', paddingLeft: '16px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                  {selectedLibraryEternal.minor_blessings.filter((b: any) => b.group === 'B').map((b: any, i: number) => (
                                    <li key={i}><strong>{b.name}:</strong> <span dangerouslySetInnerHTML={{ __html: parseDescription(b.description) }} /></li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5.5 PATCHES SECTION */}
            {librarySection === 'patches' && (
              <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>Predecessor Patch Notes History</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: 'white', fontSize: '1rem' }}>Patch v1.16.2</strong>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Released: 2026-07-02</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: '1.4' }}>
                      Balance adjustments for new Items including Tainted Blade. Offlaners pick rate adjustment. Level-based armor growth adjustments on support classes.
                    </p>
                  </div>

                  <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: 'white', fontSize: '1rem' }}>Patch v1.15.0</strong>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Released: 2026-06-15</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: '1.4' }}>
                      Ingested 12 confirmed game-wide Eternals minor blessing categories. Introduced scaling damage multipliers.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ── SAVE MODAL ───────────────────────────────────────────────────────── */}
      {isSaveModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', width: '420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Save Build Specification</h4>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '12px' }}>
                {savedBuilds.length} / {isPremium ? PREMIUM_BUILD_LIMIT : FREE_BUILD_LIMIT} builds
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Build Name *</label>
              <input
                type="text"
                value={saveBuildName}
                onChange={(e) => setSaveBuildName(e.target.value)}
                placeholder="e.g. Tanky Offlane Terra"
                style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 12px', color: 'white' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Description (optional)</label>
              <textarea
                value={saveBuildDesc}
                onChange={(e) => setSaveBuildDesc(e.target.value)}
                placeholder="Briefly notes context or item choices..."
                style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 12px', color: 'white', minHeight: '80px', fontFamily: 'inherit' }}
              />
            </div>

            {savedBuilds.length >= (isPremium ? PREMIUM_BUILD_LIMIT : FREE_BUILD_LIMIT) ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: '#fca5a5', margin: 0 }}>
                  ⚠️ You have reached your saved build limit ({isPremium ? PREMIUM_BUILD_LIMIT : FREE_BUILD_LIMIT} builds).
                </p>
                {!isPremium && (
                  <button
                    onClick={() => { setIsSaveModalOpen(false); setIsSubscriptionModalOpen(true); }}
                    style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', border: 'none', color: '#090d16', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Upgrade to Premium for 100 Builds 🚀
                  </button>
                )}
              </div>
            ) : !user && (
              <p style={{ fontSize: '0.75rem', color: '#fbbf24', margin: 0, fontStyle: 'italic' }}>
                Note: Account authentication will be required on the next step to complete saving your specification to Firebase.
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                style={{ padding: '8px 16px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                disabled={!saveBuildName || savedBuilds.length >= (isPremium ? PREMIUM_BUILD_LIMIT : FREE_BUILD_LIMIT)}
                onClick={triggerSaveBuild}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: (!saveBuildName || savedBuilds.length >= (isPremium ? PREMIUM_BUILD_LIMIT : FREE_BUILD_LIMIT)) ? 'rgba(255,255,255,0.1)' : '#10b981',
                  color: (!saveBuildName || savedBuilds.length >= (isPremium ? PREMIUM_BUILD_LIMIT : FREE_BUILD_LIMIT)) ? '#64748b' : 'white',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: (!saveBuildName || savedBuilds.length >= (isPremium ? PREMIUM_BUILD_LIMIT : FREE_BUILD_LIMIT)) ? 'not-allowed' : 'pointer'
                }}
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ABILITY INFORMATION MODAL/DRAWER ─────────────────────────────────── */}
      {selectedAbility && (
        <div 
          onClick={() => setSelectedAbility(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, cursor: 'pointer' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '16px', wordBreak: 'break-word', cursor: 'default' }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedAbility.image_url} alt={selectedAbility.display_name} style={{ width: '64px', height: '64px', borderRadius: '8px' }} />
              <div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{selectedAbility.display_name}</h4>
                <span style={{ fontSize: '0.85rem', color: selectedAbility.heroColor || '#3b82f6', fontWeight: 'bold' }}>
                  {selectedAbility.heroName ? `${selectedAbility.heroName} • ` : ''}Key: {selectedAbility.key} • {selectedAbility.type}
                </span>
              </div>
            </div>

            {parseDescription(selectedAbility.game_description) ? (
              <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                <span dangerouslySetInnerHTML={{ __html: parseDescription(selectedAbility.game_description) }} />
              </p>
            ) : null}

            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, fontStyle: 'italic', wordBreak: 'break-word' }}>
              <span dangerouslySetInnerHTML={{ __html: parseDescription(selectedAbility.menu_description) }} />
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', background: '#090d16', padding: '12px', borderRadius: '8px' }}>
              <div>Cooldowns: {selectedAbility.cooldown?.join(' / ') || 'None'}</div>
              <div>Mana Cost: {selectedAbility.cost?.join(' / ') || 'None'}</div>
            </div>

            <button
              onClick={() => setSelectedAbility(null)}
              style={{ width: '100%', padding: '10px', border: 'none', background: '#3b82f6', color: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* ── PROFILE TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <ProfileDashboard onLoginClick={() => setIsAuthModalOpen(true)} />
      )}
      {/* ── BOTTOM NAVIGATION BAR ────────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(17, 24, 39, 0.85)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'center', padding: '10px 0', zIndex: 90 }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            { id: 'lab', label: 'Lab', icon: '🧪' },
            { id: 'feed', label: 'Feed', icon: '📰' },
            { id: 'library', label: 'Library', icon: '📚' },
            { id: 'saved', label: 'Saved', icon: '💾' },
            { id: 'meta', label: 'Meta', icon: '📊' },
            { id: 'profile', label: 'Profile', icon: '👤' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 16px', color: activeTab === tab.id ? '#3b82f6' : '#94a3b8', transition: 'color 0.2s ease' }}
            >
              <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Floating Hover Tooltip */}
      {hoveredItem && (
        <div style={{
          position: 'fixed',
          left: mousePos.x + 16,
          top: mousePos.y + 16,
          width: '320px',
          background: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '16px',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#f8fafc', marginBottom: '4px' }}>{hoveredItem.display_name}</div>
          <div style={{ fontSize: '0.8rem', color: '#eab308', fontWeight: 'bold', marginBottom: '12px' }}>Cost: {hoveredItem.total_price}g</div>
          
          {hoveredItem.stats && Object.keys(hoveredItem.stats).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
              {sortItemStats(hoveredItem.stats).map(([stat, val]) => (
                <div key={stat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{stat.replace(/_/g, ' ')}</span>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>+{val}</span>
                </div>
              ))}
            </div>
          )}

          {hoveredItem.effects && hoveredItem.effects.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {hoveredItem.effects.map((eff, i) => (
                <div key={i} style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  <strong style={{ color: '#10b981' }}>{eff.name}: </strong>
                  <span dangerouslySetInnerHTML={{ __html: parseDescription(eff.menu_description) }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AUTH MODAL ─────────────────────────────────────────────────────────── */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* ── SUBSCRIPTION MODAL ─────────────────────────────────────────────────── */}
      <SubscriptionModal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} />

      {/* Keyframe animation declarations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
