/**
 * Hero Sync Script
 *
 * Fetches all heroes from Omeda.city API → transforms → uploads to Firestore.
 * Downloads all hero/ability image assets to Firebase Storage.
 *
 * Run: npm run sync:heroes
 */
import fetch from 'node-fetch'
import { getFirestore } from './firebase-admin.js'
import { downloadAndUploadAsset } from './asset-pipeline.js'

const OMEDA_BASE = 'https://omeda.city'

// ─── Types ───────────────────────────────────────────────────────────────────

interface OmedaAbility {
  display_name: string
  image: string
  game_description: string
  menu_description: string
  cooldown: number[]
  cost: number[]
  key: string
  type?: string
}

interface OmedaBaseStats {
  max_health: number[]
  max_mana: number[]
  physical_power: number[]
  physical_armor: number[]
  magical_armor: number[]
  attack_speed: number[]
  base_movement_speed: number[]
  attack_range: number[]
  base_health_regeneration: number[]
  base_mana_regeneration: number[]
  basic_attack_time: number[]
  cleave: number[]
  [key: string]: number[]
}

interface OmedaHero {
  id: number
  name: string
  display_name: string
  slug: string
  image: string
  stats: number[]
  classes: string[]
  roles: string[]
  abilities: OmedaAbility[]
  base_stats: OmedaBaseStats
}

// ─── Tier derivation helpers ──────────────────────────────────────────────────

/**
 * Derive hero DNA profile modifiers from abilities and stat growth.
 * These are pre-computed additive modifiers applied on top of item DNA scores.
 */
function computeHeroDnaProfile(hero: OmedaHero): Record<string, number> {
  const profile: Record<string, number> = {
    burst_modifier: 0,
    sustain_modifier: 0,
    tankiness_modifier: 0,
    scaling_modifier: 0,
    mobility_modifier: 0,
    utility_modifier: 0,
    objective_damage_modifier: 0,
  }

  for (const ability of hero.abilities) {
    const desc = (ability.menu_description + ' ' + ability.game_description).toLowerCase()
    const type = (ability.type || '').toLowerCase()

    // Burst signals
    if (type === 'damage' || desc.includes('damage') || desc.includes('burst')) {
      profile.burst_modifier += 0.3
    }
    // Sustain signals
    if (desc.includes('heal') || desc.includes('lifesteal') || desc.includes('shield')) {
      profile.sustain_modifier += 0.4
    }
    // Mobility signals
    if (type === 'mobility' || desc.includes('dash') || desc.includes('blink') || desc.includes('teleport') || desc.includes('movement speed')) {
      profile.mobility_modifier += 0.5
    }
    // Utility signals
    if (desc.includes('stun') || desc.includes('slow') || desc.includes('root') || desc.includes('silence') || desc.includes('knockup') || desc.includes('crowd control')) {
      profile.utility_modifier += 0.4
    }
    // Scaling signals
    if (desc.includes('stack') || desc.includes('empowered') || desc.includes('passive') || type === 'complex') {
      profile.scaling_modifier += 0.3
    }
    // Objective damage signals
    if (desc.includes('structure') || desc.includes('objective') || desc.includes('max health')) {
      profile.objective_damage_modifier += 0.4
    }
  }

  // Stat growth: high HP growth → tankiness modifier
  const hpGrowth = hero.base_stats.max_health
  if (hpGrowth && hpGrowth.length >= 18) {
    const growthRatio = hpGrowth[17] / hpGrowth[0]
    if (growthRatio > 3.5) profile.tankiness_modifier += 0.5
    else if (growthRatio > 2.5) profile.tankiness_modifier += 0.25
  }

  // Clamp all modifiers to [-2, 2]
  for (const key of Object.keys(profile)) {
    profile[key] = Math.max(-2, Math.min(2, profile[key]))
  }

  return profile
}

// ─── Main sync ────────────────────────────────────────────────────────────────

