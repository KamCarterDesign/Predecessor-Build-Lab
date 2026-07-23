import React, { useState } from 'react'
import type { HeroDoc, ItemDoc, EternalDoc, BuildAnalysisResult } from '@/types'
import { sortItemStats } from '@/lib/utils/stat-helpers'

interface BuildLabViewProps {
  heroes: HeroDoc[]
  items: ItemDoc[]
  eternals: EternalDoc[]
  selectedHero: HeroDoc | null
  setSelectedHero: (hero: HeroDoc | null) => void
  selectedHeroB: HeroDoc | null
  setSelectedHeroB: (hero: HeroDoc | null) => void
  levelA: number
  setLevelA: (lvl: number) => void
  levelB: number
  setLevelB: (lvl: number) => void
  buildItems: ItemDoc[]
  setBuildItems: (items: ItemDoc[]) => void
  buildItemsB: ItemDoc[]
  setBuildItemsB: (items: ItemDoc[]) => void
  buildCrest: ItemDoc | null
  setBuildCrest: (crest: ItemDoc | null) => void
  buildEternal: EternalDoc | null
  setBuildEternal: (eternal: EternalDoc | null) => void
  analysisResult: BuildAnalysisResult | null
  analysisResultB: BuildAnalysisResult | null
  matchupResult: any
  onSaveBuildTrigger: () => void
  onShareBuild: () => void
  shareSuccess: boolean
  isPremium: boolean
  onOpenSubscriptionModal: () => void
}

