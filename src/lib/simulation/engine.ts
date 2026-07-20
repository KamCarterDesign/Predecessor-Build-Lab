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
  basicAttackPower: number
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
    strengths: ['[Hero: Adele] Tactical Shielding: Features unique shield-generation mechanics in close combat that reward landing sequential skillshots.'],
    weaknesses: ['[Hero: Adele] Skillshot Dependency: Survivability drops significantly if she misses her primary line abilities in combat.']
  },
  akeron: {
    strengths: ['[Hero: Akeron] Maximum Poke Reach: Extremely long-range physical ability poke that excels at softening up opponents before engaging in direct fights.'],
    weaknesses: ['[Hero: Akeron] Assassin Prey: Lacks defensive tools and is easily deleted if a gap-closing assassin engages him directly.']
  },
  argus: {
    strengths: ['[Hero: Argus] Continuous Disruption: Possesses exceptional continuous crowd control and area-denial, letting him control choke points better than most mages.'],
    weaknesses: ['[Hero: Argus] Heavy Mana Strain: Ability combos consume high amounts of mana, making him highly reliant on mana regen items.']
  },
  aurora: {
    strengths: ['[Hero: Aurora] Unique Terrain Modification: Only hero capable of creating solid ice walls to block paths, isolate targets, and alter map geometry.'],
    weaknesses: ['[Hero: Aurora] High Cooldown Dependency: Long ability cooldowns leave her vulnerable if forced to fight without her ice-wall or escape tools.']
  },
  bayle: {
    strengths: ['[Hero: Bayle] Duel Isolation: Extremely high physical single-target burst that punishes lone targets in short skirmishes.'],
    weaknesses: ['[Hero: Bayle] Committed Escape: Has limited escape options once committed to a duel, requiring him to fight to the death.']
  },
  boris: {
    strengths: ['[Hero: Boris] Colossal Health Scaling: High base health and scaling that turns raw tank items into direct crowd control performance.'],
    weaknesses: ['[Hero: Boris] Kiting Vulnerability: Slow basic attack animations make him easily kited by highly mobile ranged carries.']
  },
  countess: {
    strengths: ['[Hero: Countess] Percentage Execute Burst: Passive triggers massive percentage damage on targets, allowing her to delete squishy heroes instantly compared to other assassins.'],
    weaknesses: ['[Hero: Countess] Crowd Control Victim: Extremely low health pool makes her easy to kill if interrupted by stuns/roots.']
  },
  crunch: {
    strengths: ['[Hero: Crunch] Chain-Combos: Ability animations cancel each other, allowing unmatched sustained melee DPS and knock-ups if chained correctly.'],
    weaknesses: ['[Hero: Crunch] Blind Disruption: Heavily relies on continuous basic attacks to reduce skill cooldowns; shut down by blinds or disarms.']
  },
  dekker: {
    strengths: ['[Hero: Dekker] Area Containment: Renders a large containment cage to trap multiple enemies, dictating teamfight positioning better than any support.'],
    weaknesses: ['[Hero: Dekker] Minimal Solo Threat: Extremely low individual damage output, requiring follow-up from allies.']
  },
  drongo: {
    strengths: ['[Hero: Drongo] Spellcaster Silence: Features a unique silence grenade that completely disables enemy ability usage in its zone, neutralizing mages.'],
    weaknesses: ['[Hero: Drongo] Static Positioning: Lacks any dash or movement abilities, relying entirely on positioning and self-peel.']
  },
  eden: {
    strengths: ['[Hero: Eden] Lane Fortification: High shield generation and healing amplification that allows her to absorb poke and sustain partners in lane.'],
    weaknesses: ['[Hero: Eden] Low Early Pressure: Low base damage stats mean she cannot force early combat without falling behind.']
  },
  'feng-mao': {
    strengths: ['[Hero: Feng Mao] Reset-based Execute: High-mobility assassin whose ultimate resets its cooldown on kills, enabling rapid cleanups in teamfights.'],
    weaknesses: ['[Hero: Feng Mao] High Skill Floor: Requires precise execute timing; failing to secure the kill leaves him without a main damage tool.']
  },
  gadget: {
    strengths: ['[Hero: Gadget] Sticky Bomb Poke: Ability to attach homing sticky bombs from long range, forcing enemies to displace or take heavy magic damage.'],
    weaknesses: ['[Hero: Gadget] Vulnerable to Dive: Lacks instant escape tools, making her easy prey for high-mobility divers.']
  },
  gideon: {
    strengths: ['[Hero: Gideon] Black Hole Disruption: Devastating pull ultimate that locks multiple enemies in place, combined with a long-range teleport.'],
    weaknesses: ['[Hero: Gideon] Channeled Exposure: Ultimate forces him to remain stationary in the air, making him a prime target for stuns.']
  },
  greystone: {
    strengths: ['[Hero: Greystone] Cheat-Death Resurrection: Only hero capable of returning to life with partial health via his ultimate, forcing enemies to waste high-cooldown skills twice.'],
    weaknesses: ['[Hero: Greystone] No Hard CC: Lacks stuns, roots, or pulls, making it difficult for him to peel for squishy teammates.']
  },
  'grim-exe': {
    strengths: ['[Hero: Grim.exe] Magic Deflection: Spell shield that absorbs any single hostile ability and converts it to mana, letting him outplay heavy-cc initiations.'],
    weaknesses: ['[Hero: Grim.exe] Colossal Hitbox: Has the largest hitbox of any carry, making him exceptionally easy to hit with skillshots.']
  },
  grux: {
    strengths: ['[Hero: Grux] Bleed Dominance: Basic attacks apply stackable bleed damage, allowing him to win almost any extended close-quarters 1v1 duel.'],
    weaknesses: ['[Hero: Grux] Kiting Prey: Slow base movement speed makes him highly vulnerable to ranged carries once his dash is on cooldown.']
  },
  howitzer: {
    strengths: ['[Hero: Howitzer] Aerial Evasion: Ultimate launches him high into the air to rain missiles, doubling as a perfect escape over walls and terrain.'],
    weaknesses: ['[Hero: Howitzer] Bulky Caster: Unusually large physical profile for a mage, making him easier to target in teamfights.']
  },
  'iggy-scorch': {
    strengths: ['[Hero: Iggy & Scorch] Turret Fortification: Deploys multiple automated turrets that shred enemy waves and zone out areas, making them unrivaled in siege defense.'],
    weaknesses: ['[Hero: Iggy & Scorch] Total Immobility: Lacks any dashes, teleports, or movement speed buffs, making him an easy gank target if caught away from turrets.']
  },
  ikra: {
    strengths: ['[Hero: Ikra] Blood-Sustain Engagement: Passive health recovery scales with combat duration, allowing her to stay in high-intensity brawls longer.'],
    weaknesses: ['[Hero: Ikra] Anti-Heal Countered: Heavily countered by Tainted items, which cut her core survivability mechanism in half.']
  },
  kallari: {
    strengths: ['[Hero: Kallari] True Camouflage Stealth: Only hero capable of entering complete invisibility to stalk squishy targets and escape wards.'],
    weaknesses: ['[Hero: Kallari] Fragile Skeleton: Possesses one of the lowest base health pools in the game, leading to instant death if locked down.']
  },
  khaimera: {
    strengths: ['[Hero: Khaimera] Feral Health Regen: Basic attacks stack health regeneration per second, letting him solo major objectives like Fangtooth early in the game.'],
    weaknesses: ['[Hero: Khaimera] Point-of-No-Return: His leap is a target-only gap closer, meaning he has no escape abilities if a fight goes poorly.']
  },
  kira: {
    strengths: ['[Hero: Kira] Percentage True Damage: Basic attacks stack marks that explode for percentage true damage, bypassing armor items.'],
    weaknesses: ['[Hero: Kira] Short Carry Range: Lower basic attack range than other carries, forcing her to position closer to dangerous frontliners.']
  },
  kwang: {
    strengths: ['[Hero: Kwang] Sword Tether Lockdown: Can throw his sword to act as a remote anchor point, tethering multiple enemies and teleporting to them.'],
    weaknesses: ['[Hero: Kwang] Tether Reliance: Missing his sword throw deprives him of his gap-closer, crowd control, and major damage source.']
  },
  legion: {
    strengths: ['[Hero: Legion] Frontline Wall: Massive team shield utility and area stun capabilities that excel at protecting squishy carries.'],
    weaknesses: ['[Hero: Legion] Solo Weakness: Low base damage growth makes him completely non-threatening when separated from his team.']
  },
  'lt-belica': {
    strengths: ['[Hero: Lt. Belica] Anti-Mage Mana Drain: Deploys a drone that drains enemy mana and zaps them for casting, combined with an ultimate that executes based on missing mana.'],
    weaknesses: ['[Hero: Lt. Belica] Static Mage: Lacks movement mechanics, leaving her highly vulnerable to assassins if her knockup stun is avoided.']
  },
  maco: {
    strengths: ['[Hero: Maco] Bouncing Healing: Throws projectiles that bounce between allies and enemies, simultaneously healing friendly targets and damaging hostile ones.'],
    weaknesses: ['[Hero: Maco] Telegraphed Projectiles: Slow travel time on skills makes them highly predictable and easy to dodge at range.']
  },
  morigesh: {
    strengths: ['[Hero: Morigesh] Global Execute Mark: Can select a single target to "Mark", enabling her to trigger a global execute ultimate from anywhere on the map.'],
    weaknesses: ['[Hero: Morigesh] Danger Zone Range: Low ability range forces her to stand close to frontliners, exposing her to easy crowd control.']
  },
  mourn: {
    strengths: ['[Hero: Mourn] Bloodthirst Burst: Gathers health from bleeding targets, amplifying his physical damage when enemies are low.'],
    weaknesses: ['[Hero: Mourn] CC Lockdown: Lacks cleanse tools and is easily focused down if interrupted during his combat setups.']
  },
  murdock: {
    strengths: ['[Hero: Murdock] Global Armor-Bypassing Snipe: Ultimate shoots a laser across the entire map, passing through walls and ignoring 100% of enemy armor.'],
    weaknesses: ['[Hero: Murdock] Self-Peel Dependent: Only has a short knock-back shield and no dash, making him heavily dependent on support shields to survive dive.']
  },
  muriel: {
    strengths: ['[Hero: Muriel] Global Defensive Rescue: Can fly across the map to land directly on an ally, granting massive shields and knocking back attackers.'],
    weaknesses: ['[Hero: Muriel] Lacks Interrupts: Does not possess any stuns, silences, or roots to cancel channeled enemy abilities (like Gideon ultimate).']
  },
  narbash: {
    strengths: ['[Hero: Narbash] Mobile Healing Aura: Can toggle a continuous area heal-over-time while moving, sustaining his team through long sieges.'],
    weaknesses: ['[Hero: Narbash] Interrupted Performance: Ultimate is a channeled crowd control song that is completely canceled if hit by a stun.']
  },
  neon: {
    strengths: ['[Hero: Neon] Lock-on Laser Poke: Highly consistent single-target ability tracking that cannot be dodged once locked onto the enemy.'],
    weaknesses: ['[Hero: Neon] Fragile Sniper: Extremely vulnerable to flankers due to her lack of defensive stats or escape dashes.']
  },
  phase: {
    strengths: ['[Hero: Phase] Lifeline Pull: Can pull a linked ally directly to her location, saving teammates from certain death or bad positioning.'],
    weaknesses: ['[Hero: Phase] Co-dependent Kit: Entirely reliant on having a linked teammate; she is nearly useless when caught alone.']
  },
  rampage: {
    strengths: ['[Hero: Rampage] Enraged Bulk: Size and health regeneration skyrocket during his ultimate, making him the ultimate tower-diving tank.'],
    weaknesses: ['[Hero: Rampage] Telegraphed Stun: Stun rock requires a long, highly visible throwing wind-up, allowing enemies to easily dodge it at range.']
  },
  renna: {
    strengths: ['[Hero: Renna] Soul Harvest Scaling: Gathers souls from fallen enemies that permanently amplify her ability scaling, making her a powerhouse late game.'],
    weaknesses: ['[Hero: Renna] Slow Build-up: Highly vulnerable early game; falls behind quickly if shut down before collecting stacks.']
  },
  revenant: {
    strengths: ['[Hero: Revenant] Nether Realm Isolation: Ultimate pulls a target into a 1v1 dimension where they cannot receive help or shields from teammates.'],
    weaknesses: ['[Hero: Revenant] Reload Constraint: Limited to a 4-round chamber; fixed reload animation leaves him unable to deal damage for brief intervals.']
  },
  riktor: {
    strengths: ['[Hero: Riktor] Game-Changing Electro-Chain: Hook pulls an enemy from long range, enabling instant crowd-control chains (silence + AoE stun).'],
    weaknesses: ['[Hero: Riktor] High-Risk Hook: Hook has a high mana cost and long cooldown; missing it deprives his team of initiation capability.']
  },
  serath: {
    strengths: ['[Hero: Serath] Invulnerability Frame Dive: Melee carry who can dodge key enemy abilities by becoming briefly invulnerable while diving targets.'],
    weaknesses: ['[Hero: Serath] Melee Carry Exposure: Must stand in melee range to deal carry-level damage, exposing her to instant focus fires.']
  },
  sevarog: {
    strengths: ['[Hero: Sevarog] Siphon Infinite Scaling: Executes minions to gain permanent health and ability scaling, turning him into an unkillable behemoth late-game.'],
    weaknesses: ['[Hero: Sevarog] Stack Dependency: Extremely weak early game; failing to secure minion stacks makes him ineffective compared to other tanks.']
  },
  shinbi: {
    strengths: ['[Hero: Shinbi] Line Rhythm Dance: Can spam low-cooldown line abilities to stack damage marks on targets, triggering a massive remote execute ultimate.'],
    weaknesses: ['[Hero: Shinbi] Lacks Peel: Does not possess any stuns, silences, or roots, making her unable to peel for allies when playing defensively.']
  },
  skylar: {
    strengths: ['[Hero: Skylar] Flight Superiority: High aerial hover mobility that allows her to fire over obstacles and avoid melee threats.'],
    weaknesses: ['[Hero: Skylar] Air-CC Vulnerability: Hits from hard crowd control while airborne cause her to crash down, leaving her grounded and stunned.']
  },
  sparrow: {
    strengths: ['[Hero: Sparrow] Stackable Bow Shred: Passive increases basic attack damage with each consecutive hit on the same target, giving her unmatched tank-shredding DPS.'],
    weaknesses: ['[Hero: Sparrow] Absolute Zero Mobility: The only carry with no dashes, teleports, speed boosts, or self-peel CC, making positioning mistakes fatal.']
  },
  steel: {
    strengths: ['[Hero: Steel] Unrivaled Base Armor Growth: Possesses higher than average armor stats and growth compared to other tanks, making him exceptionally durable even without items.'],
    weaknesses: ['[Hero: Steel] Low Solo Threat: Poor basic attack scaling and low raw damage output make him heavily reliant on teammates to secure kills.']
  },
  terra: {
    strengths: ['[Hero: Terra] Unstoppable CC Immunity: Ultimate grants absolute immunity to all crowd control effects (stuns, roots, silences) for a brief duration.'],
    weaknesses: ['[Hero: Terra] Grounded Melee: Low base mobility leaves her easily kited when her CC-immunity ultimate is not active.']
  },
  'the-fey': {
    strengths: ['[Hero: The Fey] Teamfight Pull-in: Ultimate plant pulls multiple enemies into a single center point, enabling devastating AoE combos.'],
    weaknesses: ['[Hero: The Fey] Dive Target: Lacks any mobility or shielding abilities, making her an easy target for high-mobility divers.']
  },
  twinblast: {
    strengths: ['[Hero: Twinblast] Double-Tap Burst: Passive fires a double shot after every ability cast, giving him superior burst damage and rapid item-effect triggers.'],
    weaknesses: ['[Hero: Twinblast] Flat Health Deficit: Possesses a very low base health pool, making him highly susceptible to spellcaster burst.']
  },
  wraith: {
    strengths: ['[Hero: Wraith] Temporal Rewind: Can target an enemy to rewind their position back in time by 3 seconds, negating enemy escapes and dashes.'],
    weaknesses: ['[Hero: Wraith] High Precision Floor: Highly complex kit; missing his long-range snipe or mistiming his rewind severely penalizes his team.']
  },
  wukong: {
    strengths: ['[Hero: Wukong] Clone Split-Push: Basic attacks summon static clones that attack structures and waves, enabling unmatched split-pushing power.'],
    weaknesses: ['[Hero: Wukong] Lacks Immediate Burst: Does not possess any high-damage burst skills, relying purely on sustained basic attacks from clones.']
  },
  yin: {
    strengths: ['[Hero: Yin] Projectile Reflection: Can swing her whip to reflect enemy projectile abilities (including stuns) back at the attacker.'],
    weaknesses: ['[Hero: Yin] Range Penalty: Relies on an active skill to extend her whip range; without it, she is forced to fight in close melee range.']
  },
  yurei: {
    strengths: ['[Hero: Yurei] Shadow Step Ambush: Teleports behind marked targets to deal heavy physical burst damage and execute them.'],
    weaknesses: ['[Hero: Yurei] CC Fragility: Squishy melee assassin profile; dies quickly if hit by area-of-effect crowd control.']
  },
  zarus: {
    strengths: ['[Hero: Zarus] Gladiator Cage Duel: Ultimate spawns a closed arena that isolates a target; securing the kill inside permanently increases his physical power.'],
    weaknesses: ['[Hero: Zarus] Cage Obstruction: Arena walls are solid and can block or trap teammates if positioned poorly during teamfights.']
  },
  zinx: {
    strengths: ['[Hero: Zinx] Overwhelming Health Sustain: Possesses unmatched passive health regeneration and active combat healing, out-sustaining any other hero in long duels.'],
    weaknesses: ['[Hero: Zinx] Anti-Heal counter: Vulnerable to Tainted items, which cut her survivability by 40%.']
  }
}

