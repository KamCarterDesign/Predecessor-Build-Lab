/**
 * Shared stat helper utilities extracted from the monolithic index.tsx.
 * Includes stat priority ordering, icon mapping, DNA tooltips, and item stat filtering.
 */
import type { ItemDoc } from '@/types'
import { parseDescription, getStatIconHtml } from '@/lib/utils/description-parser'

// ── DNA Tooltip Descriptions ──────────────────────────────────────────────────
export const dnaTooltips: Record<string, string> = {
  burst: "Burst factors in power (magical/physical depending on scaling) multiplied by critical strike or penetration, representing your potential to deal massive damage quickly. It compares level 1 baselines and accounts for item power, penetrations, and basic attack crits.",
  tankiness: "Tankiness is based on a hero's health, armor, and stat growth over time. Since base stats are factored in, no hero starts at 0, and naturally sturdier heroes like Steel will scale and widen the gap against squishier heroes like Gadget.",
  scaling: "Scaling tracks flat values added by stacking passive abilities (e.g. Renna's soul stacks, Gadget's magic power stacks), items that scale over time (like Overlord health stacks from unit kills), and Eternals. Excludes standard level stat growth; if none are present, it remains 0.",
  mobility: "Mobility is calculated from base movement speed, movement speed growth, and dash/teleport abilities, enhanced by flat percentage increases from items, abilities, and Eternals.",
  objective_damage: "Objective Damage represents the capability to deal increased damage to monsters, minions, or structures. It sums flat percentage increases provided by hero abilities, items, or Eternals.",
  sustain: "Sustain measures health regeneration, shields, healing abilities, and lifesteal or omnivamp sources from your kit and items.",
  utility: "Utility represents crowd control capabilities, including stuns, slows, silences, pulls, and roots from abilities and item passives.",
}

// ── Stat Display Priority Order ───────────────────────────────────────────────
export const STAT_PRIORITY: Record<string, number> = {
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

// ── Sort Item Stats by Priority ───────────────────────────────────────────────
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

// ── Stat Icon ID Resolver ─────────────────────────────────────────────────────
export function getStatIconId(statKey: string): string {
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

// ── Check if an item has specific stat filters ────────────────────────────────
export function checkItemStats(item: ItemDoc, activeFilters: string[]): boolean {
  if (!item.stats) return false
  for (const stat of activeFilters) {
    if (stat === 'physical_power' && !((item.stats.physical_power || 0) > 0)) return false
    if (stat === 'magical_power' && !((item.stats.magical_power || 0) > 0 || (item.stats.energy_power || 0) > 0)) return false
    if (stat === 'health' && !((item.stats.max_health || 0) > 0 || (item.stats.health || 0) > 0)) return false
    if (stat === 'ability_haste' && !((item.stats.ability_haste || 0) > 0)) return false
    if (stat === 'physical_armor' && !((item.stats.physical_armor || 0) > 0)) return false
    if (stat === 'magical_armor' && !((item.stats.magical_armor || 0) > 0)) return false
    if (stat === 'physical_penetration' && !((item.stats.physical_penetration || 0) > 0)) return false
    if (stat === 'magical_penetration' && !((item.stats.magical_penetration || 0) > 0)) return false
    if (stat === 'crit_chance' && !((item.stats.crit_chance || item.stats.critical_chance || 0) > 0)) return false
    if (stat === 'attack_speed' && !((item.stats.attack_speed || 0) > 0)) return false
    if (stat === 'lifesteal' && !((item.stats.lifesteal || 0) > 0)) return false
    if (stat === 'magical_lifesteal' && !((item.stats.magical_lifesteal || 0) > 0)) return false
    if (stat === 'omnivamp' && !((item.stats.omnivamp || 0) > 0)) return false
    if (stat === 'heal_shield_increase' && !((item.stats.heal_shield_increase || 0) > 0)) return false
    if (stat === 'max_mana' && !((item.stats.max_mana || item.stats.mana || 0) > 0)) return false
    if (stat === 'health_regeneration' && !((item.stats.health_regeneration || item.stats.base_health_regeneration || 0) > 0)) return false
    if (stat === 'mana_regeneration' && !((item.stats.mana_regeneration || item.stats.base_mana_regeneration || 0) > 0)) return false
    if (stat === 'movement_speed' && !((item.stats.movement_speed || 0) > 0)) return false
    if (stat === 'tenacity' && !((item.stats.tenacity || 0) > 0)) return false
    if (stat === 'gold_per_second' && !((item.stats.gold_per_second || 0) > 0)) return false
  }
  return true
}
