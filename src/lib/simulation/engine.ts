// Simulation Engine for Predecessor Build Lab

export interface HeroAbility {
  display_name: string
  key: string
  type: string
  image_url: string
  game_description: string
  menu_description: string
  cooldown: number[]
  cost: number[]
}

export interface HeroBaseStats {
  max_health: number[]
  max_mana: number[]
  physical_power: number[]
  magical_power?: number[]
  physical_armor: number[]
  magical_armor: number[]
  attack_speed: number[]
  base_movement_speed: number[]
  attack_range: number[]
  base_health_regeneration: number[]
  base_mana_regeneration: number[]
  basic_attack_time: number[]
  cleave: number[]
}

export interface HeroDnaProfile {
  burst_modifier: number
  sustain_modifier: number
  tankiness_modifier: number
  scaling_modifier: number
  mobility_modifier: number
  utility_modifier: number
  objective_damage_modifier: number
  [key: string]: number
}

export interface HeroDoc {
  id: number
  name: string
  display_name: string
  slug: string
  image_url: string
  classes: string[]
  roles: string[]
  stats: {
    damage: number
    durability: number
    cc: number
    mobility: number
  }
  abilities: HeroAbility[]
  base_stats: HeroBaseStats
  dna_profile: HeroDnaProfile
}

export interface ItemDoc {
  id: number
  game_id: number
  name: string
  display_name: string
  slug: string
  image_url: string
  price: number
  total_price: number
  tier: number
  is_final_item: boolean
  is_final_crest: boolean
  slot_type: string
  rarity: string
  aggression_type: string | null
  hero_class: string | null
  stats: Record<string, number>
  effects: Array<{
    name: string
    active: boolean
    condition: string | null
    cooldown: number | null
    menu_description: string
  }>
  requirements: string[]
  build_paths: string[]
}

export interface EternalDoc {
  name: string
  display_name?: string
  slug: string
  category: string
  image_url: string
  description: string
  minor_blessings?: Array<{
    group: string
    name: string
    description: string
  }>
}

export interface BuildDna {
  burst: number
  sustain: number
  tankiness: number
  scaling: number
  mobility: number
  utility: number
  objective_damage: number
}

export interface MilestoneStats {
  itemSlug: string
  itemName: string
  goldSpent: number
  stats: Record<string, number>
  dna: BuildDna
}

export interface BuildAnalysisResult {
  level: number
  baseStats: Record<string, number>
  totalStats: Record<string, number>
  effectiveHpPhys: number
  effectiveHpMag: number
  cdrPct: number
  attacksPerSecond: number
  basicDps: number
  dna: BuildDna
  baseDna: BuildDna
  itemDna: BuildDna
  identityTag: string
  strengths: string[]
  weaknesses: string[]
  confidenceScore: number
  confidenceBreakdown: string[]
  powerSpikes: string[]
  report: string
}

// Helper to safely fetch value from array at level N (1-18)
function getStatAtLevel(statArray: number[], level: number): number {
  if (!statArray || statArray.length === 0) return 0
  const index = Math.max(0, Math.min(17, level - 1))
  return statArray[index] ?? statArray[statArray.length - 1] ?? 0
}

