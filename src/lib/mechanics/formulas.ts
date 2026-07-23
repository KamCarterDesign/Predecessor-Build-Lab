/**
 * Predecessor Game Mechanics Formula Utility Functions
 */

export interface ArmorPenetrationParams {
  /** Target's total base + bonus armor */
  targetArmor: number;
  /** Percent armor reduction applied to target (e.g. 0.20 for 20%) */
  pctArmorReduction?: number;
  /** Flat armor reduction applied to target */
  flatArmorReduction?: number;
  /** Attacker percent penetration (e.g. 0.30 for 30%) */
  pctPenetration?: number;
  /** Attacker flat penetration */
  flatPenetration?: number;
}

/**
 * Calculates effective armor after penetration order of operations:
 * 1. Percent Armor Reduction
 * 2. Flat Armor Reduction
 * 3. Percent Penetration
 * 4. Flat Penetration
 */
export function calculateEffectiveArmor(params: ArmorPenetrationParams): number {
  const {
    targetArmor,
    pctArmorReduction = 0,
    flatArmorReduction = 0,
    pctPenetration = 0,
    flatPenetration = 0,
  } = params;

  // Step 1: Percent Armor Reduction
  let armor = targetArmor * (1 - pctArmorReduction);
  // Step 2: Flat Armor Reduction
  armor -= flatArmorReduction;
  // Step 3: Percent Penetration
  armor *= 1 - pctPenetration;
  // Step 4: Flat Penetration
  armor -= flatPenetration;

  return Math.max(0, armor);
}

/**
 * Calculates actual damage taken after effective armor mitigation.
 * Formula: RawDamage * (100 / (EffectiveArmor + 100))
 */
export function calculateDamageReceived(rawDamage: number, effectiveArmor: number): number {
  if (effectiveArmor < 0) {
    // Handling bonus damage for negative armor if applicable, default standard floor
    return rawDamage * (100 / (effectiveArmor + 100));
  }
  return rawDamage * (100 / (effectiveArmor + 100));
}

/**
 * Calculates damage resistance percentage for a given armor value.
 */
export function calculateArmorResistancePct(effectiveArmor: number): number {
  if (effectiveArmor <= 0) return 0;
  return 1 - 100 / (100 + effectiveArmor);
}

/**
 * Calculates hero stat growth at a given hero level (1 through 18).
 * Level 1 = Base Stat
 * Level 2 = Base Stat + (StatGrowth * 0.80)
 * Scales by +2.5% per level (Level 10 = 100%, Level 18 = 120%)
 */
export function calculateStatForLevel(baseStat: number, statGrowth: number, level: number): number {
  const targetLevel = Math.max(1, Math.min(18, Math.floor(level)));
  if (targetLevel === 1) return baseStat;

  // Growth percentage starting at 80% at level 2 (+2.5% per level)
  const growthMultiplier = 0.80 + 0.025 * (targetLevel - 2);
  const totalGrowthGained = statGrowth * growthMultiplier * (targetLevel - 1);

  return baseStat + totalGrowthGained;
}

/**
 * Calculates CC duration after Tenacity mitigation.
 * Hard cap at 60% Tenacity (min duration = 40% of base duration).
 * Allows negative tenacity (increases CC duration).
 */
export function calculateTenacityDuration(baseDurationSec: number, tenacityPct: number): number {
  // Cap tenacity at max 60% (0.60)
  const effectiveTenacity = Math.min(0.60, tenacityPct);
  const duration = baseDurationSec * (1 - effectiveTenacity);
  return Math.max(0, duration);
}

/**
 * Calculates final Heal or Shield output accounting for Heal & Shield Power (HSP).
 * Formula: ((BaseAmount + (Power * ScalingPct)) * (1 + HSP))
 */
export function calculateHealShieldPower(
  baseAmount: number,
  power: number,
  scalingPct: number,
  hspPct: number
): number {
  const rawOutput = baseAmount + power * scalingPct;
  return Math.floor(rawOutput * (1 + hspPct));
}