async function syncHeroes() {
  console.log('🦸 Starting hero sync from Omeda.city...\n')

  const res = await fetch(`${OMEDA_BASE}/heroes.json`)
  if (!res.ok) throw new Error(`Failed to fetch heroes: ${res.status}`)

  const heroes = (await res.json()) as OmedaHero[]
  console.log(`Found ${heroes.length} heroes\n`)

  const db = getFirestore()
  const batch = db.batch()
  let processed = 0

  for (const hero of heroes) {
    console.log(`Processing: ${hero.display_name} (${hero.slug})`)

    // ── Download hero portrait
    let imageUrl = ''
    try {
      const hash = hero.image?.replace('/assets/', '').replace('.webp', '')
      if (hash) {
        const asset = await downloadAndUploadAsset(hash, `heroes/${hero.slug}.webp`)
        imageUrl = asset.firebaseUrl
      }
    } catch (err) {
      console.warn(`  ⚠ Failed to upload hero image for ${hero.slug}:`, err)
      imageUrl = `${OMEDA_BASE}${hero.image}` // fallback to direct URL
    }

    // ── Download ability images
    const abilities = []
    for (const ability of hero.abilities) {
      let abilityImageUrl = ''
      try {
        const hash = ability.image?.replace('/assets/', '').replace('.webp', '')
        if (hash) {
          const asset = await downloadAndUploadAsset(
            hash,
            `abilities/${hero.slug}-${ability.key.toLowerCase()}.webp`
          )
          abilityImageUrl = asset.firebaseUrl
        }
      } catch {
        abilityImageUrl = `${OMEDA_BASE}${ability.image}`
      }

      abilities.push({
        display_name: ability.display_name,
        key: ability.key,
        type: ability.type || '',
        image_url: abilityImageUrl,
        game_description: ability.game_description || '',
        menu_description: ability.menu_description || '',
        cooldown: ability.cooldown || [],
        cost: ability.cost || [],
      })
    }

    // ── Compute hero DNA profile
    const dna_profile = computeHeroDnaProfile(hero)

    // ── Build Firestore document
    const heroDoc = {
      id: hero.id,
      name: hero.name,
      display_name: hero.display_name,
      slug: hero.slug,
      image_url: imageUrl,
      classes: hero.classes || [],
      roles: hero.roles || [],
      stats: {
        damage: hero.stats?.[0] ?? 0,
        durability: hero.stats?.[1] ?? 0,
        cc: hero.stats?.[2] ?? 0,
        mobility: hero.stats?.[3] ?? 0,
      },
      abilities,
      base_stats: {
        max_health: hero.base_stats.max_health || [],
        max_mana: hero.base_stats.max_mana || [],
        physical_power: hero.base_stats.physical_power || [],
        physical_armor: hero.base_stats.physical_armor || [],
        magical_armor: hero.base_stats.magical_armor || [],
        attack_speed: hero.base_stats.attack_speed || [],
        base_movement_speed: hero.base_stats.base_movement_speed || [],
        attack_range: hero.base_stats.attack_range || [],
        base_health_regeneration: hero.base_stats.base_health_regeneration || [],
        base_mana_regeneration: hero.base_stats.base_mana_regeneration || [],
        basic_attack_time: hero.base_stats.basic_attack_time || [],
        cleave: hero.base_stats.cleave || [],
      },
      dna_profile,
      last_updated: new Date().toISOString(),
      patch_version: 'latest',
    }

    const docRef = db.collection('heroes').doc(hero.slug)
    batch.set(docRef, heroDoc, { merge: true })
    processed++
    console.log(`  ✓ Hero queued: ${hero.display_name}\n`)
  }

  console.log('💾 Committing to Firestore...')
  await batch.commit()
  console.log(`\n✅ Hero sync complete. ${processed} heroes synced.`)
}

syncHeroes().catch((err) => {
  console.error('❌ Hero sync failed:', err)
  process.exit(1)
})