function deriveItemOutliers(item: ItemDoc): { strengths: string[]; weaknesses: string[] } {
  // Check static list first
  const staticOut = ITEM_OUTLIERS[item.slug];
  if (staticOut) {
    return staticOut;
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const name = item.display_name || item.name || 'Item';
  const stats = item.stats || {};
  const price = item.total_price || item.price || 0;

  const hasPhysPower = (stats.physical_power || 0) > 0;
  const hasMagPower = (stats.magical_power || stats.energy_power || 0) > 0;
  const hasCrit = (stats.critical_chance || 0) > 0;
  const hasAttackSpeed = (stats.attack_speed || 0) > 0;
  const hasHaste = (stats.ability_haste || 0) > 0;
  const hasHealth = (stats.max_health || 0) > 0;
  const hasPhysArmor = (stats.physical_armor || 0) > 0;
  const hasMagArmor = (stats.magical_armor || 0) > 0;
  const hasPen = (stats.physical_penetration || stats.magical_penetration || stats.physical_armor_pen || stats.magical_armor_pen || 0) > 0;
  const hasVamp = (stats.lifesteal || stats.magical_lifesteal || stats.omnivamp || 0) > 0;

  // ─── Strengths (comparative, non-generic)
  if (hasPhysPower && stats.physical_power >= 50) {
    strengths.push(`[Item: ${name}] Heavy Hitter: Ranks among the highest raw physical power items, drastically increasing basic attack scaling.`);
  }
  if (hasMagPower && (stats.magical_power >= 90 || stats.energy_power >= 90)) {
    strengths.push(`[Item: ${name}] Apex Magic Scaling: Offers massive magical power to turn high-ratio abilities into devastating nukes.`);
  }
  if (hasCrit && hasAttackSpeed) {
    strengths.push(`[Item: ${name}] Carry Engine: Combines critical strike chance and attack speed, essential for rapid physical DPS scaling.`);
  }
  if (hasHealth && stats.max_health >= 350) {
    strengths.push(`[Item: ${name}] Colossal Bulk: Grants a massive raw health pool, making you exceptionally resilient against burst execution.`);
  }
  if (hasPhysArmor && stats.physical_armor >= 45) {
    strengths.push(`[Item: ${name}] Steel Wall: Provides top-tier physical armor, severely cutting incoming damage from physical carries.`);
  }
  if (hasMagArmor && stats.magical_armor >= 45) {
    strengths.push(`[Item: ${name}] Void Ward: Offers premium magical protection, shielding you against high-burst magic casters.`);
  }
  if (hasHaste && stats.ability_haste >= 20) {
    strengths.push(`[Item: ${name}] Spell Spammer: Delivers massive cooldown reduction, allowing you to recycle combat abilities continuously.`);
  }
  if (hasPen) {
    strengths.push(`[Item: ${name}] Armor Shredder: Integrates armor penetration, bypassing enemy defensive itemization to maintain damage relevancy.`);
  }
  if (hasVamp) {
    strengths.push(`[Item: ${name}] Combat Regeneration: Grants lifesteal/omnivamp, allowing you to sustain through prolonged skirmishes.`);
  }

  // Fallback strength if none matched
  if (strengths.length === 0) {
    strengths.push(`[Item: ${name}] Strategic Utility: Offers balanced hybrid stats to complete specific setups.`);
  }

  // ─── Weaknesses (focused on build-order, trade-offs, and agency)
  if (hasAttackSpeed && !hasPhysPower && !hasMagPower) {
    weaknesses.push(`[Item: ${name}] Underpowered Rush: Lacks raw physical or magical power, making it a poor choice for your first item slot.`);
  }
  
  if ((hasPhysPower || hasMagPower) && !hasHealth && !hasPhysArmor && !hasMagArmor) {
    weaknesses.push(`[Item: ${name}] Glass Cannon Trade-off: Offers zero durability stats, making you highly susceptible to being focused down.`);
  }

  if (hasHealth && !hasPhysPower && !hasMagPower) {
    weaknesses.push(`[Item: ${name}] Passive Sentinel: Sacrifices all scaling offensive threat to prioritize pure defensive survivability.`);
  }

  if (price >= 3100) {
    weaknesses.push(`[Item: ${name}] Premium Economy: High gold completion cost makes it a slow power spike if you fall behind.`);
  }

  if (hasCrit && !hasPhysPower) {
    weaknesses.push(`[Item: ${name}] Critical Dependency: Relies entirely on other physical power items in your build to make the critical hits deal impact.`);
  }

  // Fallback weakness if none matched
  if (weaknesses.length === 0) {
    weaknesses.push(`[Item: ${name}] Specialized Stats: Highly specialized for specific character builds and loses value in generic setups.`);
  }

  return { strengths, weaknesses };
}

const ITEM_OUTLIERS: Record<string, { strengths: string[]; weaknesses: string[] }> = {
  overlord: {
    strengths: ['[Item: Overlord] Giant Health Multiplier: Gaining permanent bonus health from minion executions enables heavy tank scaling compared to standard flat items.'],
    weaknesses: ['[Item: Overlord] Delayed Scaling: Low initial base health requires extensive farming before item viability is realized.']
  },
  'tainted-blade': {
    strengths: ['[Item: Tainted Blade] Healing Suppression: Specifically designed to counter regeneration/healing heroes (like Zinx/Khaimera), cutting their healing by 40%.'],
    weaknesses: ['[Item: Tainted Blade] Low Damage Floor: Sub-optimal base physical power value compared to other physical penetration items.']
  },
  'tainted-scepter': {
    strengths: ['[Item: Tainted Scepter] Anti-Heal Spellcaster: Inflicts healing reduction on ability damage, effectively shutting down regeneration setups during teamfights.'],
    weaknesses: ['[Item: Tainted Scepter] Lower Magic Burst: Sacrifices pure magic damage scaling compared to other high magical power items.']
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
    crit_chance: (itemStatsSum.crit_chance || 0) + (itemStatsSum.critical_chance || 0),
    lifesteal: itemStatsSum.lifesteal || 0,
    magical_lifesteal: itemStatsSum.magical_lifesteal || 0,
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

  // Basic Attack Power calculation matching pred.gg's method
  let basicAttackPower = totalStats.physical_power;
  if (hero.abilities && hero.abilities.length > 0) {
    const lmb = hero.abilities[0];
    const lmbMenuDesc = lmb.menu_description || '';
    const lmbGameDesc = lmb.game_description || '';
    const fullDesc = lmbMenuDesc + ' ' + lmbGameDesc;

    // 1. Try to find base damage per level array (18 values separated by slashes)
    let baseDamage = 0;
    const slashRegex = /(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?)){5,17}/; 
    const slashMatch = fullDesc.match(slashRegex);
    if (slashMatch) {
      const sequence = slashMatch[0];
      const values = sequence.split('/').map(v => parseFloat(v));
      const lvlIndex = Math.max(0, Math.min(values.length - 1, level - 1));
      baseDamage = values[lvlIndex];
    } else {
      const firstNumMatch = fullDesc.match(/dealing\s+(\d+(?:\.\d+)?)/i) || fullDesc.match(/(\d+(?:\.\d+)?)\s+physical/i);
      baseDamage = firstNumMatch ? parseFloat(firstNumMatch[1]) : 50;
    }

    // 2. Try to find the scaling percentage
    let scalingPct = 1.0; 
    const scalingMatch = fullDesc.match(/\(\s*\+\s*(\d+(?:\.\d+)?)%\s*\)/i) || fullDesc.match(/\+\s*(\d+(?:\.\d+)?)%/);
    if (scalingMatch) {
      scalingPct = parseFloat(scalingMatch[1]) / 100;
    }

    // 3. Check scaling type (Magical vs Physical)
    const isMagical = fullDesc.toLowerCase().includes('magical') || fullDesc.toLowerCase().includes('apiconblue');
    const power = isMagical ? (totalStats.magical_power || 0) : totalStats.physical_power;

    basicAttackPower = baseDamage + (power * scalingPct);
  }

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
      mobilitySkillVal += 2.0; // flat 2 points per mobility enhancing ability
    }
  }
  const baselineMs = baseStats.base_movement_speed || 350;
  const baseMobility = Math.min(10, (baselineMs / 100) + mobilitySkillVal);

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
    // Mobility items: percentage increases grant 0.5 points per 1%. Flat movement speed grants 1 per 100.
    if ((item.stats.movement_speed || 0) > 0) {
      // Assuming movement_speed on items might be a percentage (e.g., 5 for 5%) or flat (e.g., 30)
      if (item.stats.movement_speed < 20) {
        // likely a percentage
        itemDnaScore.mobility += item.stats.movement_speed * 0.5;
      } else {
        // flat
        itemDnaScore.mobility += item.stats.movement_speed / 100;
      }
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

  // 6. Strengths and Weaknesses
  const strengths: string[] = []
  const weaknesses: string[] = []

  // Eternal / Blessings
  if (eternal) {
    const eternalName = eternal.display_name || eternal.name;
    const eternalDesc = (eternal.description || '').toLowerCase();

    let strengthImpact = `[Eternal: ${eternalName}] Gameplay Impact: `;
    if (eternalDesc.includes('damage') || eternalDesc.includes('power') || eternalDesc.includes('penetration')) {
      strengthImpact += `Increases offensive capabilities, granting an edge in combat damage.`;
    } else if (eternalDesc.includes('health') || eternalDesc.includes('shield') || eternalDesc.includes('armor')) {
      strengthImpact += `Bolsters survivability, allowing you to sustain more incoming attacks.`;
    } else if (eternalDesc.includes('speed') || eternalDesc.includes('cooldown')) {
      strengthImpact += `Enhances utility and pacing, allowing for more frequent rotations or ability usage.`;
    } else {
      strengthImpact += `Provides unique tactical advantages based on its specific effects.`;
    }
    strengths.push(strengthImpact);
    
    // Minor Blessings
    if (options?.minorBlessings && options.minorBlessings.length > 0 && eternal.minor_blessings) {
      options.minorBlessings.forEach(blessingName => {
        const blessing = eternal.minor_blessings?.find(mb => mb.name === blessingName);
        if (!blessing) return;
        const blessingDesc = (blessing.description || '').toLowerCase();
        
        let bStrength = `[Blessing: ${blessing.name}] Edge: `;
        let bWeakness = `[Blessing: ${blessing.name}] Trade-off: `;

        let alternativesText = `alternative blessings`;
        if (eternal.minor_blessings && blessing.group) {
          const others = eternal.minor_blessings.filter(b => b.group === blessing.group && b.name !== blessing.name);
          if (others.length > 0) {
            alternativesText = `other blessings in ${blessing.group} (e.g., ${others.map(o => o.name).join(', ')})`;
          }
        }

        if (blessingDesc.includes('damage') || blessingDesc.includes('penetration')) {
          bStrength += `Enhances offensive threat and burst potential.`;
          bWeakness += `Sacrifices potential defensive or utility bonuses from ${alternativesText}.`;
        } else if (blessingDesc.includes('health') || blessingDesc.includes('armor') || blessingDesc.includes('sustain') || blessingDesc.includes('lifesteal')) {
          bStrength += `Improves durability and staying power in fights.`;
          bWeakness += `Results in slightly lower damage output compared to offensive bonuses from ${alternativesText}.`;
        } else {
          bStrength += `Provides a specialized utility benefit.`;
          bWeakness += `Passes up raw combat stats offered by ${alternativesText}.`;
        }
        
        strengths.push(bStrength);
        weaknesses.push(bWeakness);
      });
    }
  }

  const itemDna: BuildDna = {
    burst: clampVal(itemDnaScore.burst),
    sustain: clampVal(itemDnaScore.sustain),
    navy: undefined, // Wait, don't change other fields
    tankiness: clampVal(itemDnaScore.tankiness),
    scaling: clampVal(itemDnaScore.scaling),
    mobility: clampVal(itemDnaScore.mobility),
    utility: clampVal(itemDnaScore.utility),
    objective_damage: clampVal(itemDnaScore.objective_damage),
  } as any // Use as any to prevent strict matching of unused properties

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

  // Add predefined Hero outliers
  const heroOut = HERO_OUTLIERS[hero.slug];
  if (heroOut) {
    strengths.push(...heroOut.strengths);
    weaknesses.push(...heroOut.weaknesses);
  }

  // Add predefined/derived Item outliers for Tier 3 items and Legendary Crests
  for (const item of allEquippedItems) {
    const isFinalItem = item.tier === 3 || item.is_final_item || item.is_final_crest || item.slot_type === 'Crest';
    if (isFinalItem) {
      const itemOut = deriveItemOutliers(item);
      if (itemOut) {
        strengths.push(...itemOut.strengths);
        weaknesses.push(...itemOut.weaknesses);
      }
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
- Basic Attack Power: ${Math.round(basicAttackPower)}

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
    basicAttackPower,
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
