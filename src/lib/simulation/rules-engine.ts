import { HeroDoc, ItemDoc, BuildDna, BuildAnalysisResult } from './engine'

export interface ExplanationResult {
  title: string
  context: string
  explanation: string
}

/**
 * Deterministically explains build decisions, DNA status changes, and matchup differences.
 */
export function explainDeterministic(
  contextType: 'item_added' | 'dna_change' | 'confidence_delta' | 'matchup_factor',
  data: {
    hero?: HeroDoc
    item?: ItemDoc
    beforeStats?: Record<string, number>
    afterStats?: Record<string, number>
    beforeDna?: BuildDna
    afterDna?: BuildDna
    dnaDimension?: keyof BuildDna
    confidenceDelta?: number
    confidenceReason?: string
    matchupFactor?: { name: string; value: number; description: string }
  }
): ExplanationResult {
  switch (contextType) {
    case 'item_added': {
      const item = data.item
      if (!item) {
        return {
          title: 'Item Modification',
          context: 'No item selected',
          explanation: 'Please select an item to view its statistical contributions.'
        }
      }

      const penA = (data.beforeStats?.physical_penetration || 0) + (data.beforeStats?.magical_penetration || 0)
      const penB = (data.afterStats?.physical_penetration || 0) + (data.afterStats?.magical_penetration || 0)
      const powerType = item.stats.physical_power ? 'Physical Power' : item.stats.magical_power ? 'Magical Power' : 'Hybrid Power'
      const powerVal = item.stats.physical_power || item.stats.magical_power || 0

      let explanation = `Adding **${item.display_name}** boosts your stats. `
      if (powerVal > 0) {
        explanation += `It increases your offensive potential by adding **+${powerVal} ${powerType}**. `
      }
      if (penB > penA) {
        explanation += `Additionally, your armor penetration rises from **${penA}** to **${penB}**, allowing you to bypass more enemy armor. `
      }
      if (item.effects && item.effects.length > 0) {
        explanation += `Unique passive effect **"${item.effects[0].name}"** is now active: ${item.effects[0].menu_description}`
      }

      return {
        title: `Item Added: ${item.display_name}`,
        context: 'Item Stat & Penetration Impact',
        explanation
      }
    }

    case 'dna_change': {
      const dim = data.dnaDimension || 'burst'
      const beforeVal = data.beforeDna?.[dim] ?? 0
      const afterVal = data.afterDna?.[dim] ?? 0
      const delta = afterVal - beforeVal

      let reasoning = ''
      if (dim === 'burst') {
        reasoning = 'your power, penetration, or critical strike chances were elevated.'
      } else if (dim === 'sustain') {
        reasoning = 'lifesteal, omnivamp, or health regeneration statistics were boosted.'
      } else if (dim === 'tankiness') {
        reasoning = 'your health, physical armor, or magical armor thresholds expanded.'
      } else if (dim === 'scaling') {
        reasoning = 'stack-accumulating passive behaviors or multipliers were introduced.'
      } else if (dim === 'mobility') {
        reasoning = 'movement speed boosts, passive velocity, or dash capabilities were added.'
      } else if (dim === 'utility') {
        reasoning = 'debuffs, anti-heal, stuns, or slow triggers became active.'
      } else {
        reasoning = 'item tags or specialized damage multipliers were equipped.'
      }

      return {
        title: `DNA Change: ${dim.replace('_', ' ').toUpperCase()}`,
        context: `Score shift: ${beforeVal.toFixed(1)} → ${afterVal.toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`,
        explanation: `This item shifts your build's **${dim.replace('_', ' ')}** rating from **${beforeVal.toFixed(1)}** to **${afterVal.toFixed(1)}** because ${reasoning}`
      }
    }

    case 'confidence_delta': {
      const delta = data.confidenceDelta || 0
      const reason = data.confidenceReason || 'Low synergy score or incomplete build slots.'

      return {
        title: 'Simulation Confidence Shift',
        context: `Confidence Delta: ${delta >= 0 ? '+' : ''}${delta}%`,
        explanation: `The simulation engine adjusted its confidence rating by **${delta}%** for this build. Reason: ${reason}`
      }
    }

    case 'matchup_factor': {
      const factor = data.matchupFactor
      if (!factor) {
        return {
          title: 'Matchup Advantage',
          context: 'No factor specified',
          explanation: 'Select a contributor to understand how the advantage score was computed.'
        }
      }

      return {
        title: `Matchup Advantage: ${factor.name}`,
        context: `Contribution: ${factor.value >= 0 ? '+' : ''}${factor.value} pts`,
        explanation: `${factor.description} This factor contributes **${factor.value >= 0 ? '+' : ''}${factor.value} points** towards your net matchup score.`
      }
    }

    default:
      return {
        title: 'Rules Engine Explanation',
        context: 'General',
        explanation: 'No further details available for this context.'
      }
  }
}
