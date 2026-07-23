import React, { useState } from 'react'
import type { HeroDoc, ItemDoc, EternalDoc, LibrarySection } from '@/types'
import { sortItemStats, checkItemStats } from '@/lib/utils/stat-helpers'
import { parseDescription } from '@/lib/utils/description-parser'

interface LibraryViewProps {
  heroes: HeroDoc[]
  items: ItemDoc[]
  eternals: EternalDoc[]
  patches: any[]
  onOpenPatchModal: (patch: any) => void
  onSelectHeroForLab: (hero: HeroDoc) => void
}

export function LibraryView({
  heroes,
  items,
  eternals,
  patches,
  onOpenPatchModal,
  onSelectHeroForLab,
}: LibraryViewProps) {
  const [librarySection, setLibrarySection] = useState<LibrarySection>('heroes')
  const [selectedHero, setSelectedHero] = useState<HeroDoc | null>(null)
  const [selectedItem, setSelectedItem] = useState<ItemDoc | null>(null)
  const [selectedEternal, setSelectedEternal] = useState<EternalDoc | null>(null)
  const [heroLevel, setHeroLevel] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [itemTierFilter, setItemTierFilter] = useState<number>(3)
  const [itemClassFilter, setItemClassFilter] = useState<string>('All')
  const [activeStatFilters, setActiveStatFilters] = useState<string[]>([])

  const filteredHeroes = heroes.filter((h) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return h.display_name.toLowerCase().includes(q) || h.classes.some((c) => c.toLowerCase().includes(q))
  })

  const filteredItems = items.filter((item) => {
    if (librarySection === 'crests' && item.slot_type !== 'Crest') return false
    if (librarySection === 'items' && item.slot_type === 'Crest') return false

    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q || item.display_name.toLowerCase().includes(q)

    let matchesTier = true
    if (itemTierFilter === 3) matchesTier = item.is_final_item === true || item.tier === 3
    else if (itemTierFilter === 2) matchesTier = item.tier === 2
    else if (itemTierFilter === 1) matchesTier = item.tier === 1

    const matchesClass = itemClassFilter === 'All' || item.hero_class === itemClassFilter
    const matchesStats = checkItemStats(item, activeStatFilters)

    return matchesSearch && matchesTier && matchesClass && matchesStats
  })

  const filteredEternals = eternals.filter((e) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (e.display_name || e.name).toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q))
  })

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Sub-Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'white', fontFamily: 'var(--font-hud)', textTransform: 'uppercase' }}>GAME KNOWLEDGE LIBRARY</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Comprehensive game database for Predecessor heroes, items, crests, eternals, and patch archives.</p>
        </div>

        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-input)', padding: '4px', border: '1px solid var(--border-medium)', flexWrap: 'wrap' }}>
          {[
            { id: 'heroes', label: '🦸 HEROES' },
            { id: 'items', label: '⚔️ ITEMS' },
            { id: 'crests', label: '🛡️ CRESTS' },
            { id: 'eternals', label: '✨ ETERNALS' },
            { id: 'patches', label: '📰 PATCHES' },
          ].map((sec) => (
            <button
              key={sec.id}
              onClick={() => {
                setLibrarySection(sec.id as LibrarySection)
                setSelectedHero(null)
                setSelectedItem(null)
                setSelectedEternal(null)
              }}
              style={{
                padding: '6px 14px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.75rem',
                fontFamily: 'var(--font-hud)',
                textTransform: 'uppercase',
                background: librarySection === sec.id ? 'var(--accent-primary-container)' : 'transparent',
                color: librarySection === sec.id ? 'white' : 'var(--text-muted)',
              }}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder={`SEARCH ${librarySection.toUpperCase()}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '280px', padding: '8px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'white', fontSize: '0.8rem', fontFamily: 'var(--font-hud)' }}
        />

        {librarySection === 'items' && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {[3, 2, 1].map((tier) => (
              <button
                key={tier}
                onClick={() => setItemTierFilter(tier)}
                style={{
                  padding: '6px 14px',
                  background: itemTierFilter === tier ? 'var(--accent-primary-container)' : 'var(--bg-input)',
                  color: 'white',
                  border: '1px solid var(--border-medium)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontFamily: 'var(--font-hud)',
                }}
              >
                TIER {tier}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 1: HEROES */}
      {librarySection === 'heroes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filteredHeroes.map((hero) => (
            <div
              key={hero.slug}
              onClick={() => setSelectedHero(hero)}
              className="card-interactive"
              style={{
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                borderColor: selectedHero?.slug === hero.slug ? 'var(--accent-primary)' : 'var(--border-subtle)',
              }}
            >
              <img src={hero.image_url} alt={hero.display_name} style={{ width: '52px', height: '52px', objectFit: 'cover', border: '1px solid var(--border-medium)' }} />
              <div>
                <h4 style={{ margin: 0, color: 'white', fontSize: '1rem', fontFamily: 'var(--font-hud)', fontWeight: 700 }}>{hero.display_name}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-hud)' }}>{(hero.classes || []).join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 2: ITEMS & CRESTS */}
      {(librarySection === 'items' || librarySection === 'crests') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {filteredItems.map((item) => (
            <div
              key={item.slug}
              onClick={() => setSelectedItem(item)}
              className="card-interactive"
              style={{
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderColor: selectedItem?.slug === item.slug ? 'var(--accent-primary)' : 'var(--border-subtle)',
              }}
            >
              <img src={item.image_url} alt={item.display_name} style={{ width: '44px', height: '44px', border: '1px solid var(--border-medium)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'white', fontFamily: 'var(--font-hud)' }}>{item.display_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontFamily: 'var(--font-stat)' }}>{item.total_price}G</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 3: PATCHES */}
      {librarySection === 'patches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { version: 'Patch v1.16.2', released: '2026-07-02', content: 'Balance adjustments for new Items including Tainted Blade. Offlaners pick rate adjustment.', url: 'https://www.predecessorgame.com/news/patch-notes' },
            { version: 'Patch v1.15.0', released: '2026-06-15', content: 'Ingested 12 confirmed game-wide Eternals minor blessing categories.', url: 'https://www.predecessorgame.com/news/patch-notes' }
          ].map((p, i) => (
            <div key={i} className="card-glass" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontFamily: 'var(--font-hud)' }}>{p.version}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)' }}>RELEASED: {p.released}</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', margin: '8px 0 0 0' }}>{p.content}</p>
              </div>
              <button
                onClick={() => onOpenPatchModal(p)}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.75rem' }}
              >
                VIEW FULL PATCH NOTES 📖
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