const HERO_OUTLIERS: Record<string, { strengths: string[]; weaknesses: string[] }> = {
  adele: {
    strengths: ['[Hero: Adele] Strong area control and shield mechanics.'],
    weaknesses: ['[Hero: Adele] Relies on landing skillshots for survivability.']
  },
  akeron: {
    strengths: ['[Hero: Akeron] Long-range physical poke and execute potential.'],
    weaknesses: ['[Hero: Akeron] Fragile and highly vulnerable to gap-closing assassins.']
  },
  argus: {
    strengths: ['[Hero: Argus] Exceptional continuous crowd control and zone control.'],
    weaknesses: ['[Hero: Argus] High mana consumption and low base movement speed.']
  },
  aurora: {
    strengths: ['[Hero: Aurora] Exceptional crowd control, freezing enemies and creating terrain.'],
    weaknesses: ['[Hero: Aurora] High ability cooldowns; vulnerable when skills are on cooldown.']
  },
  bayle: {
    strengths: ['[Hero: Bayle] High physical burst and duel pressure.'],
    weaknesses: ['[Hero: Bayle] Limited escape tools once committed to a fight.']
  },
  boris: {
    strengths: ['[Hero: Boris] Extreme health scaling and single-target lockdown.'],
    weaknesses: ['[Hero: Boris] Slow attack animations and easily kited by ranged heroes.']
  },
  countess: {
    strengths: ['[Hero: Countess] Passive deals percentage damage when triggered, granting extreme burst against squishies.'],
    weaknesses: ['[Hero: Countess] Very fragile and easily shut down by hard crowd control.']
  },
  crunch: {
    strengths: ['[Hero: Crunch] Unmatched ability-chaining combos and sustained close-combat damage.'],
    weaknesses: ['[Hero: Crunch] Relies heavily on continuous basic attacks; shut down by blinds or disarms.']
  },
  dekker: {
    strengths: ['[Hero: Dekker] Outstanding long-range stuns, speed boosts, and containment cage ultimate.'],
    weaknesses: ['[Hero: Dekker] Very low individual damage output.']
  },
  drongo: {
    strengths: ['[Hero: Drongo] Unique silence grenade to disrupt ability casters and shred armor.'],
    weaknesses: ['[Hero: Drongo] Lacks dynamic movement or dash abilities.']
  },
  eden: {
    strengths: ['[Hero: Eden] High shield generation and utility for lane sustain.'],
    weaknesses: ['[Hero: Eden] Weak early game pressure.']
  },
  'feng-mao': {
    strengths: ['[Hero: Feng Mao] High mobility, shielding, and reset-based execute ultimate.'],
    weaknesses: ['[Hero: Feng Mao] Squishy for a frontliner and relies on precise execution timing.']
  },
  gadget: {
    strengths: ['[Hero: Gadget] High magical power scaling and long-range area control.'],
    weaknesses: ['[Hero: Gadget] Squishy and lacks high mobility options.']
  },
  gideon: {
    strengths: ['[Hero: Gideon] High-impact AoE black hole ultimate and long-range teleport.'],
    weaknesses: ['[Hero: Gideon] Ultimate channels in place, making him a vulnerable target during use.']
  },
  greystone: {
    strengths: ['[Hero: Greystone] Passive health regeneration and second life ultimate offer massive survivability.'],
    weaknesses: ['[Hero: Greystone] Lacks hard crowd control (stuns/roots) to peel for allies.']
  },
  'grim-exe': {
    strengths: ['[Hero: Grim.exe] Shield that blocks incoming abilities and long-range homing ultimate.'],
    weaknesses: ['[Hero: Grim.exe] Very large hitbox makes him easy to hit with skillshots.']
  },
  grux: {
    strengths: ['[Hero: Grux] Exceptional bleed passive, pull, and knock-up crowd control.'],
    weaknesses: ['[Hero: Grux] Kited easily in open spaces if double dash is down.']
  },
  howitzer: {
    strengths: ['[Hero: Howitzer] Excellent long-range zoning, self-peel knockbacks, and evasive ultimate.'],
    weaknesses: ['[Hero: Howitzer] Huge hitbox for a caster hero.']
  },
  'iggy-scorch': {
    strengths: ['[Hero: Iggy & Scorch] Zone control and high damage over time from turrets.'],
    weaknesses: ['[Hero: Iggy & Scorch] Immobile: Lacks escape or movement abilities, making them vulnerable to ganks.']
  },
  ikra: {
    strengths: ['[Hero: Ikra] Sustained healing and strong front-line engagement.'],
    weaknesses: ['[Hero: Ikra] Vulnerable to anti-heal items.']
  },
  kallari: {
    strengths: ['[Hero: Kallari] Stealth, global presence, and high physical burst from shadows.'],
    weaknesses: ['[Hero: Kallari] Extremely low health pool; dies quickly if detected.']
  },
  khaimera: {
    strengths: ['[Hero: Khaimera] Infinite health regen scaling from continuous hits and early duel potential.'],
    weaknesses: ['[Hero: Khaimera] Lacks an escape tool once jumped in; weak against anti-heal.']
  },
  kira: {
    strengths: ['[Hero: Kira] High mobility dash and percentage-based true damage.'],
    weaknesses: ['[Hero: Kira] Low basic attack range compared to other carries.']
  },
  kwang: {
    strengths: ['[Hero: Kwang] High utility tether, self-shielding, and AoE magical/physical burst.'],
    weaknesses: ['[Hero: Kwang] Committing without landing the sword tether heavily reduces impact.']
  },
  legion: {
    strengths: ['[Hero: Legion] Outstanding team shielding and crowd control.'],
    weaknesses: ['[Hero: Legion] Low solo damage and relies on team follow-up.']
  },
  'lt-belica': {
    strengths: ['[Hero: Lt. Belica] Mana-drain drone and ultimate that deals damage based on enemy missing mana.'],
    weaknesses: ['[Hero: Lt. Belica] Low base mobility and vulnerable when drone is destroyed.']
  },
  maco: {
    strengths: ['[Hero: Maco] Unique healing area-of-effect and crowd control.'],
    weaknesses: ['[Hero: Maco] Slow projectile speeds on primary skills.']
  },
  morigesh: {
    strengths: ['[Hero: Morigesh] Target-lock doll marking and global execute ultimate.'],
    weaknesses: ['[Hero: Morigesh] Short ability range forces close proximity to threats.']
  },
  mourn: {
    strengths: ['[Hero: Mourn] High health regeneration and physical burst.'],
    weaknesses: ['[Hero: Mourn] Easily shut down by crowd control.']
  },
  murdock: {
    strengths: ['[Hero: Murdock] Global sniper ultimate that ignores armor and traps for zone control.'],
    weaknesses: ['[Hero: Murdock] Lacks a dash or escape ability besides a short knockback.']
  },
  muriel: {
    strengths: ['[Hero: Muriel] Global shield ultimate to save allies anywhere and strong mitigation.'],
    weaknesses: ['[Hero: Muriel] No hard crowd control to stop enemy channelings.']
  },
  narbash: {
    strengths: ['[Hero: Narbash] Exceptional area healing, speed boosts, and AoE knockup ultimate.'],
    weaknesses: ['[Hero: Narbash] High mana consumption; ultimate can be interrupted by stuns.']
  },
  neon: {
    strengths: ['[Hero: Neon] High single-target lock-on ability damage.'],
    weaknesses: ['[Hero: Neon] Squishy and lacks dynamic escape tools.']
  },
  phase: {
    strengths: ['[Hero: Phase] Pulls allies to safety, links for health regen share, and blinds enemies.'],
    weaknesses: ['[Hero: Phase] Completely reliant on having a linked ally to be effective.']
  },
  rampage: {
    strengths: ['[Hero: Rampage] Massive health regen and size increase in ultimate, and long stun rock.'],
    weaknesses: ['[Hero: Rampage] Stun rock has a long wind-up time and is easily dodged.']
  },
  renna: {
    strengths: ['[Hero: Renna] Soul collection passive that scales ability damage late game.'],
    weaknesses: ['[Hero: Renna] Weak early game before acquiring sufficient soul stacks.']
  },
  revenant: {
    strengths: ['[Hero: Revenant] High physical burst from reload basic attacks and isolation ultimate.'],
    weaknesses: ['[Hero: Revenant] Fixed reload time slows down continuous DPS in teamfights.']
  },
  riktor: {
    strengths: ['[Hero: Riktor] Game-changing long-range hook, silences, and AoE stun ultimate.'],
    weaknesses: ['[Hero: Riktor] Missed hooks leave him vulnerable and waste high mana.']
  },
  serath: {
    strengths: ['[Hero: Serath] High physical damage scaling, invulnerability frame, and chase capability.'],
    weaknesses: ['[Hero: Serath] Fragile melee carry that is easily focused down.']
  },
  sevarog: {
    strengths: ['[Hero: Sevarog] Infinite scaling: gaining health/power from siphon minion kills.'],
    weaknesses: ['[Hero: Sevarog] Weak early game; heavily penalized if stacks are not farmed.']
  },
  shinbi: {
    strengths: ['[Hero: Shinbi] Exceptional self-shielding, mobility, and long-range stack execute.'],
    weaknesses: ['[Hero: Shinbi] Lacks any hard crowd control (stuns/roots) to peel.']
  },
  skylar: {
    strengths: ['[Hero: Skylar] High aerial mobility and long-range missile barrages.'],
    weaknesses: ['[Hero: Skylar] Vulnerable to anti-air crowd control and grounding effects.']
  },
  sparrow: {
    strengths: ['[Hero: Sparrow] Unmatched continuous basic attack scaling and attack speed buffs.'],
    weaknesses: ['[Hero: Sparrow] Absolutely no mobility or defensive skills; highly vulnerable to ganks.']
  },
  steel: {
    strengths: ['[Hero: Steel] Outstanding crowd control chain and shields for team blocking.'],
    weaknesses: ['[Hero: Steel] Low basic attack scaling and poor single-target damage output.']
  },
  terra: {
    strengths: ['[Hero: Terra] CC-immune ultimate, stun, and shield block.'],
    weaknesses: ['[Hero: Terra] Low mobility when ultimate is not active.']
  },
  'the-fey': {
    strengths: ['[Hero: The Fey] Extreme AoE pull ultimate, slow, and mana-refund poke.'],
    weaknesses: ['[Hero: The Fey] Zero mobility skills makes her an easy target for dive heroes.']
  },
  twinblast: {
    strengths: ['[Hero: Twinblast] Double basic-attack passive, rapid dash, and high-range ultimate.'],
    weaknesses: ['[Hero: Twinblast] Low health pool and highly reliant on items for scaling.']
  },
  wraith: {
    strengths: ['[Hero: Wraith] Invisibility, rewind-back utility, and long-range ward/snipe.'],
    weaknesses: ['[Hero: Wraith] High skill floor; missing rewind or snipe heavily reduces utility.']
  },
  wukong: {
    strengths: ['[Hero: Wukong] Clone-based pushing power and high double-jump mobility.'],
    weaknesses: ['[Hero: Wukong] Lacks burst damage; relies on sustained basic attacks.']
  },
  yin: {
    strengths: ['[Hero: Yin] Projectile reflection, whip-cleave range, and wind barrier.'],
    weaknesses: ['[Hero: Yin] Highly vulnerable to melee dive when whip range is down.']
  },
  yurei: {
    strengths: ['[Hero: Yurei] Shadow step mobility and high single-target burst.'],
    weaknesses: ['[Hero: Yurei] Squishy and easily locked down by AoE crowd control.']
  },
  zarus: {
    strengths: ['[Hero: Zarus] Cage duel ultimate that permanently gains power on kills, and stun.'],
    weaknesses: ['[Hero: Zarus] Duel cage can trap teammates if placed poorly.']
  },
  zinx: {
    strengths: ['[Hero: Zinx] Exceptional healing and sustain capabilities in combat.'],
    weaknesses: ['[Hero: Zinx] Vulnerable to anti-heal effects (Tainted items).']
  }
}