export function BuildLabView({
  heroes,
  items,
  eternals,
  selectedHero,
  setSelectedHero,
  selectedHeroB,
  setSelectedHeroB,
  levelA,
  setLevelA,
  levelB,
  setLevelB,
  buildItems,
  setBuildItems,
  buildItemsB,
  setBuildItemsB,
  buildCrest,
  setBuildCrest,
  buildEternal,
  setBuildEternal,
  analysisResult,
  analysisResultB,
  matchupResult,
  onSaveBuildTrigger,
  onShareBuild,
  shareSuccess,
  isPremium,
  onOpenSubscriptionModal,
}: BuildLabViewProps) {
  // ── Modal State for Empty Hero Slot Selection ────────────────────────────────
  const [heroModalTarget, setHeroModalTarget] = useState<'A' | 'B' | null>(null)
  const [heroSearch, setHeroSearch] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('All')
  const [selectedRole, setSelectedRole] = useState<string>('All')

  // ── Item Browser Filters ─────────────────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState('')
  const [itemStatFilter, setItemStatFilter] = useState<string>('All')
  const [itemTierFilter, setItemTierFilter] = useState<string>('All')
  const [hoveredItem, setHoveredItem] = useState<ItemDoc | null>(null)
  const [targetSlotForAdd, setTargetSlotForAdd] = useState<'A' | 'B'>('A')

  // ── Collapsible Sections State ───────────────────────────────────────────────
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    bench: false,
    gauges: false,
    browser: false,
    matchup: false,
    dna: false,
    coach: false,
  })

  // ── Sticky Navigation Jump Bar State ─────────────────────────────────────────
  const [activeSection, setActiveSection] = useState('bench')

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(`lab-section-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Filtered heroes for selection modal
  const filteredHeroes = heroes.filter((hero) => {
    const matchesSearch = !heroSearch || hero.display_name.toLowerCase().includes(heroSearch.toLowerCase())
    const matchesClass = selectedClass === 'All' || (hero.classes || []).includes(selectedClass)
    const matchesRole = selectedRole === 'All' || (hero.roles || []).includes(selectedRole)
    return matchesSearch && matchesClass && matchesRole
  })

  // Filter items by stat & tier
  const filteredItems = items.filter((item) => {
    const matchesSearch = !itemSearch || item.display_name.toLowerCase().includes(itemSearch.toLowerCase())
    
    // Tier filter
    let matchesTier = true
    if (itemTierFilter === 'T3') matchesTier = item.is_final_item && item.slot_type !== 'Crest'
    else if (itemTierFilter === 'Crest') matchesTier = item.slot_type === 'Crest'
    else if (itemTierFilter === 'Components') matchesTier = !item.is_final_item && item.slot_type !== 'Crest'

    // Stat filter
    let matchesStat = true
    if (itemStatFilter !== 'All') {
      const statsObj = item.stats || {}
      if (itemStatFilter === 'Physical Power') matchesStat = Boolean(statsObj.physical_power)
      else if (itemStatFilter === 'Magical Power') matchesStat = Boolean(statsObj.magical_power)
      else if (itemStatFilter === 'Health') matchesStat = Boolean(statsObj.max_health || statsObj.health)
      else if (itemStatFilter === 'Armor') matchesStat = Boolean(statsObj.physical_armor || statsObj.magical_armor)
      else if (itemStatFilter === 'Attack Speed') matchesStat = Boolean(statsObj.attack_speed)
      else if (itemStatFilter === 'Ability Haste') matchesStat = Boolean(statsObj.ability_haste)
      else if (itemStatFilter === 'Crit') matchesStat = Boolean(statsObj.crit_chance)
      else if (itemStatFilter === 'Lifesteal') matchesStat = Boolean(statsObj.lifesteal || statsObj.omnivamp)
    }

    return matchesSearch && matchesTier && matchesStat
  })

  const handleSelectHeroForSlot = (hero: HeroDoc) => {
    if (heroModalTarget === 'A') {
      setSelectedHero(hero)
      setLevelA(1)
      setBuildItems([])
    } else if (heroModalTarget === 'B') {
      setSelectedHeroB(hero)
      setLevelB(1)
      setBuildItemsB([])
    }
    setHeroModalTarget(null)
  }

  const addBuildItemToSlot = (item: ItemDoc, slot: 'A' | 'B') => {
    if (slot === 'A') {
      if (buildItems.length >= 6) return
      setBuildItems([...buildItems, item])
    } else {
      if (buildItemsB.length >= 6) return
      setBuildItemsB([...buildItemsB, item])
    }
  }

  const removeBuildItemFromSlot = (index: number, slot: 'A' | 'B') => {
    if (slot === 'A') {
      const next = [...buildItems]
      next.splice(index, 1)
      setBuildItems(next)
    } else {
      const next = [...buildItemsB]
      next.splice(index, 1)
      setBuildItemsB(next)
    }
  }

  // Helper calculations for dynamic comparison gauges using engine totalStats
  const hpA = analysisResult?.totalStats['max_health'] || 2000
  const hpB = analysisResultB?.totalStats['max_health'] || 2000
  const ehpPhysA = analysisResult?.effectiveHpPhys || 2500
  const ehpPhysB = analysisResultB?.effectiveHpPhys || 2500
  const dpsA = analysisResult ? Math.round((analysisResult.basicAttackPower || 100) * analysisResult.attacksPerSecond * (1 + ((analysisResult.totalStats['crit_chance'] || 0) / 100))) : 450
  const dpsB = analysisResultB ? Math.round((analysisResultB.basicAttackPower || 100) * analysisResultB.attacksPerSecond * (1 + ((analysisResultB.totalStats['crit_chance'] || 0) / 100))) : 400

  // 1. EHP Difference %
  const ehpDiffPct = Math.round(((ehpPhysA - ehpPhysB) / Math.max(1, ehpPhysB)) * 100)
  
  // 2. DPS Output Advantage %
  const dpsAdvantagePct = Math.round(((dpsA - dpsB) / Math.max(1, dpsB)) * 100)

  // 3. Armor Pen Shred % against Target Hero B
  const armorB = analysisResultB?.totalStats['physical_armor'] || 80
  const penPctA = analysisResult?.totalStats['percent_physical_pen'] || 0
  const flatPenA = analysisResult?.totalStats['physical_pen'] || 0
  // Formula: Effective Armor = (Target Armor * (1 - % Pen)) - Flat Pen
  const effArmorB = Math.max(0, (armorB * (1 - penPctA / 100)) - flatPenA)
  const armorShredPct = Math.round(((armorB - effArmorB) / Math.max(1, armorB)) * 100)

  // 4. Tenacity & CC Resistance (Capped at 60%)
  const tenacityA = Math.min(60, Math.round(analysisResult?.totalStats['tenacity'] || 0))
  const tenacityB = Math.min(60, Math.round(analysisResultB?.totalStats['tenacity'] || 0))

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
      
      {/* ── STICKY SECTION JUMP-BAR ───────────────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        top: '80px',
        zIndex: 90,
        background: 'rgba(11, 19, 38, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'bench', label: '🧪 HERO BENCH' },
            { id: 'gauges', label: '📊 ENGINE GAUGES' },
            { id: 'browser', label: '🎒 ITEM BROWSER' },
            { id: 'matchup', label: '⚔️ MATCHUP ANALYSIS' },
            { id: 'dna', label: '🧬 DNA COMPARISON' },
            { id: 'coach', label: '🤖 AI STRATEGIC COACH' },
          ].map((sec) => (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              style={{
                padding: '6px 14px',
                background: activeSection === sec.id ? 'var(--accent-primary-container)' : 'transparent',
                color: activeSection === sec.id ? '#9d7cff' : 'rgba(255, 255, 255, 0.7)',
                border: activeSection === sec.id ? '1px solid #9d7cff' : '1px solid transparent',
                borderRadius: '4px',
                fontFamily: 'var(--font-hud)',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {sec.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={onSaveBuildTrigger}
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.75rem', fontFamily: 'var(--font-hud)', whiteSpace: 'nowrap' }}
          >
            💾 SAVE BUILD
          </button>
          <button
            onClick={onShareBuild}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.75rem', fontFamily: 'var(--font-hud)', whiteSpace: 'nowrap' }}
          >
            {shareSuccess ? '✅ COPIED!' : '📋 SHARE'}
          </button>
        </div>
      </div>

      {/* ── SECTION 1: 3-COLUMN DUAL HERO BENCH & STAT CALCULATOR ──────────────── */}
      <section id="lab-section-bench" className="card-glass" style={{ borderRadius: '8px', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 className="hud-label" style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '0.04em' }}>
              THE LAB <span style={{ fontSize: '0.75rem', background: '#9d7cff', color: 'white', padding: '2px 8px', borderRadius: '4px', verticalAlign: 'middle', marginLeft: '8px' }}>BETA v1.0</span>
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', margin: '4px 0 0 0', fontFamily: 'var(--font-body)' }}>
              Advanced dual-hero simulation engine. Compare equipment synergies, calculate effective health, and optimize your Hero's lethal potential.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { setSelectedHero(null); setSelectedHeroB(null); setBuildItems([]); setBuildItemsB([]) }}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              🔄 RESET ALL
            </button>
          </div>
        </div>

        {/* 3 Columns Layout: Hero A (Left) | Delta Column (Center) | Hero B (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* ── COLUMN 1: HERO A (USER'S HERO) ── */}
          <div style={{ background: 'rgba(16, 24, 48, 0.7)', border: '1px solid rgba(157, 124, 255, 0.3)', borderRadius: '8px', padding: '20px' }}>
            {selectedHero ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img src={selectedHero.image_url} alt={selectedHero.display_name} style={{ width: '56px', height: '56px', borderRadius: '6px', objectFit: 'cover', border: '2px solid #9d7cff' }} />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white', fontFamily: 'var(--font-hud)', fontWeight: 800 }}>{selectedHero.display_name}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#9d7cff', fontFamily: 'var(--font-hud)' }}>USER HERO (BUILD A)</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>LVL</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-stat)' }}>{levelA}</div>
                  </div>
                </div>

                {/* Level Slider A */}
                <input
                  type="range"
                  min="1"
                  max="18"
                  value={levelA}
                  onChange={(e) => setLevelA(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#9d7cff' }}
                />

                {/* 6 Equipped Item Slots A */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>EQUIPPED ITEMS ({buildItems.length}/6)</span>
                    <button
                      onClick={() => setTargetSlotForAdd('A')}
                      style={{ background: 'none', border: 'none', color: targetSlotForAdd === 'A' ? '#9d7cff' : 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-hud)' }}
                    >
                      {targetSlotForAdd === 'A' ? '🎯 Active Picker Target' : 'Set as Picker Target'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                      const item = buildItems[idx]
                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => item && setHoveredItem(item)}
                          onMouseLeave={() => setHoveredItem(null)}
                          onClick={() => item && removeBuildItemFromSlot(idx, 'A')}
                          style={{
                            aspectRatio: '1',
                            background: 'rgba(0,0,0,0.4)',
                            border: item ? '1px solid #9d7cff' : '1px dashed rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            cursor: item ? 'pointer' : 'default',
                          }}
                        >
                          {item ? (
                            <img src={item.image_url} alt={item.display_name} style={{ width: '90%', height: '90%', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-hud)' }}>+</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Embedded Stat Calculator List A */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>Physical Power</span>
                    <span style={{ color: 'white', fontWeight: 800, fontFamily: 'var(--font-stat)' }}>{Math.round(analysisResult?.totalStats['physical_power'] || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>Attack Speed</span>
                    <span style={{ color: 'white', fontWeight: 800, fontFamily: 'var(--font-stat)' }}>{(analysisResult?.attacksPerSecond || 1.0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>Crit Chance</span>
                    <span style={{ color: 'white', fontWeight: 800, fontFamily: 'var(--font-stat)' }}>{Math.round(analysisResult?.totalStats['crit_chance'] || 0)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>Phys Penetration</span>
                    <span style={{ color: 'white', fontWeight: 800, fontFamily: 'var(--font-stat)' }}>{Math.round(analysisResult?.totalStats['percent_physical_pen'] || 0)}% (+{Math.round(analysisResult?.totalStats['physical_pen'] || 0)})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>Health</span>
                    <span style={{ color: '#4ade80', fontWeight: 800, fontFamily: 'var(--font-stat)' }}>{Math.round(analysisResult?.totalStats['max_health'] || 2000)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setHeroModalTarget('A')}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '6px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-hud)' }}
                >
                  🔄 Change Hero A
                </button>
              </div>
            ) : (
              /* Empty Hero Slot A Prompt */
              <div
                onClick={() => setHeroModalTarget('A')}
                style={{
                  minHeight: '260px',
                  border: '2px dashed #9d7cff',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'rgba(157, 124, 255, 0.05)',
                  gap: '12px',
                  padding: '24px',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontSize: '2rem', color: '#9d7cff' }}>👤+</span>
                <span style={{ fontFamily: 'var(--font-hud)', fontWeight: 800, color: 'white', fontSize: '1rem' }}>SELECT YOUR HERO (HERO A)</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-hud)' }}>Click to open hero selection window with class & role filters</span>
              </div>
            )}
          </div>

          {/* ── COLUMN 2: CENTER DELTA DIFFERENCE COLUMN (Δ) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '16px 0', minHeight: '300px' }}>
            <span style={{ fontSize: '0.75rem', color: '#ffd700', fontFamily: 'var(--font-hud)', fontWeight: 800, letterSpacing: '0.08em' }}>
              DELTA COMPARISON (Δ)
            </span>

            {/* Stat Deltas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
              {/* Armor Difference */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontFamily: 'var(--font-hud)' }}>ARMOR DIFF</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: (analysisResult?.totalStats['physical_armor'] || 0) >= (analysisResultB?.totalStats['physical_armor'] || 0) ? '#4ade80' : '#f87171', fontFamily: 'var(--font-stat)' }}>
                  {(analysisResult?.totalStats['physical_armor'] || 0) >= (analysisResultB?.totalStats['physical_armor'] || 0) ? '+' : ''}
                  {Math.round((analysisResult?.totalStats['physical_armor'] || 0) - (analysisResultB?.totalStats['physical_armor'] || 0))}
                </span>
              </div>

              {/* Health Difference */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontFamily: 'var(--font-hud)' }}>HEALTH DIFF</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: hpA >= hpB ? '#4ade80' : '#f87171', fontFamily: 'var(--font-stat)' }}>
                  {hpA >= hpB ? '+' : ''}{Math.round(hpA - hpB)}
                </span>
              </div>

              {/* DPS Output Difference */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontFamily: 'var(--font-hud)' }}>EST. DPS DIFF</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: dpsA >= dpsB ? '#4ade80' : '#f87171', fontFamily: 'var(--font-stat)' }}>
                  {dpsA >= dpsB ? '+' : ''}{Math.round(dpsA - dpsB)}
                </span>
              </div>
            </div>
          </div>

          {/* ── COLUMN 3: HERO B (ENEMY LANER) ── */}
          <div style={{ background: 'rgba(16, 24, 48, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '20px' }}>
            {selectedHeroB ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img src={selectedHeroB.image_url} alt={selectedHeroB.display_name} style={{ width: '56px', height: '56px', borderRadius: '6px', objectFit: 'cover', border: '2px solid #ff4d4d' }} />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white', fontFamily: 'var(--font-hud)', fontWeight: 800 }}>{selectedHeroB.display_name}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#ff4d4d', fontFamily: 'var(--font-hud)' }}>ENEMY LANER (BUILD B)</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>LVL</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-stat)' }}>{levelB}</div>
                  </div>
                </div>

                {/* Level Slider B */}
                <input
                  type="range"
                  min="1"
                  max="18"
                  value={levelB}
                  onChange={(e) => setLevelB(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#ff4d4d' }}
                />

                {/* 6 Equipped Item Slots B */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>EQUIPPED ITEMS ({buildItemsB.length}/6)</span>
                    <button
                      onClick={() => setTargetSlotForAdd('B')}
                      style={{ background: 'none', border: 'none', color: targetSlotForAdd === 'B' ? '#ff4d4d' : 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-hud)' }}
                    >
                      {targetSlotForAdd === 'B' ? '🎯 Active Picker Target' : 'Set as Picker Target'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                      const item = buildItemsB[idx]
                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => item && setHoveredItem(item)}
                          onMouseLeave={() => setHoveredItem(null)}
                          onClick={() => item && removeBuildItemFromSlot(idx, 'B')}
                          style={{
                            aspectRatio: '1',
                            background: 'rgba(0,0,0,0.4)',
                            border: item ? '1px solid #ff4d4d' : '1px dashed rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            cursor: item ? 'pointer' : 'default',
                          }}
                        >
                          {item ? (
                            <img src={item.image_url} alt={item.display_name} style={{ width: '90%', height: '90%', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-hud)' }}>+</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Embedded Stat Calculator List B */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>Physical Power</span>
                    <span style={{ color: 'white', fontWeight: 800, fontFamily: 'var(--font-stat)' }}>{Math.round(analysisResultB?.totalStats['physical_power'] || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>Attack Speed</span>
                    <span style={{ color: 'white', fontWeight: 800, fontFamily: 'var(--font-stat)' }}>{(analysisResultB?.attacksPerSecond || 1.0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>Crit Chance</span>
                    <span style={{ color: 'white', fontWeight: 800, fontFamily: 'var(--font-stat)' }}>{Math.round(analysisResultB?.totalStats['crit_chance'] || 0)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>Phys Penetration</span>
                    <span style={{ color: 'white', fontWeight: 800, fontFamily: 'var(--font-stat)' }}>{Math.round(analysisResultB?.totalStats['percent_physical_pen'] || 0)}% (+{Math.round(analysisResultB?.totalStats['physical_pen'] || 0)})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>Health</span>
                    <span style={{ color: '#4ade80', fontWeight: 800, fontFamily: 'var(--font-stat)' }}>{Math.round(analysisResultB?.totalStats['max_health'] || 2000)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setHeroModalTarget('B')}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '6px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-hud)' }}
                >
                  🔄 Change Enemy Hero B
                </button>
              </div>
            ) : (
              /* Empty Hero Slot B Prompt */
              <div
                onClick={() => setHeroModalTarget('B')}
                style={{
                  minHeight: '260px',
                  border: '2px dashed #ff4d4d',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 77, 77, 0.05)',
                  gap: '12px',
                  padding: '24px',
                  textAlign: 'center'
                }}
              >
                <span style={{ fontSize: '2rem', color: '#ff4d4d' }}>🥊+</span>
                <span style={{ fontFamily: 'var(--font-hud)', fontWeight: 800, color: 'white', fontSize: '1rem' }}>SELECT ENEMY LANER (HERO B)</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-hud)' }}>Click to select enemy hero for relative matchup & EHP comparisons</span>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── SECTION 2: 4 CIRCULAR ENGINE-DRIVEN RING GAUGES ROW ──────────────── */}
      <section id="lab-section-gauges" className="card-glass" style={{ borderRadius: '8px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 className="hud-label" style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 800 }}>
            SIMULATION ENGINE RELATIVE METRICS (HERO A VS HERO B)
          </h3>
          <button onClick={() => toggleSection('gauges')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            {collapsedSections.gauges ? '▼ Expand' : '▲ Collapse'}
          </button>
        </div>

        {!collapsedSections.gauges && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            
            {/* Circle Gauge 1: EHP Ratio */}
            <div style={{ background: 'rgba(16, 24, 48, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 800, fontFamily: 'var(--font-hud)', marginBottom: '12px' }}>EFFECTIVE HEALTH RATIO</span>
              <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="110" height="110" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#9d7cff" strokeWidth="3" strokeDasharray={`${Math.max(10, Math.min(100, 50 + ehpDiffPct))}, 100`} />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-stat)' }}>
                    {ehpDiffPct >= 0 ? `+${ehpDiffPct}%` : `${ehpDiffPct}%`}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontFamily: 'var(--font-hud)' }}>EHP RELATIVE</span>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: '12px 0 0 0', fontFamily: 'var(--font-body)' }}>
                Hero A has {ehpDiffPct >= 0 ? `${ehpDiffPct}% higher` : `${Math.abs(ehpDiffPct)}% lower`} Effective HP than Enemy Laner.
              </p>
            </div>

            {/* Circle Gauge 2: DPS Output Advantage */}
            <div style={{ background: 'rgba(16, 24, 48, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 800, fontFamily: 'var(--font-hud)', marginBottom: '12px' }}>DPS OUTPUT ADVANTAGE</span>
              <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="110" height="110" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ffd700" strokeWidth="3" strokeDasharray={`${Math.max(10, Math.min(100, 50 + dpsAdvantagePct))}, 100`} />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-stat)' }}>
                    {dpsAdvantagePct >= 0 ? `+${dpsAdvantagePct}%` : `${dpsAdvantagePct}%`}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontFamily: 'var(--font-hud)' }}>DPS OUTPUT</span>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: '12px 0 0 0', fontFamily: 'var(--font-body)' }}>
                Sustained basic attack output comparison including attack speed & crit chance.
              </p>
            </div>

            {/* Circle Gauge 3: Armor Pen Shredding */}
            <div style={{ background: 'rgba(16, 24, 48, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 800, fontFamily: 'var(--font-hud)', marginBottom: '12px' }}>TARGET ARMOR SHREDDED</span>
              <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="110" height="110" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray={`${armorShredPct}, 100`} />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-stat)' }}>{armorShredPct}%</span>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontFamily: 'var(--font-hud)' }}>SHREDDED</span>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: '12px 0 0 0', fontFamily: 'var(--font-body)' }}>
                Evaluates Pen order against Hero B ({Math.round(effArmorB)} Armor remaining).
              </p>
            </div>

            {/* Circle Gauge 4: Tenacity & CC Resistance */}
            <div style={{ background: 'rgba(16, 24, 48, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 800, fontFamily: 'var(--font-hud)', marginBottom: '12px' }}>TENACITY (CC REDUCTION)</span>
              <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="110" height="110" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4ade80" strokeWidth="3" strokeDasharray={`${(tenacityA / 60) * 100}, 100`} />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-stat)' }}>{tenacityA}%</span>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontFamily: 'var(--font-hud)' }}>MAX 60% CAP</span>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: '12px 0 0 0', fontFamily: 'var(--font-body)' }}>
                Reduces Stuns, Slows & Roots. {tenacityA >= 60 ? '⚠️ Hard Cap Reached' : `Target B has ${tenacityB}% Tenacity.`}
              </p>
            </div>

          </div>
        )}
      </section>

      {/* ── SECTION 3: ITEM & BLESSING BROWSER ────────────────────────────────── */}
      <section id="lab-section-browser" className="card-glass" style={{ borderRadius: '8px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3 className="hud-label" style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 800 }}>
              ITEM & BLESSING BROWSER
            </h3>
            <span style={{ fontSize: '0.75rem', color: targetSlotForAdd === 'A' ? '#9d7cff' : '#ff4d4d', fontFamily: 'var(--font-hud)' }}>
              (Equipping to: {targetSlotForAdd === 'A' ? 'Hero A' : 'Hero B'})
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setTargetSlotForAdd('A')}
              style={{ padding: '4px 10px', background: targetSlotForAdd === 'A' ? '#9d7cff' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-hud)', cursor: 'pointer' }}
            >
              Target Hero A
            </button>
            <button
              onClick={() => setTargetSlotForAdd('B')}
              style={{ padding: '4px 10px', background: targetSlotForAdd === 'B' ? '#ff4d4d' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-hud)', cursor: 'pointer' }}
            >
              Target Hero B
            </button>
            <button onClick={() => toggleSection('browser')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
              {collapsedSections.browser ? '▼ Expand' : '▲ Collapse'}
            </button>
          </div>
        </div>

        {!collapsedSections.browser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Search and Tier Filter Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="🔍 Search items by name..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                style={{ flex: 1, minWidth: '220px', padding: '10px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontFamily: 'var(--font-hud)', fontSize: '0.85rem' }}
              />

              {/* Tier Filter Pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['All', 'T3', 'Crest', 'Components'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setItemTierFilter(t)}
                    style={{
                      padding: '8px 14px',
                      background: itemTierFilter === t ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-hud)',
                      cursor: 'pointer'
                    }}
                  >
                    {t === 'T3' ? 'T3 Final Items' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Stat Filter Buttons Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['All', 'Physical Power', 'Magical Power', 'Health', 'Armor', 'Attack Speed', 'Ability Haste', 'Crit', 'Lifesteal'].map((st) => (
                <button
                  key={st}
                  onClick={() => setItemStatFilter(st)}
                  style={{
                    padding: '6px 12px',
                    background: itemStatFilter === st ? 'rgba(157, 124, 255, 0.25)' : 'rgba(255,255,255,0.03)',
                    border: itemStatFilter === st ? '1px solid #9d7cff' : '1px solid rgba(255,255,255,0.08)',
                    color: itemStatFilter === st ? '#9d7cff' : 'rgba(255,255,255,0.7)',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-hud)',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Item Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredItems.map((item) => (
                <div
                  key={item.slug}
                  onClick={() => addBuildItemToSlot(item, targetSlotForAdd)}
                  style={{
                    background: 'rgba(16, 24, 48, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    setHoveredItem(item)
                    e.currentTarget.style.borderColor = targetSlotForAdd === 'A' ? '#9d7cff' : '#ff4d4d'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    setHoveredItem(null)
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <img src={item.image_url} alt={item.display_name} style={{ width: '42px', height: '42px', borderRadius: '4px', objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'white', fontFamily: 'var(--font-hud)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.display_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#ffd700', fontFamily: 'var(--font-stat)', marginTop: '2px' }}>
                      {item.total_price}G
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hover Tooltip Preview Tab */}
            {hoveredItem && (
              <div style={{ background: 'rgba(11, 19, 38, 0.95)', border: '1px solid #9d7cff', borderRadius: '8px', padding: '16px', display: 'flex', gap: '16px', backdropFilter: 'blur(10px)' }}>
                <img src={hoveredItem.image_url} alt={hoveredItem.display_name} style={{ width: '56px', height: '56px', borderRadius: '6px' }} />
                <div>
                  <div style={{ fontWeight: 900, color: 'white', fontSize: '1rem', fontFamily: 'var(--font-hud)' }}>{hoveredItem.display_name} ({hoveredItem.total_price}G)</div>
                  <div style={{ fontSize: '0.75rem', color: '#9d7cff', fontFamily: 'var(--font-hud)', marginTop: '4px' }}>
                    {Object.entries(hoveredItem.stats || {}).map(([k, v]) => `${k.replace('_', ' ')}: +${v}`).join(' • ')}
                  </div>
                  {hoveredItem.effects && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: '6px', fontFamily: 'var(--font-body)' }}>
                      {hoveredItem.effects[0]?.menu_description || 'Grants unique combat passive enhancements.'}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </section>

      {/* ── SECTION 4: MATCHUP ANALYSIS ───────────────────────────────────────── */}
      <section id="lab-section-matchup" className="card-glass" style={{ borderRadius: '8px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 className="hud-label" style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 800 }}>
            MATCHUP ANALYSIS (AXIS BREAKDOWN)
          </h3>
          <button onClick={() => toggleSection('matchup')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            {collapsedSections.matchup ? '▼ Expand' : '▲ Collapse'}
          </button>
        </div>

        {!collapsedSections.matchup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Axis 1: Offensive */}
            <div style={{ background: 'rgba(16, 24, 48, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 800, color: '#9d7cff', fontFamily: 'var(--font-hud)', fontSize: '0.85rem' }}>⚡ OFFENSIVE AXIS</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>
                  {selectedHero?.display_name || 'Hero A'} vs {selectedHeroB?.display_name || 'Hero B'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: 0, fontFamily: 'var(--font-body)', lineHeight: '1.5' }}>
                Hero A relies on sustained physical damage and crit scaling. High attack speed enables rapid armor shredding, but requires closing the distance past enemy crowd control spells.
              </p>
            </div>

            {/* Axis 2: Defensive */}
            <div style={{ background: 'rgba(16, 24, 48, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-hud)', fontSize: '0.85rem' }}>🛡️ DEFENSIVE AXIS</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>
                  {selectedHero?.display_name || 'Hero A'} vs {selectedHeroB?.display_name || 'Hero B'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: 0, fontFamily: 'var(--font-body)', lineHeight: '1.5' }}>
                Hero A possesses baseline Effective HP of {Math.round(ehpPhysA)} vs Hero B's {Math.round(ehpPhysB)}, offering relative resilience in physical trades.
              </p>
            </div>

            {/* Axis 3: Utility */}
            <div style={{ background: 'rgba(16, 24, 48, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-hud)', fontSize: '0.85rem' }}>🌀 UTILITY & MOBILITY AXIS</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-hud)' }}>
                  {selectedHero?.display_name || 'Hero A'} vs {selectedHeroB?.display_name || 'Hero B'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: 0, fontFamily: 'var(--font-body)', lineHeight: '1.5' }}>
                Hero A holds {tenacityA}% Tenacity CC reduction (max 60% hard cap), reducing crowd control durations during engagements.
              </p>
            </div>

          </div>
        )}
      </section>

      {/* ── SECTION 5: DNA PROFILE COMPARISON & STRENGTHS/WEAKNESSES ──────────── */}
      <section id="lab-section-dna" className="card-glass" style={{ borderRadius: '8px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 className="hud-label" style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 800 }}>
            DNA PROFILE COMPARISON & STRENGTHS / WEAKNESSES
          </h3>
          <button onClick={() => toggleSection('dna')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            {collapsedSections.dna ? '▼ Expand' : '▲ Collapse'}
          </button>
        </div>

        {!collapsedSections.dna && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* DNA Metrics Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['BURST', 'SUSTAIN', 'TOUGHNESS', 'SPELL DAMAGE', 'MOBILITY', 'UTILITY', 'DISRUPTIVE ABILITY'].map((metric, idx) => {
                const valA = [8.5, 9.0, 7.5, 4.0, 6.5, 5.0, 7.0][idx] || 6
                const valB = [9.0, 5.5, 5.0, 8.5, 4.0, 7.5, 6.0][idx] || 5
                return (
                  <div key={metric}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-hud)', marginBottom: '4px' }}>
                      <span style={{ color: 'white', fontWeight: 700 }}>{metric}</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}><span style={{ color: '#9d7cff' }}>{valA}</span> vs <span style={{ color: '#ff4d4d' }}>{valB}</span></span>
                    </div>
                    <div style={{ position: 'relative', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${valA * 10}%`, background: '#9d7cff' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Strengths & Weaknesses List */}
            <div style={{ background: 'rgba(16, 24, 48, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'white', fontFamily: 'var(--font-hud)' }}>HERO SYNERGY SUMMARY</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)', lineHeight: '1.6' }}>
                  <li><strong style={{ color: '#4ade80' }}>Physical Armor Penetration:</strong> Effective Pen order maximizes damage against mid-game armor builds.</li>
                  <li><strong style={{ color: '#4ade80' }}>Sustain Scaling:</strong> High health regeneration keeps Hero A in teamfights longer.</li>
                  <li><strong style={{ color: '#f87171' }}>Magical Vulnerability:</strong> Lower magical EHP requires careful positioning against enemy mage burst.</li>
                </ul>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.85rem', color: 'white', fontFamily: 'var(--font-hud)', fontWeight: 800 }}>BUILD COMPATIBILITY</span>
                <span style={{ fontSize: '1.4rem', color: '#9d7cff', fontFamily: 'var(--font-stat)', fontWeight: 900 }}>85%</span>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ── SECTION 6: AI BUILD ANALYSIS & STRATEGIC COACH ──────────────────── */}
      <section id="lab-section-coach" className="card-glass" style={{ borderRadius: '8px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem', color: '#9d7cff' }}>🤖</span>
            <h3 className="hud-label" style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 800 }}>
              AI BUILD ANALYSIS & STRATEGIC COACH
            </h3>
            {isPremium && <span style={{ fontSize: '0.65rem', background: '#ffd700', color: 'black', fontWeight: 900, padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-hud)' }}>PREMIUM FEATURE</span>}
          </div>

          <button onClick={() => toggleSection('coach')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            {collapsedSections.coach ? '▼ Expand' : '▲ Collapse'}
          </button>
        </div>

        {!collapsedSections.coach && (
          <div style={{ background: 'rgba(16, 24, 48, 0.6)', border: '1px solid rgba(157, 124, 255, 0.3)', borderRadius: '8px', padding: '20px' }}>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 16px 0', fontFamily: 'var(--font-body)', lineHeight: '1.6' }}>
              Our simulated engine detects an optimal power spike at <strong>Level 11</strong> upon completing completed T3 items. Physical penetration scaling permits aggressive trades against enemy tanks.
            </p>

            {!isPremium && (
              <button
                onClick={onOpenSubscriptionModal}
                style={{ background: 'linear-gradient(90deg, #9d7cff, #b59bff)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '6px', fontWeight: 900, fontFamily: 'var(--font-hud)', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                UNLOCK FULL AI COACHING & MATCHUP INSIGHTS
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── HERO SELECTION MODAL (When clicking empty slot) ──────────────────── */}
      {heroModalTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: 'rgba(16, 24, 48, 0.98)',
            border: '1px solid #9d7cff',
            borderRadius: '12px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            gap: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white', fontFamily: 'var(--font-hud)', fontWeight: 800 }}>
                SELECT HERO FOR {heroModalTarget === 'A' ? 'BUILD A (YOUR HERO)' : 'BUILD B (ENEMY LANER)'}
              </h3>
              <button onClick={() => setHeroModalTarget(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Search hero..."
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontFamily: 'var(--font-hud)' }}
              />

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontFamily: 'var(--font-hud)' }}
              >
                {['All', 'Fighter', 'Tank', 'Mage', 'Assassin', 'Support', 'Sharpshooter'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontFamily: 'var(--font-hud)' }}
              >
                {['All', 'Offlane', 'Jungle', 'Midlane', 'Carry', 'Support'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
              {filteredHeroes.map((hero) => (
                <div
                  key={hero.slug}
                  onClick={() => handleSelectHeroForSlot(hero)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '12px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9d7cff'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                >
                  <img src={hero.image_url} alt={hero.display_name} style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', marginBottom: '8px' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: 'var(--font-hud)' }}>{hero.display_name}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
