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
): MatchupAnalysisResult {
  // Helper to scan for dash/teleport/leap movement skills
  const hasMobilityAbilities = (h: HeroDoc) => {
    return h.abilities.some(ab => {
      const desc = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
      return desc.includes('dash') || desc.includes('teleport') || desc.includes('blink') || desc.includes('leap') || desc.includes('charge');
    });
  };

  // Helper to check for % health damage
  const hasPercentHealthDamage = (h: HeroDoc) => {
    return h.abilities.some(ab => {
      const desc = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
      return desc.includes('% max health') || desc.includes('% physical damage') || desc.includes('percent of health') || desc.includes('percentage of health');
    });
  };

  // Helper to check for AoE waveclear
  const hasAoEAbilities = (h: HeroDoc) => {
    return h.abilities.some(ab => {
      const desc = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
      return desc.includes('all enemies') || desc.includes('area') || desc.includes('nearby') || desc.includes('cleave') || desc.includes('radius');
    });
  };

  // Helper to check for crowd control (stuns/slows)
  const getCcCount = (h: HeroDoc) => {
    return h.abilities.filter(ab => {
      const desc = ((ab.menu_description || '') + ' ' + (ab.game_description || '')).toLowerCase();
      return desc.includes('slow') || desc.includes('stun') || desc.includes('root') || desc.includes('knock') || desc.includes('silence');
    }).length;
  };

  const isMeleeA = (heroA.base_stats.attack_range[0] || 1300) < 300;
  const isMeleeB = (heroB.base_stats.attack_range[0] || 1300) < 300;

  const hpA = analysisA.totalStats.max_health || 1000;
  const hpB = analysisB.totalStats.max_health || 1000;

  const hasChaseA = hasMobilityAbilities(heroA);
  const hasChaseB = hasMobilityAbilities(heroB);

  const hasPercentA = hasPercentHealthDamage(heroA);
  const hasPercentB = hasPercentHealthDamage(heroB);

  const penA = (analysisA.totalStats.physical_penetration || 0) + (analysisA.totalStats.magical_penetration || 0);
  const penB = (analysisB.totalStats.physical_penetration || 0) + (analysisB.totalStats.magical_penetration || 0);

  // 1. OFFENSIVE AXIS
  // Compares ability to apply offensive pressure and land a kill
  let offA = 5.0 + (analysisA.dna.burst * 0.3) + (analysisA.dna.mobility * 0.2);
  let offB = 5.0 + (analysisB.dna.burst * 0.3) + (analysisB.dna.mobility * 0.2);

  if (isMeleeA && hasChaseA) offA += 1.5;
  if (!isMeleeA) offA += 0.8;
  if (isMeleeB && hasChaseB) offB += 1.5;
  if (!isMeleeB) offB += 0.8;

  if (penA > 15) offA += 1.0;
  if (penB > 15) offB += 1.0;

  const clampValue = (val: number) => Math.max(1, Math.min(10, Math.round(val * 10) / 10));
  const finalOffA = clampValue(offA);
  const finalOffB = clampValue(offB);

  let offExplanation = `${heroA.display_name} is a ${isMeleeA ? 'melee' : 'ranged'} fighter with a mobility rating of ${analysisA.dna.mobility.toFixed(1)}/10. `;
  if (hasChaseA) {
    offExplanation += `They possess active movement abilities for chasing down targets. `;
  } else {
    offExplanation += `They lack dedicated gap-closing abilities to pursue fleeing foes. `;
  }

  if (hasPercentA) {
    offExplanation += `Additionally, they have % health damage tools, perfect for melting high HP targets like ${heroB.display_name}. `;
  } else {
    offExplanation += `They rely on flat damage, which excels at bursting low-health targets. `;
  }

  if (penA > 0) {
    offExplanation += `Their build incorporates armor/magic penetration to bypass opponent defenses. `;
  }

  offExplanation += `Conversely, ${heroB.display_name} operates as a ${isMeleeB ? 'melee' : 'ranged'} fighter with a mobility rating of ${analysisB.dna.mobility.toFixed(1)}/10. `;
  if (hasChaseB) {
    offExplanation += `They utilize gap-closers to pressure opponents. `;
  }
  if (hasPercentB) {
    offExplanation += `They also leverage % health damage in combat. `;
  }
  if (penB > 0) {
    offExplanation += `Their setup ignores a portion of defenses due to penetration. `;
  }

  // 2. DEFENSIVE AXIS
  // Compares ability to survive under pressure
  let defA = 4.0 + (analysisA.dna.tankiness * 0.4) + (analysisA.dna.mobility * 0.2);
  let defB = 4.0 + (analysisB.dna.tankiness * 0.4) + (analysisB.dna.mobility * 0.2);

  const ccCountA = getCcCount(heroA);
  const ccCountB = getCcCount(heroB);

  if (ccCountA > 1) defA += 1.0;
  if (ccCountB > 1) defB += 1.0;

  const finalDefA = clampValue(defA);
  const finalDefB = clampValue(defB);

  let defExplanation = `${heroA.display_name} defends with ${Math.round(hpA)} HP, a durability rating of ${analysisA.dna.tankiness.toFixed(1)}/10, and ${hasChaseA ? 'a dash/teleport' : 'limited movement'} to retreat. `;
  if (ccCountA > 0) {
    defExplanation += `They utilize ${ccCountA} stun/slow capability to disrupt attackers. `;
  }

  defExplanation += `${heroB.display_name} counters with ${Math.round(hpB)} HP, a durability rating of ${analysisB.dna.tankiness.toFixed(1)}/10, and ${hasChaseB ? 'dash/teleport tools' : 'minimal movement'} for escape. `;
  if (ccCountB > 0) {
    defExplanation += `They can apply ${ccCountB} crowd control elements to peel under pressure. `;
  }

  // 3. NEUTRAL AXIS
  // Compares passive play, lane clear, and objective control
  let neuA = 3.0 + (analysisA.dna.objective_damage * 0.3) + (analysisA.dna.scaling * 0.4);
  let neuB = 3.0 + (analysisB.dna.objective_damage * 0.3) + (analysisB.dna.scaling * 0.4);

  const hasAoEA = hasAoEAbilities(heroA);
  const hasAoEB = hasAoEAbilities(heroB);

  if (hasAoEA) neuA += 1.5;
  if (hasAoEB) neuB += 1.5;

  const finalNeuA = clampValue(neuA);
  const finalNeuB = clampValue(neuB);

  let neuExplanation = `${heroA.display_name} has a scaling index of ${analysisA.dna.scaling.toFixed(1)}/10, meaning they benefit ${analysisA.dna.scaling > 5 ? 'powerfully from passive scaling' : 'moderately from passive play'} as the game progresses. `;
  if (hasAoEA) {
    neuExplanation += `Their AoE abilities provide excellent lane control and minion wave clearing. `;
  } else {
    neuExplanation += `They lack high AoE, resulting in slower wave clear. `;
  }

  if (analysisA.dna.objective_damage > 3.0) {
    neuExplanation += `Their kit/build yields high bonus damage to monsters (Fangtooth/Prime). `;
  }

  neuExplanation += `On the other side, ${heroB.display_name} has a scaling index of ${analysisB.dna.scaling.toFixed(1)}/10. `;
  if (hasAoEB) {
    neuExplanation += `They utilize AoE options to sweep minion waves and contest lanes. `;
  }
  if (analysisB.dna.objective_damage > 3.0) {
    neuExplanation += `They also excel at taking down neutral objectives rapidly. `;
  }

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
