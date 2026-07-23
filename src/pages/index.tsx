import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { getFirestore } from '@/lib/firebase-admin'
import { useAuth } from '@/lib/auth-context'
import { AuthModal } from '@/components/auth/AuthModal'
import { ProfileDashboard } from '@/components/profile/ProfileDashboard'
import { SubscriptionModal } from '@/components/premium/SubscriptionModal'
import { MainLayout } from '@/components/layout/MainLayout'
import { HomeView } from '@/components/views/HomeView'
import { BuildLabView } from '@/components/views/BuildLabView'
import { SavedCollectionView } from '@/components/views/SavedCollectionView'
import { MetaTrackerView } from '@/components/views/MetaTrackerView'
import { FeedView } from '@/components/views/FeedView'
import { LibraryView } from '@/components/views/LibraryView'
import { ItemTooltip } from '@/components/ui/ItemTooltip'
import { PatchNotesModal } from '@/components/ui/PatchNotesModal'
import { useSearchRegistry, SearchResultItem } from '@/lib/utils/search-engine'
import { calculateBuildStats } from '@/lib/simulation/engine'
import { calculateMatchupScore } from '@/lib/simulation/matchup'
import {
  fetchCloudBuilds,
  syncBuildsToCloud,
  saveCloudBuild,
  deleteCloudBuild,
  FREE_BUILD_LIMIT,
  PREMIUM_BUILD_LIMIT,
  SavedBuild,
} from '@/lib/sync/build-sync'
import {
  fetchCloudPosts,
  syncPostsToCloud,
  saveCloudPost,
  deleteCloudPost,
  FREE_POST_LIMIT,
  PREMIUM_POST_LIMIT,
  SavedPost,
} from '@/lib/sync/post-sync'
import type { DashboardProps, TabId, HeroDoc, ItemDoc, EternalDoc } from '@/types'

export async function getStaticProps() {
  try {
    const db = getFirestore()

    // Fetch static reference data that only changes per patch update (~every 6 weeks)
    const [heroesSnap, itemsSnap, eternalsSnap, statsSnap] = await Promise.all([
      db.collection('heroes').get(),
      db.collection('items').get(),
      db.collection('eternals').get(),
      db.collection('hero_statistics').orderBy('fetched_at', 'desc').limit(10).get(),
    ])

    const heroes = heroesSnap.docs.map((doc: any) => doc.data())
    const items = itemsSnap.docs.map((doc: any) => doc.data())
    const eternals = eternalsSnap.docs.map((doc: any) => doc.data())
    const statsDocs = statsSnap.docs.map((doc: any) => doc.data())

    const globalRankedDoc = statsDocs.find((d: any) => d.game_mode === 'ranked' && d.time_frame === '1M') || statsDocs.find((d: any) => d.game_mode === 'ranked')
    const globalPvpDoc = statsDocs.find((d: any) => d.game_mode === 'pvp' && d.time_frame === '1M') || statsDocs.find((d: any) => d.game_mode === 'pvp')

    const globalRankedStats = globalRankedDoc?.stats || []
    const globalPvpStats = globalPvpDoc?.stats || []

    const newestHero = heroes
      .filter((h: any) => h.id < 1000000)
      .reduce((prev: any, current: any) => (prev.id > current.id) ? prev : current, heroes[0] || null)
    const newestHeroId = newestHero ? newestHero.id : null

    const filterKeys = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'paragon', 'ranked_all', 'unranked', 'aram']
    const aggregatedStats: Record<string, Record<string, any>> = {}

    for (const filter of filterKeys) {
      aggregatedStats[filter] = {}

      for (const hero of heroes) {
        const heroSlug = hero.slug
        const isRankedFilter = filter !== 'unranked' && filter !== 'aram'
        const globalStatsSource = isRankedFilter ? globalRankedStats : globalPvpStats

        let globalWR = 50.0
        let globalPR = 10.0

        if (globalStatsSource) {
          const statEntry = globalStatsSource.find((s: any) => String(s.hero_id) === String(hero.id) || s.display_name?.toLowerCase() === hero.display_name?.toLowerCase())
          if (statEntry) {
            globalWR = statEntry.winrate || statEntry.win_rate || 50.0
            globalPR = statEntry.pickrate || statEntry.pick_rate || 10.0
          }
        }

        if (filter === 'aram') {
          const ccValue = hero.stats?.cc || 0
          const durability = hero.stats?.durability || 0
          const mobility = hero.stats?.mobility || 0
          const arAdjust = (ccValue * 0.8) + (durability > 7 ? 1.0 : -0.5) - (mobility > 7 && durability < 4 ? 1.5 : 0)
          globalWR = Math.max(42.0, Math.min(58.0, globalWR + arAdjust))
          globalPR = Math.max(2.0, Math.min(25.0, globalPR * (1 + (ccValue * 0.05))))
        }

        let ban_rate = 0.0
        if (isRankedFilter) {
          const baseBan = (globalWR - 46.5) * 3.5 + (globalPR - 10) * 0.3
          const isNewest = hero.id === newestHeroId
          const newHeroBonus = isNewest ? 22.5 : 0.0
          ban_rate = Math.max(0.5, Math.min(85.0, baseBan + newHeroBonus))
        }

        aggregatedStats[filter][heroSlug] = {
          win_rate: Math.round(globalWR * 100) / 100,
          pick_rate: Math.round(globalPR * 100) / 100,
          ban_rate: Math.round(ban_rate * 100) / 100,
          match_count: 0
        }
      }
    }

    return {
      props: {
        heroes: JSON.parse(JSON.stringify(heroes)),
        items: JSON.parse(JSON.stringify(items)),
        eternals: JSON.parse(JSON.stringify(eternals)),
        feedItems: [],
        metaSnapshots: [],
        metaNarratives: [],
        aggregatedStats,
        newestHero: newestHero ? JSON.parse(JSON.stringify(newestHero)) : null,
      },
    }
  } catch (error) {
    console.error('Error fetching static props:', error)
    return {
      props: {
        heroes: [],
        items: [],
        eternals: [],
        feedItems: [],
        metaSnapshots: [],
        metaNarratives: [],
        aggregatedStats: {},
        newestHero: null,
      },
    }
  }
}

