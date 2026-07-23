import React, { useState } from 'react'
import type { HeroDoc, ItemDoc, MetaGameMode, MetaRankTier } from '@/types'

interface MetaTrackerViewProps {
  heroes: HeroDoc[]
  items: ItemDoc[]
  metaSnapshots: any[]
  metaNarratives: any[]
  aggregatedStats: Record<string, Record<string, { win_rate: number; pick_rate: number; ban_rate: number; match_count: number }>>
  onSelectHeroForLab: (hero: HeroDoc) => void
}

export function MetaTrackerView({
  heroes,
  items,
  metaSnapshots,
  metaNarratives,
  aggregatedStats,
  onSelectHeroForLab,
}: MetaTrackerViewProps) {
  const [metaGameMode, setMetaGameMode] = useState<MetaGameMode>('ranked')
  const [metaRankTier, setMetaRankTier] = useState<MetaRankTier>('all')

  const filterKey = metaGameMode === 'aram' ? 'aram' : metaGameMode === 'unranked' ? 'unranked' : metaRankTier === 'all' ? 'ranked_all' : metaRankTier

  const currentStats = aggregatedStats[filterKey] || {}

  // Sort heroes by win rate for tiering
  const sortedHeroes = [...heroes].sort((a, b) => {
    const wrA = currentStats[a.slug]?.win_rate || 50.0
    const wrB = currentStats[b.slug]?.win_rate || 50.0
    return wrB - wrA
  })

  const sTier = sortedHeroes.slice(0, 4)
  const aTier = sortedHeroes.slice(4, 10)
  const bTier = sortedHeroes.slice(10)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'white', fontFamily: 'var(--font-hud)', textTransform: 'uppercase' }}>META TRACKER & POWER TIER LIST</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Data-driven win rates, pick rates, and tier rankings derived from telemetry stats.</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {/* Game Mode Selector */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '4px', border: '1px solid var(--border-medium)' }}>
            {(['ranked', 'unranked', 'aram'] as MetaGameMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setMetaGameMode(mode)}
                style={{
                  padding: '6px 14px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-hud)',
                  textTransform: 'uppercase',
                  background: metaGameMode === mode ? 'var(--accent-primary-container)' : 'transparent',
                  color: metaGameMode === mode ? 'white' : 'var(--text-muted)',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Tier Filter (Ranked only) */}
          {metaGameMode === 'ranked' && (
            <select
              value={metaRankTier}
              onChange={(e) => setMetaRankTier(e.target.value as MetaRankTier)}
              style={{
                padding: '6px 14px',
                background: 'var(--bg-input)',
                color: 'white',
                border: '1px solid var(--border-input)',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-hud)',
              }}
            >
              <option value="all">ALL RANK TIERS</option>
              <option value="bronze">BRONZE TIER</option>
              <option value="silver">SILVER TIER</option>
              <option value="gold">GOLD TIER</option>
              <option value="platinum">PLATINUM TIER</option>
              <option value="diamond">DIAMOND TIER</option>
              <option value="paragon">PARAGON TIER</option>
            </select>
          )}
        </div>
      </div>

      {/* Meta Tier Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* S TIER */}
        <div className="card-glass" style={{ borderTop: '2px solid var(--accent-secondary)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span className="badge badge-gold">S TIER</span>
            <span className="hud-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DOMINANT PICKS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sTier.map((hero) => {
              const stat = currentStats[hero.slug] || { win_rate: 50.0, pick_rate: 10.0, ban_rate: 0 }
              return (
                <div
                  key={hero.slug}
                  onClick={() => onSelectHeroForLab(hero)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-secondary)'
                    e.currentTarget.style.boxShadow = '0 0 12px var(--accent-gold-glow)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={hero.image_url} alt={hero.display_name} style={{ width: '40px', height: '40px', borderRadius: '0px', objectFit: 'cover' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', fontFamily: 'var(--font-hud)' }}>{hero.display_name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-tertiary)', fontFamily: 'var(--font-stat)' }}>{stat.win_rate}% WR</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-stat)' }}>{stat.pick_rate}% PR</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* A TIER */}
        <div className="card-glass" style={{ borderTop: '2px solid var(--accent-primary)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span className="badge badge-primary">A TIER</span>
            <span className="hud-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>STRONG CONTENDERS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {aTier.map((hero) => {
              const stat = currentStats[hero.slug] || { win_rate: 50.0, pick_rate: 10.0, ban_rate: 0 }
              return (
                <div
                  key={hero.slug}
                  onClick={() => onSelectHeroForLab(hero)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)'
                    e.currentTarget.style.boxShadow = '0 0 12px var(--accent-primary-glow)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={hero.image_url} alt={hero.display_name} style={{ width: '40px', height: '40px', borderRadius: '0px', objectFit: 'cover' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', fontFamily: 'var(--font-hud)' }}>{hero.display_name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-primary)', fontFamily: 'var(--font-stat)' }}>{stat.win_rate}% WR</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-stat)' }}>{stat.pick_rate}% PR</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* B TIER */}
        <div className="card-glass" style={{ borderTop: '2px solid var(--outline-variant)', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span className="badge" style={{ background: 'var(--bg-card-highest)', color: 'var(--text-subtle)' }}>B TIER</span>
            <span className="hud-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BALANCED OPTIONS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bTier.slice(0, 6).map((hero) => {
              const stat = currentStats[hero.slug] || { win_rate: 50.0, pick_rate: 10.0, ban_rate: 0 }
              return (
                <div
                  key={hero.slug}
                  onClick={() => onSelectHeroForLab(hero)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--text-subtle)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={hero.image_url} alt={hero.display_name} style={{ width: '40px', height: '40px', borderRadius: '0px', objectFit: 'cover' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', fontFamily: 'var(--font-hud)' }}>{hero.display_name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', fontFamily: 'var(--font-stat)' }}>{stat.win_rate}% WR</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-stat)' }}>{stat.pick_rate}% PR</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
