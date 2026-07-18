import { HeroDoc } from './engine';

export interface TeamDNA {
  burst: number;
  sustain: number;
  tankiness: number;
  scaling: number;
  mobility: number;
  utility: number;
  objective_damage: number;
}

export interface CompositionAnalysis {
  teamDna: TeamDNA;
  strengths: string[];
  weaknesses: string[];
  synergies: string[];
}

export function analyzeComposition(team: (HeroDoc | null)[]): CompositionAnalysis {
  const activeHeroes = team.filter(h => h !== null) as HeroDoc[];
  
  let teamDna: TeamDNA = {
    burst: 0, sustain: 0, tankiness: 0, scaling: 0, mobility: 0, utility: 0, objective_damage: 0
  };

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const synergies: string[] = [];

  if (activeHeroes.length === 0) {
    return { teamDna, strengths, weaknesses, synergies };
  }

  // Aggregate DNA (average across team)
  activeHeroes.forEach(h => {
    // In a real app, DNA would be precomputed or calculated based on base stats + default builds
    // Here we'll use a placeholder logic based on roles/classes for demonstration if dna isn't strictly defined
    const burstScore = h.classes.includes('Assassin') ? 9 : (h.classes.includes('Mage') ? 8 : 4);
    const sustainScore = h.classes.includes('Support') ? 8 : 4;
    const tankScore = h.classes.includes('Tank') ? 9 : (h.classes.includes('Fighter') ? 6 : 3);
    const scalingScore = h.classes.includes('Carry') ? 9 : 5;
    const mobilityScore = h.classes.includes('Assassin') ? 8 : 4;
    const utilityScore = h.classes.includes('Support') ? 9 : 3;
    const objScore = h.classes.includes('Carry') ? 9 : 4;

    teamDna.burst += burstScore;
    teamDna.sustain += sustainScore;
    teamDna.tankiness += tankScore;
    teamDna.scaling += scalingScore;
    teamDna.mobility += mobilityScore;
    teamDna.utility += utilityScore;
    teamDna.objective_damage += objScore;
  });

  // Average them out
  const numHeroes = activeHeroes.length;
  (Object.keys(teamDna) as (keyof TeamDNA)[]).forEach(key => {
    teamDna[key] = Number((teamDna[key] / numHeroes).toFixed(1));
  });

  // Strengths & Weaknesses rule engine
  if (teamDna.tankiness >= 7) strengths.push('High Frontline Presence (Very Tanky)');
  if (teamDna.tankiness < 4 && numHeroes >= 3) weaknesses.push('Squishy Composition (Lacks a solid frontline)');
  
  if (teamDna.burst >= 7) strengths.push('High Burst Damage (Great pick potential)');
  
  if (teamDna.utility >= 6) strengths.push('Strong Utility (Lots of CC and peel)');
  if (teamDna.utility < 4 && numHeroes >= 3) weaknesses.push('Low Utility/CC (Might struggle in teamfights)');
  
  if (teamDna.objective_damage >= 7) strengths.push('Fast Objective Takedowns (Fangtooth/Prime advantage)');
  if (teamDna.scaling < 5 && numHeroes >= 4) weaknesses.push('Weak Late Game (Needs to win early)');

  // Simple synergy flag
  const classes = activeHeroes.flatMap(h => h.classes);
  if (classes.includes('Tank') && classes.includes('Carry') && classes.includes('Support')) {
    synergies.push('Balanced Trinity (Tank, Carry, Support present)');
  }
  
  const mages = classes.filter(c => c === 'Mage').length;
  if (mages >= 2) synergies.push('Heavy Magic Damage (Force enemy to build magical armor)');

  return { teamDna, strengths, weaknesses, synergies };
}