export default function Dashboard({
  heroes = [],
  items = [],
  eternals = [],
  feedItems = [],
  metaSnapshots = [],
  metaNarratives = [],
  patches = [],
  aggregatedStats = {},
}: DashboardProps) {
  // ── Tab State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [homeSettings, setHomeSettings] = useState<any>(null)

  // ── Auth & Modals ──────────────────────────────────────────────────────────
  const { user, isPremium } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false)
  const [selectedPatchForModal, setSelectedPatchForModal] = useState<any | null>(null)

  // ── Lab State ──────────────────────────────────────────────────────────────
  const [selectedHero, setSelectedHero] = useState<HeroDoc | null>(null)
  const [levelA, setLevelA] = useState<number>(1)
  const [buildItems, setBuildItems] = useState<ItemDoc[]>([])
  const [buildCrest, setBuildCrest] = useState<ItemDoc | null>(null)
  const [buildEternal, setBuildEternal] = useState<EternalDoc | null>(null)

  const [selectedHeroB, setSelectedHeroB] = useState<HeroDoc | null>(null)
  const [levelB, setLevelB] = useState<number>(1)
  const [buildItemsB, setBuildItemsB] = useState<ItemDoc[]>([])

  const [shareSuccess, setShareSuccess] = useState(false)

  // ── Saved Collection State ─────────────────────────────────────────────────
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([])
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([])

  // ── Feed Dynamic State ─────────────────────────────────────────────────────
  const [aiPosts, setAiPosts] = useState<any[]>([])
  const [ugcVideos, setUgcVideos] = useState<any[]>([])
  const [officialNewsItems, setOfficialNewsItems] = useState<any[]>([])

  // ── Search Engine ──────────────────────────────────────────────────────────
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false)

  const searchRegistry = useSearchRegistry(heroes, items, eternals, [
    { version: 'Patch v1.16.2', released: '2026-07-02', content: 'Balance adjustments for new Items including Tainted Blade.' },
    { version: 'Patch v1.15.0', released: '2026-06-15', content: 'Ingested 12 confirmed game-wide Eternals minor blessing categories.' }
  ])

  const globalSearchResults = searchRegistry(globalSearchQuery, 'all').slice(0, 10)

  // ── Hover Tooltip ──────────────────────────────────────────────────────────
  const [hoveredItem, setHoveredItem] = useState<ItemDoc | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Client side initial data load (feed items & user cloud sync)
  useEffect(() => {
    async function loadFeedData() {
      try {
        const [ytRes, postsRes, officialRes, homeSettingsRes] = await Promise.all([
          fetch('/api/youtube/playlist'),
          fetch('/api/posts'),
          fetch('/api/feed?source=official&limit=20'),
          fetch('/api/home/settings')
        ])

        const ytData = await ytRes.json()
        if (ytData.videos) setUgcVideos(ytData.videos)

        const postsData = await postsRes.json()
        if (postsData.posts) setAiPosts(postsData.posts)

        const officialData = await officialRes.json()
        if (officialData.items) setOfficialNewsItems(officialData.items)

        const homeSettingsData = await homeSettingsRes.json()
        if (homeSettingsData.settings) setHomeSettings(homeSettingsData.settings)
      } catch (err) {
        console.error('Error loading feed data:', err)
      }
    }
    loadFeedData()
  }, [])

  // Sync user saved items on login
  useEffect(() => {
    const loadAndSyncUserItems = async () => {
      if (user) {
        const [cloudBuilds, cloudPosts] = await Promise.all([
          fetchCloudBuilds(user.uid),
          fetchCloudPosts(user.uid),
        ])
        setSavedBuilds(cloudBuilds)
        setSavedPosts(cloudPosts)
      } else {
        const localB = localStorage.getItem('predecessor_saved_builds')
        if (localB) { try { setSavedBuilds(JSON.parse(localB)) } catch (e) {} }
        const localP = localStorage.getItem('predecessor_saved_posts')
        if (localP) { try { setSavedPosts(JSON.parse(localP)) } catch (e) {} }
      }
    }
    loadAndSyncUserItems()
  }, [user, isPremium])

  // Computed build stats
  const analysisResult = selectedHero
    ? calculateBuildStats(selectedHero, levelA, buildItems, buildCrest, buildEternal, { allHeroes: heroes, minorBlessings: [] })
    : null

  const analysisResultB = selectedHeroB
    ? calculateBuildStats(selectedHeroB, levelB, buildItemsB, null, null, { allHeroes: heroes, minorBlessings: [] })
    : null

  const matchupResult = selectedHero && analysisResult && selectedHeroB && analysisResultB
    ? calculateMatchupScore(selectedHero, analysisResult, selectedHeroB, analysisResultB)
    : null

  const handleToggleSavePost = async (post: any) => {
    const isAlreadySaved = savedPosts.some((p) => p.id === post.id)
    const maxLimit = isPremium ? PREMIUM_POST_LIMIT : FREE_POST_LIMIT

    if (isAlreadySaved) {
      const updated = savedPosts.filter((p) => p.id !== post.id)
      setSavedPosts(updated)
      if (user) await deleteCloudPost(user.uid, post.id)
      localStorage.setItem('predecessor_saved_posts', JSON.stringify(updated))
    } else {
      if (savedPosts.length >= maxLimit) {
        if (!isPremium) setIsSubscriptionModalOpen(true)
        else alert(`Limit reached (${maxLimit} saved posts).`)
        return
      }

      const newSavedPost: SavedPost = {
        id: post.id,
        title: post.title,
        slug: post.slug || post.id,
        summary: post.summary,
        category: post.category || 'gameplay',
        tags: post.tags || [],
        author: post.author || 'Predecessor AI',
        createdAt: post.createdAt || new Date().toISOString(),
        savedAt: new Date().toISOString(),
      }

      const updated = [newSavedPost, ...savedPosts]
      setSavedPosts(updated)
      if (user) await saveCloudPost(user.uid, newSavedPost)
      localStorage.setItem('predecessor_saved_posts', JSON.stringify(updated))
    }
  }

  const handleShareBuild = () => {
    if (!analysisResult || !selectedHero) return
    const text = `🔥 PREDECESSOR BUILD: ${selectedHero.display_name} (Lvl ${levelA}) | Items: ${buildItems.map(i => i.display_name).join(', ')} | Build Lab: https://predecessorbuildlab.com`
    navigator.clipboard.writeText(text).then(() => {
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 2000)
    })
  }

  const handleSaveBuildTrigger = async () => {
    if (!selectedHero) return
    const name = prompt('Enter a name for your custom build:', `${selectedHero.display_name} Build`)
    if (!name) return

    const newBuild: SavedBuild = {
      id: Date.now().toString(),
      name,
      description: `Custom ${selectedHero.display_name} build`,
      heroSlug: selectedHero.slug,
      heroName: selectedHero.display_name,
      role: 'Offlane',
      level: levelA,
      items: buildItems.map((i) => i.slug),
      crest: buildCrest?.slug || null,
      eternal: buildEternal?.slug || null,
      updatedAt: new Date().toISOString(),
    }

    const updated = [newBuild, ...savedBuilds]
    setSavedBuilds(updated)
    localStorage.setItem('predecessor_saved_builds', JSON.stringify(updated))
    if (user) await saveCloudBuild(user.uid, newBuild)
    setActiveTab('saved')
  }

  return (
    <MainLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      globalSearchQuery={globalSearchQuery}
      setGlobalSearchQuery={setGlobalSearchQuery}
      globalSearchResults={globalSearchResults}
      showGlobalSearchResults={showGlobalSearchResults}
      setShowGlobalSearchResults={setShowGlobalSearchResults}
      onSelectSearchResult={(res) => {
        setShowGlobalSearchResults(false)
        setGlobalSearchQuery('')
        if (res.type === 'hero') setActiveTab('library')
        else if (res.type === 'item') setActiveTab('library')
        else if (res.type === 'crest') setActiveTab('library')
      }}
      selectedHero={selectedHero}
      selectedHeroB={selectedHeroB}
      onResetHeroA={() => { setSelectedHero(null); setBuildItems([]); }}
      onResetHeroB={() => { setSelectedHeroB(null); setBuildItemsB([]); }}
    >
      <Head>
        <title>Predecessor Build Lab — Simulated Theorycrafting & Meta Analysis</title>
        <meta name="description" content="Simulate hero statistics, experiment with custom item/crest combinations, analyze build DNA, strengths and weaknesses, and power spikes." />
      </Head>

      {/* ── TAB 0: HOME PAGE ── */}
      {activeTab === 'home' && (
        <HomeView
          posts={aiPosts}
          ugcVideos={ugcVideos}
          homeSettings={homeSettings}
          savedPosts={savedPosts}
          onToggleSavePost={handleToggleSavePost}
          setActiveTab={setActiveTab}
        />
      )}

      {/* ── TAB 1: THEORYCRAFTING LAB ── */}
      {activeTab === 'lab' && (
        <BuildLabView
          heroes={heroes}
          items={items}
          eternals={eternals}
          selectedHero={selectedHero}
          setSelectedHero={setSelectedHero}
          selectedHeroB={selectedHeroB}
          setSelectedHeroB={setSelectedHeroB}
          levelA={levelA}
          setLevelA={setLevelA}
          levelB={levelB}
          setLevelB={setLevelB}
          buildItems={buildItems}
          setBuildItems={setBuildItems}
          buildItemsB={buildItemsB}
          setBuildItemsB={setBuildItemsB}
          buildCrest={buildCrest}
          setBuildCrest={setBuildCrest}
          buildEternal={buildEternal}
          setBuildEternal={setBuildEternal}
          analysisResult={analysisResult}
          analysisResultB={analysisResultB}
          matchupResult={matchupResult}
          onSaveBuildTrigger={handleSaveBuildTrigger}
          onShareBuild={handleShareBuild}
          shareSuccess={shareSuccess}
          isPremium={isPremium}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        />
      )}

      {/* ── TAB 2: SAVED COLLECTION ── */}
      {activeTab === 'saved' && (
        <SavedCollectionView
          savedBuilds={savedBuilds}
          savedPosts={savedPosts}
          onLoadBuild={(b) => {
            const h = heroes.find(x => x.slug === b.heroSlug)
            if (h) setSelectedHero(h)
            setActiveTab('lab')
          }}
          onDeleteBuild={async (id) => {
            const updated = savedBuilds.filter(b => b.id !== id)
            setSavedBuilds(updated)
            localStorage.setItem('predecessor_saved_builds', JSON.stringify(updated))
            if (user) await deleteCloudBuild(user.uid, id)
          }}
          onToggleSavePost={handleToggleSavePost}
          isPremium={isPremium}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        />
      )}

      {/* ── TAB 3: META TRACKER ── */}
      {activeTab === 'meta' && (
        <MetaTrackerView
          heroes={heroes}
          items={items}
          metaSnapshots={metaSnapshots}
          metaNarratives={metaNarratives}
          aggregatedStats={aggregatedStats}
          onSelectHeroForLab={(h) => {
            setSelectedHero(h)
            setActiveTab('lab')
          }}
        />
      )}

      {/* ── TAB 4: FEED / GUIDES ── */}
      {(activeTab === 'feed' || activeTab === 'guides') && (
        <FeedView
          feedItems={feedItems}
          aiPosts={aiPosts}
          ugcVideos={ugcVideos}
          officialNewsItems={officialNewsItems}
          savedPosts={savedPosts}
          onToggleSavePost={handleToggleSavePost}
        />
      )}

      {/* ── TAB 5: LIBRARY / HEROES ── */}
      {(activeTab === 'library' || activeTab === 'heroes') && (
        <LibraryView
          heroes={heroes}
          items={items}
          eternals={eternals}
          patches={patches}
          onOpenPatchModal={(p) => setSelectedPatchForModal(p)}
          onSelectHeroForLab={(h) => {
            setSelectedHero(h)
            setActiveTab('lab')
          }}
        />
      )}

      {/* ── TAB 6: PROFILE ── */}
      {activeTab === 'profile' && (
        <ProfileDashboard onLoginClick={() => setIsAuthModalOpen(true)} />
      )}

      {/* Floating Hover Tooltip */}
      {hoveredItem && <ItemTooltip item={hoveredItem} mousePos={mousePos} />}

      {/* Patch Notes Modal */}
      {selectedPatchForModal && (
        <PatchNotesModal patch={selectedPatchForModal} onClose={() => setSelectedPatchForModal(null)} />
      )}

      {/* Auth & Subscription Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <SubscriptionModal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} />
    </MainLayout>
  )
}