const ITEM_OUTLIERS: Record<string, { strengths: string[]; weaknesses: string[] }> = {
  overlord: {
    strengths: ['[Item: Overlord] Infinite scaling: grants bonus health per unit killed.'],
    weaknesses: ['[Item: Overlord] Low initial stat value before farming stacks.']
  },
  'tainted-blade': {
    strengths: ['[Item: Tainted Blade] Anti-Heal: reduces enemy healing/regeneration by 40%.'],
    weaknesses: ['[Item: Tainted Blade] Sub-optimal raw physical power compared to other damage items.']
  },
  'tainted-scepter': {
    strengths: ['[Item: Tainted Scepter] Anti-Heal: reduces enemy healing/regeneration by 40%.'],
    weaknesses: ['[Item: Tainted Scepter] Lower raw magical power compared to pure damage items.']
  }
}

export function calculateBuildStats(
  hero: HeroDoc,
  level: number,
  items: ItemDoc[],
  crest: ItemDoc | null,
  eternal: EternalDoc | null,
  options?: {
    synergies?: Record<string, { avg_win_rate: number; sample_size: number }>
    popularBuildsCount?: number
    isSubCall?: boolean
    allHeroes?: HeroDoc[]
    minorBlessings?: string[]
  }
): BuildAnalysisResult {
  const allEquippedItems = [...items]
  if (crest) allEquippedItems.push(crest)

  // 1. Raw Base Stats
  const baseStats: Record<string, number> = {
    max_health: getStatAtLevel(hero.base_stats.max_health, level),
    max_mana: getStatAtLevel(hero.base_stats.max_mana, level),
    physical_power: getStatAtLevel(hero.base_stats.physical_power, level),
    magical_power: getStatAtLevel(hero.base_stats.magical_power || [], level),
    physical_armor: getStatAtLevel(hero.base_stats.physical_armor, level),
    magical_armor: getStatAtLevel(hero.base_stats.magical_armor, level),
    attack_speed: getStatAtLevel(hero.base_stats.attack_speed, level),
    base_movement_speed: getStatAtLevel(hero.base_stats.base_movement_speed, level) || 350,
    base_health_regeneration: getStatAtLevel(hero.base_stats.base_health_regeneration, level),
    base_mana_regeneration: getStatAtLevel(hero.base_stats.base_mana_regeneration, level),
    attack_range: getStatAtLevel(hero.base_stats.attack_range, level),
    basic_attack_time: getStatAtLevel(hero.base_stats.basic_attack_time, level) || 1.15,
  }

  // 2. Sum Item Stats
  const itemStatsSum: Record<string, number> = {}
  for (const item of allEquippedItems) {
    if (!item.stats) continue
    for (const [statKey, statVal] of Object.entries(item.stats)) {
      itemStatsSum[statKey] = (itemStatsSum[statKey] || 0) + statVal
    }
  }

  // 3. Compute Totals
  const totalStats: Record<string, number> = {
    max_health: baseStats.max_health + (itemStatsSum.max_health || 0) + (itemStatsSum.health || 0),
    max_mana: baseStats.max_mana + (itemStatsSum.max_mana || 0) + (itemStatsSum.mana || 0),
    physical_power: baseStats.physical_power + (itemStatsSum.physical_power || 0),
    magical_power: baseStats.magical_power + (itemStatsSum.magical_power || itemStatsSum.energy_power || 0),
    physical_armor: baseStats.physical_armor + (itemStatsSum.physical_armor || 0),
    magical_armor: baseStats.magical_armor + (itemStatsSum.magical_armor || 0),
    ability_haste: itemStatsSum.ability_haste || 0,
    physical_penetration: itemStatsSum.physical_penetration || 0,
    magical_penetration: itemStatsSum.magical_penetration || 0,
    crit_chance: itemStatsSum.crit_chance || 0,
    lifesteal: itemStatsSum.lifesteal || 0,
    omnivamp: itemStatsSum.omnivamp || 0,
  }

  // Attack speed formula: base * (1 + sum(item.attack_speed) / 100)
  const itemAtkSpeedMultiplier = (itemStatsSum.attack_speed || 0) / 100
  totalStats.attack_speed = baseStats.attack_speed * (1 + itemAtkSpeedMultiplier)

  // 4. Effective HP and other mechanics
  const effectiveHpPhys = totalStats.max_health * (1 + totalStats.physical_armor / 100)
  const effectiveHpMag = totalStats.max_health * (1 + totalStats.magical_armor / 100)

  const cdrPct = totalStats.ability_haste / (100 + totalStats.ability_haste)

  // Attacks per second = 1 / (basic_attack_time / total_atk_speed)
  const basicAttackTime = baseStats.basic_attack_time || 1.15
  const attacksPerSecond = 1 / (basicAttackTime / totalStats.attack_speed)

  // Basic DPS = physical_power * attacks_per_second * (1 + crit_chance * 0.75)
  // crit chance is typically stored as 0 to 100 in items, so convert to 0-1
  const critMultiplier = 1 + (totalStats.crit_chance / 100) * 0.75
  const basicDps = totalStats.physical_power * attacksPerSecond * critMultiplier

  // 5. DNA Profile Calculation (Relative to Other Heroes)
  // Determine min/max boundaries across all heroes for base stats at current level
  let minHealth = 500, maxHealth = 700;
  let minPhysArmor = 20, maxPhysArmor = 40;
  let minMagArmor = 20, maxMagArmor = 40;
  let minBaseMs = 600, maxBaseMs = 750;
  let minPhysPower = 40, maxPhysPower = 60;
  
  const allHeroes = options?.allHeroes;
  if (allHeroes && allHeroes.length > 0) {
    const getVal = (h: HeroDoc, statName: string) => {
      const arr = (h.base_stats as any)[statName];
      return getStatAtLevel(arr, level);
    };
    const healths = allHeroes.map(h => getVal(h, 'max_health'));
    const physArmors = allHeroes.map(h => getVal(h, 'physical_armor'));
    const magArmors = allHeroes.map(h => getVal(h, 'magical_armor'));
    const movementSpeeds = allHeroes.map(h => getVal(h, 'base_movement_speed') || 350);
    const physPowers = allHeroes.map(h => getVal(h, 'physical_power'));
    
    minHealth = Math.min(...healths);
    maxHealth = Math.max(...healths);
    minPhysArmor = Math.min(...physArmors);
    maxPhysArmor = Math.max(...physArmors);
    minMagArmor = Math.min(...magArmors);
    maxMagArmor = Math.max(...magArmors);
    minBaseMs = Math.min(...movementSpeeds);
    maxBaseMs = Math.max(...movementSpeeds);
    minPhysPower = Math.min(...physPowers);
    maxPhysPower = Math.max(...physPowers);
  } else {
    // Dynamic level fallback bounds
    minHealth = 500 + (level - 1) * 80;
    maxHealth = 750 + (level - 1) * 130;
    minPhysArmor = 20 + (level - 1) * 2;
    maxPhysArmor = 38 + (level - 1) * 5.5;
    minMagArmor = 20 + (level - 1) * 1;
    maxMagArmor = 35 + (level - 1) * 2.5;
    minBaseMs = 600;
    maxBaseMs = 730;
    minPhysPower = 40 + (level - 1) * 1.5;
    maxPhysPower = 60 + (level - 1) * 3;
  }

  const getRatio = (val: number, min: number, max: number) => {
    if (max <= min) return 0.5;
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  };

  const healthRatio = getRatio(baseStats.max_health, minHealth, maxHealth);
  const physArmorRatio = getRatio(baseStats.physical_armor, minPhysArmor, maxPhysArmor);
  const magArmorRatio = getRatio(baseStats.magical_armor, minMagArmor, maxMagArmor);
  const msRatio = getRatio(baseStats.base_movement_speed, minBaseMs, maxBaseMs);
  const powerRatio = getRatio(baseStats.physical_power, minPhysPower, maxPhysPower);

  // BASE DNA
  // TANKINESS: Base stats and growth. Scale 1-10 (Gadget vs Steel should grow over time). No hero should have a value of 0.
  const baseTankiness = 1 + 8 * ((healthRatio * 0.5) + (physArmorRatio * 0.25) + (magArmorRatio * 0.25));

  // BURST: power (magical or physical depending on scaling), no items means default pen/crit is 0.
  const isCasterOrAssassin = hero.classes?.some(c => ['Mage', 'Assassin', 'Carry'].includes(c)) || hero.roles?.some(r => ['Midlaner', 'Carry', 'Assassin'].includes(r));
  const baseBurst = 1 + 8 * (powerRatio * 0.6 + (isCasterOrAssassin ? 0.4 : 0.0));

  // SCALING: Only stacking abilities/passives, default is 0.
  let hasScalingAbility = false;
  for (const ab of hero.abilities) {
    const text = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
    if (text.includes('stack') || text.includes('soul') || text.includes('permanently') || text.includes('infinite') || text.includes('over time')) {
      hasScalingAbility = true;
      break;
    }
  }
  const baseScaling = hasScalingAbility ? 4.0 : 0.0;

  // MOBILITY: Base movement speed, dash/teleport skills, MS growth.
  let mobilitySkillVal = 0;
  for (const ab of hero.abilities) {
    const text = ((ab.menu_description || '') + ' ' + (ab.game_description || '') + ' ' + (ab.type || '')).toLowerCase();
    if (text.includes('dash') || text.includes('teleport') || text.includes('blink') || text.includes('leap') || text.includes('charge') || text.includes('movement speed') || text.includes('haste')) {
      mobilitySkillVal += 1.5;
    }
  }
  const baseMobility = Math.min(10, 1 + 6 * msRatio + mobilitySkillVal);

  // OBJECTIVE DAMAGE: Deals increased damage to monsters/minions
  let objectiveSkillVal = 0;
  for (const ab of hero.abilities) {
    const text = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
    if (text.includes('monster') || text.includes('minion') || text.includes('structure') || text.includes('objective') || text.includes('deal increased damage')) {
      objectiveSkillVal += 2.5;
    }
  }
  const baseObjectiveDamage = objectiveSkillVal;

  // SUSTAIN
  let sustainSkillVal = 0;
  for (const ab of hero.abilities) {
    const text = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
    if (text.includes('heal') || text.includes('shield') || text.includes('lifesteal') || text.includes('vamp') || text.includes('health regen') || text.includes('sustain')) {
      sustainSkillVal += 2.0;
    }
  }
  const baseSustain = Math.min(10, 1 + sustainSkillVal);

  // UTILITY
  let utilitySkillVal = 0;
  for (const ab of hero.abilities) {
    const text = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
    if (text.includes('slow') || text.includes('stun') || text.includes('knock') || text.includes('silence') || text.includes('root') || text.includes('suppress') || text.includes('pull')) {
      utilitySkillVal += 1.5;
    }
  }
  const baseUtility = Math.min(10, 1 + utilitySkillVal);

  const baseDna: BuildDna = {
    burst: Math.round(baseBurst * 10) / 10,
    sustain: Math.round(baseSustain * 10) / 10,
    tankiness: Math.round(baseTankiness * 10) / 10,
    scaling: Math.round(baseScaling * 10) / 10,
    mobility: Math.round(baseMobility * 10) / 10,
    utility: Math.round(baseUtility * 10) / 10,
    objective_damage: Math.round(baseObjectiveDamage * 10) / 10,
  }

  // ITEM CONTRIBUTION
  const itemDnaScore = {
    burst: 0,
    sustain: 0,
    tankiness: 0,
    scaling: 0,
    mobility: 0,
    utility: 0,
    objective_damage: 0,
  }

  // Item Burst: Power multiplied by penetrations or critical strike
  const totalItemPower = (itemStatsSum.physical_power || 0) + (itemStatsSum.magical_power || itemStatsSum.energy_power || 0);
  const penMultiplier = 1 + ((totalStats.physical_penetration || 0) + (totalStats.magical_penetration || 0)) / 100;
  const critMult = 1 + (totalStats.crit_chance || 0) / 100 * 0.75;
  itemDnaScore.burst = (totalItemPower / 40) * penMultiplier * critMult;

  // Item Tankiness
  itemDnaScore.tankiness = ((itemStatsSum.max_health || itemStatsSum.health || 0) / 250) + ((itemStatsSum.physical_armor || 0) / 30) + ((itemStatsSum.magical_armor || 0) / 30);

  // Item Scaling: Flat values (no stat growth)
  for (const item of allEquippedItems) {
    if (item.effects && item.effects.some(e => {
      const desc = (e.menu_description || '').toLowerCase();
      return desc.includes('stack') || desc.includes('infinite') || desc.includes('kills grant') || desc.includes('per unit');
    })) {
      itemDnaScore.scaling += 1.5;
    }
    // Sustain items
    if (item.stats.lifesteal || item.stats.omnivamp || item.stats.base_health_regeneration) {
      itemDnaScore.sustain += 1.2;
    }
    // Mobility items: flat values based on movement speed increase %
    if ((item.stats.movement_speed || 0) > 0) {
      itemDnaScore.mobility += 1.2;
    }
    if (item.effects && item.effects.some(e => {
      const desc = (e.menu_description || '').toLowerCase();
      return desc.includes('movement speed') || desc.includes('dash') || desc.includes('haste');
    })) {
      itemDnaScore.mobility += 1.0;
    }
    // Utility items
    if (item.effects && item.effects.some(e => {
      const desc = (e.menu_description || '').toLowerCase();
      return desc.includes('slow') || desc.includes('stun') || desc.includes('silence') || desc.includes('shred');
    })) {
      itemDnaScore.utility += 1.0;
    }
    // Objective damage items
    if (item.effects && item.effects.some(e => {
      const desc = (e.menu_description || '').toLowerCase();
      return desc.includes('monster') || desc.includes('minion') || desc.includes('objective') || desc.includes('structure');
    })) {
      itemDnaScore.objective_damage += 2.0;
    }
  }

  // Eternal / Blessings
  if (eternal) {
    itemDnaScore.scaling += 1.5; // Eternal provides flat scaling
    const blessings = options?.minorBlessings || [];
    if (blessings.length > 0) {
      itemDnaScore.utility += blessings.length * 0.4;
      itemDnaScore.sustain += blessings.length * 0.4;
    }
  }

  const itemDna: BuildDna = {
    burst: clampVal(itemDnaScore.burst),
    sustain: clampVal(itemDnaScore.sustain),
    tankiness: clampVal(itemDnaScore.tankiness),
    scaling: clampVal(itemDnaScore.scaling),
    mobility: clampVal(itemDnaScore.mobility),
    utility: clampVal(itemDnaScore.utility),
    objective_damage: clampVal(itemDnaScore.objective_damage),
  }

  const dna: BuildDna = {
    burst: clampVal(baseDna.burst + itemDna.burst),
    sustain: clampVal(baseDna.sustain + itemDna.sustain),
    tankiness: clampVal(baseDna.tankiness + itemDna.tankiness),
    scaling: clampVal(baseDna.scaling + itemDna.scaling),
    mobility: clampVal(baseDna.mobility + itemDna.mobility),
    utility: clampVal(baseDna.utility + itemDna.utility),
    objective_damage: clampVal(baseDna.objective_damage + itemDna.objective_damage),
  }

  // Build identity tag is removed for now
  const identityTag = ''

  // 6. Strengths and Weaknesses
  const strengths: string[] = []
  const weaknesses: string[] = []

  // Add predefined Hero outliers
  const heroOut = HERO_OUTLIERS[hero.slug];
  if (heroOut) {
    strengths.push(...heroOut.strengths);
    weaknesses.push(...heroOut.weaknesses);
  }

  // Add predefined Item outliers
  for (const item of allEquippedItems) {
    const itemOut = ITEM_OUTLIERS[item.slug];
    if (itemOut) {
      strengths.push(...itemOut.strengths);
      weaknesses.push(...itemOut.weaknesses);
    }
  }

  // Fallbacks if no outliers found
  if (strengths.length === 0) {
    if (dna.burst > 7.5) strengths.push(`[Hero: ${hero.display_name}] High Burst Potential — High capacity to deal rapid damage.`);
    if (dna.tankiness > 7.5) strengths.push(`[Hero: ${hero.display_name}] Extreme Durability — Exceptionally hard to kill.`);
  }
  if (weaknesses.length === 0) {
    if (dna.mobility < 3) weaknesses.push(`[Hero: ${hero.display_name}] Low Mobility — Lacks escape tools and is vulnerable to kiting.`);
    if (dna.tankiness < 3.5) weaknesses.push(`[Hero: ${hero.display_name}] Low Durability — Easily burst down by physical or magical threats.`);
  }

  // 7. Confidence Score & Breakdown
  let confidenceScore = 50
  const confidenceBreakdown: string[] = []

  // Factor 1: Item Suitability (magical scaling character with physical items lowers confidence, and vice versa)
  const physicalItemsCount = items.filter(i => (i.stats.physical_power || 0) > 0).length;
  const magicalItemsCount = items.filter(i => (i.stats.magical_power || i.stats.energy_power || 0) > 0).length;

  const scalesMagical = !!(hero.base_stats.magical_power && hero.base_stats.magical_power.some(v => v > 0)) || hero.classes?.includes('Mage');
  const scalesPhysical = hero.classes?.includes('Carry') || hero.classes?.includes('Assassin') || (!scalesMagical && hero.classes?.includes('Fighter'));

  let suitabilityDelta = 0;
  if (scalesMagical && physicalItemsCount >= 2) {
    suitabilityDelta = -15 * physicalItemsCount;
    confidenceBreakdown.push(`! Attribute Mismatch: Built ${physicalItemsCount} Physical Power items on a Magical scaling hero (${hero.display_name})`);
  } else if (scalesPhysical && magicalItemsCount >= 2) {
    suitabilityDelta = -15 * magicalItemsCount;
    confidenceBreakdown.push(`! Attribute Mismatch: Built ${magicalItemsCount} Magical Power items on a Physical scaling hero (${hero.display_name})`);
  } else if (physicalItemsCount > 0 || magicalItemsCount > 0) {
    suitabilityDelta = 20;
    confidenceBreakdown.push('✓ Attribute Match: Items align with the hero\'s primary scaling damage types');
  }
  confidenceScore += suitabilityDelta;

  // Factor 2: Synergy Checks (Item History)
  let synergyHits = 0
  let synergySum = 0
  if (options?.synergies) {
    for (const item of allEquippedItems) {
      const key = `${hero.slug}:${item.slug}`
      const scoreObj = options.synergies[key]
      if (scoreObj && scoreObj.sample_size > 10) {
        synergyHits++
        synergySum += scoreObj.avg_win_rate
      }
    }
  }

  if (synergyHits > 0) {
    const avgSynergyWin = (synergySum / synergyHits) * 100
    const winrateDiff = avgSynergyWin - 50;
    const historyDelta = Math.round(winrateDiff * 2.5);
    confidenceScore += historyDelta;
    confidenceBreakdown.push(`✓ History Statistics: Equipped items have a ${avgSynergyWin.toFixed(1)}% average historical win rate on ${hero.display_name} (${historyDelta >= 0 ? '+' : ''}${historyDelta}% confidence)`);
  } else {
    confidenceScore -= 15;
    confidenceBreakdown.push('! Off-Meta Choice: No historical popularity statistics found for this item combination on this hero');
  }

  // Factor 3: Build Completeness
  if (allEquippedItems.length >= 7) {
    confidenceScore += 10
    confidenceBreakdown.push('✓ Complete build: contains full item loadout + crest')
  } else {
    confidenceScore -= 15
    confidenceBreakdown.push('! Incomplete build slots (highly impacts simulation reliability)')
  }

  confidenceScore = Math.max(0, Math.min(100, confidenceScore))

  // 8. Power Spike analysis
  const powerSpikes: string[] = []
  if (!options?.isSubCall) {
    let currentDnaSum = 0
    let index = 1
    for (const item of items) {
      // compute incremental change
      const subItems = items.slice(0, index)
      const subRes = calculateBuildStats(hero, level, subItems, null, null, { isSubCall: true, allHeroes })
      const newSum = Object.values(subRes.dna).reduce((a, b) => a + b, 0)
      const delta = newSum - currentDnaSum
      if (delta > 4.5) {
        powerSpikes.push(`Item ${index} (${item.display_name}) provides a massive power jump (+${Math.round(delta * 10) / 10} DNA scale).`)
      }
      currentDnaSum = newSum
      index++
    }
  }

  // 9. Free-Tier report generation
  const report = `
### Build Report — ${hero.display_name} — Level ${level}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Build Totals:**
- Health: ${Math.round(totalStats.max_health)} HP
- Mana: ${Math.round(totalStats.max_mana)} MP
- Physical Power: ${Math.round(totalStats.physical_power)}
- Magical Power: ${Math.round(totalStats.magical_power)}
- Effective Physical HP: ${Math.round(effectiveHpPhys)}
- Effective Magical HP: ${Math.round(effectiveHpMag)}
- Cooldown Reduction: ${Math.round(cdrPct * 100)}% (${totalStats.ability_haste} Haste)
- Attacks per Second: ${attacksPerSecond.toFixed(2)}
- Basic attack DPS: ${Math.round(basicDps)}

**Strengths:**
${strengths.map(s => `* ${s}`).join('\n')}

**Weaknesses:**
${weaknesses.map(w => `* ${w}`).join('\n')}

**Build Confidence:** ${confidenceScore}%
${confidenceBreakdown.map(b => `- ${b}`).join('\n')}
  `.trim()

  return {
    level,
    baseStats,
    totalStats,
    effectiveHpPhys,
    effectiveHpMag,
    cdrPct,
    attacksPerSecond,
    basicDps,
    dna,
    baseDna,
    itemDna,
    identityTag,
    strengths,
    weaknesses,
    confidenceScore,
    confidenceBreakdown,
    powerSpikes,
    report,
  }
}

function clampVal(val: number): number {
  return Math.max(0, Math.min(10, val));
}
