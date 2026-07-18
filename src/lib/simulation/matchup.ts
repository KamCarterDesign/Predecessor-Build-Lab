import { HeroDoc, BuildAnalysisResult } from './engine'

export interface MatchupAxis {
  heroAValue: number
  heroBValue: number
  explanation: string
}

export interface MatchupAnalysisResult {
  offensive: MatchupAxis
  defensive: MatchupAxis
  neutral: MatchupAxis
}

export function calculateMatchupScore(
  heroA: HeroDoc,
  analysisA: BuildAnalysisResult,
  heroB: HeroDoc,
  analysisB: BuildAnalysisResult
): any {
  // Helper to scan for dash/teleport movement skills
  const hasMobilityAbilities = (h: HeroDoc) => {
    return h.abilities.some(ab => {
      const desc = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
      return desc.includes('dash') || desc.includes('teleport') || desc.includes('blink') || desc.includes('leap');
    });
  };

  // Helper to check for % health damage
  const hasPercentHealthDamage = (h: HeroDoc) => {
    return h.abilities.some(ab => {
      const desc = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
      return desc.includes('% max health') || desc.includes('% physical damage') || desc.includes('percent of health');
    });
  };

  // Helper to check for AoE waveclear
  const hasAoEAbilities = (h: HeroDoc) => {
    return h.abilities.some(ab => {
      const desc = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
      return desc.includes('all enemies') || desc.includes('area') || desc.includes('nearby') || desc.includes('cleave') || desc.includes('radius');
    });
  };

  // 1. OFFENSIVE AXIS
  // Ability to apply offensive pressure and land a kill.
  // Factors: Melee vs Ranged, Health pools, and movement chasing capabilities.
  const isMeleeA = (heroA.base_stats.attack_range[0] || 1300) < 300;
  const isMeleeB = (heroB.base_stats.attack_range[0] || 1300) < 300;
  
  // Base values
  let offA = 5.0 + (analysisA.dna.burst * 0.3) + (analysisA.dna.mobility * 0.2);
  let offB = 5.0 + (analysisB.dna.burst * 0.3) + (analysisB.dna.mobility * 0.2);

  // Melee fighters closing gaps or ranged poke pressure
  if (isMeleeA && hasMobilityAbilities(heroA)) offA += 1.5;
  if (!isMeleeA) offA += 0.8; // ranged poke pressure
  if (isMeleeB && hasMobilityAbilities(heroB)) offB += 1.5;
  if (!isMeleeB) offB += 0.8;

  // Pen and % HP multipliers
  if (analysisA.totalStats.physical_penetration > 20 || analysisA.totalStats.magical_penetration > 15) offA += 1.0;
  if (analysisB.totalStats.physical_penetration > 20 || analysisB.totalStats.magical_penetration > 15) offB += 1.0;

  const clampValue = (val: number) => Math.max(1, Math.min(10, Math.round(val * 10) / 10));
  const finalOffA = clampValue(offA);
  const finalOffB = clampValue(offB);

  // Offensive explanation
  let offExplanation = '';
  if (finalOffA > finalOffB) {
    offExplanation = `${heroA.display_name} holds the offensive advantage. `;
  } else if (finalOffB > finalOffA) {
    offExplanation = `${heroB.display_name} holds the offensive advantage. `;
  } else {
    offExplanation = `Both heroes show equal offensive pressure. `;
  }
  offExplanation += `${heroA.display_name} is a ${isMeleeA ? 'melee' : 'ranged'} fighter with a mobility rating of ${analysisA.dna.mobility.toFixed(1)}/10. `;
  if (hasMobilityAbilities(heroA)) {
    offExplanation += `They possess gap-closing/chasing abilities. `;
  }
  if (analysisA.totalStats.physical_penetration > 0 || analysisA.totalStats.magical_penetration > 0) {
    offExplanation += `Their build incorporates penetration/armor ignore, allowing them to bypass defense. `;
  }
  if (hasPercentHealthDamage(heroA)) {
    offExplanation += `Additionally, they have % health damage tools, perfect against tanky targets. `;
  }
  offExplanation += `Conversely, ${heroB.display_name} relies on a ${isMeleeB ? 'melee' : 'ranged'} playstyle with a mobility rating of ${analysisB.dna.mobility.toFixed(1)}/10.`;

  // 2. DEFENSIVE AXIS
  // Ability to survive under pressure.
  // Factors: Movement capabilities, health pool, and skills causing stuns/slows (utility).
  let defA = 4.0 + (analysisA.dna.tankiness * 0.4) + (analysisA.dna.mobility * 0.2);
  let defB = 4.0 + (analysisB.dna.tankiness * 0.4) + (analysisB.dna.mobility * 0.2);

  // CC skills help defense
  if (analysisA.dna.utility > 5.0) defA += 1.5;
  if (analysisB.dna.utility > 5.0) defB += 1.5;

  const finalDefA = clampValue(defA);
  const finalDefB = clampValue(defB);

  let defExplanation = '';
  if (finalDefA > finalDefB) {
    defExplanation = `${heroA.display_name} is more resilient under pressure. `;
  } else if (finalDefB > finalDefA) {
    defExplanation = `${heroB.display_name} is more resilient under pressure. `;
  } else {
    defExplanation = `Both heroes show comparable defensive capabilities. `;
  }
  defExplanation += `${heroA.display_name} possesses ${Math.round(analysisA.totalStats.max_health)} HP, ${analysisA.dna.utility.toFixed(1)}/10 utility (crowd control stuns/slows), and ${hasMobilityAbilities(heroA) ? 'a dash/teleport' : 'limited movement abilities'} for retreat. `;
  defExplanation += `${heroB.display_name} has ${Math.round(analysisB.totalStats.max_health)} HP, with a utility rating of ${analysisB.dna.utility.toFixed(1)}/10.`;

  // 3. NEUTRAL AXIS
  // Passive play, objective control (monster/minions), and lane clear.
  // Factors: AoE abilities (waveclear), objective damage, scaling (benefit of playing neutral).
  let neuA = 3.0 + (analysisA.dna.objective_damage * 0.3) + (analysisA.dna.scaling * 0.4);
  let neuB = 3.0 + (analysisB.dna.objective_damage * 0.3) + (analysisB.dna.scaling * 0.4);

  if (hasAoEAbilities(heroA)) neuA += 1.5;
  if (hasAoEAbilities(heroB)) neuB += 1.5;

  const finalNeuA = clampValue(neuA);
  const finalNeuB = clampValue(neuB);

  let neuExplanation = '';
  if (finalNeuA > finalNeuB) {
    neuExplanation = `${heroA.display_name} is highly effective in neutral play, wave clearing, and objective fights. `;
  } else if (finalNeuB > finalNeuA) {
    neuExplanation = `${heroB.display_name} is highly effective in neutral play, wave clearing, and objective fights. `;
  } else {
    neuExplanation = `Both heroes perform similarly in passive laning and objective control. `;
  }
  neuExplanation += `${heroA.display_name} has a scaling index of ${analysisA.dna.scaling.toFixed(1)}/10, making neutral passive play ${analysisA.dna.scaling > 5.0 ? 'extremely beneficial' : 'moderate'} for late-game. `;
  if (hasAoEAbilities(heroA)) {
    neuExplanation += `Their AoE abilities provide excellent lane control and minion wave clearing. `;
  }
  if (analysisA.dna.objective_damage > 3.0) {
    neuExplanation += `Their build/kit provides high bonus damage to monsters (Fangtooth/Prime). `;
  }
  neuExplanation += `${heroB.display_name} has a scaling index of ${analysisB.dna.scaling.toFixed(1)}/10.`;

  return {
    offensive: {
      heroAValue: finalOffA,
      heroBValue: finalOffB,
      explanation: offExplanation,
    },
    defensive: {
      heroAValue: finalDefA,
      heroBValue: finalDefB,
      explanation: defExplanation,
    },
    neutral: {
      heroAValue: finalNeuA,
      heroBValue: finalNeuB,
      explanation: neuExplanation,
    },
  }
}
