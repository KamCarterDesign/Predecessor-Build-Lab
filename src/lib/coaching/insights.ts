export interface ImprovementInsight {
  type: 'positive' | 'warning' | 'neutral';
  message: string;
}

export function generateInsights(matches: any[], heroes: any[]): ImprovementInsight[] {
  const insights: ImprovementInsight[] = [];
  
  if (!matches || matches.length === 0) return insights;

  // 1. Recent Win Rate Trend
  const recent10 = matches.slice(0, 10);
  const wins = recent10.filter(m => m.result === 'Victory').length;
  const recentWinRate = (wins / recent10.length) * 100;

  if (recentWinRate >= 60) {
    insights.push({ type: 'positive', message: `Great recent form! You've won ${wins} of your last ${recent10.length} matches.` });
  } else if (recentWinRate <= 40) {
    insights.push({ type: 'warning', message: `Rough streak lately (${wins}W - ${recent10.length - wins}L). Try taking a break or reviewing your replays.` });
  }

  // 2. Role Specialization
  const roleCounts: Record<string, number> = {};
  const roleWins: Record<string, number> = {};
  
  recent10.forEach(m => {
    if (!m.role) return;
    roleCounts[m.role] = (roleCounts[m.role] || 0) + 1;
    if (m.result === 'Victory') {
      roleWins[m.role] = (roleWins[m.role] || 0) + 1;
    }
  });

  const roles = Object.keys(roleCounts);
  if (roles.length > 0) {
    const mostPlayedRole = roles.reduce((a, b) => roleCounts[a] > roleCounts[b] ? a : b);
    const mostPlayedWinRate = (roleWins[mostPlayedRole] || 0) / roleCounts[mostPlayedRole];

    if (mostPlayedWinRate < 0.5 && roleCounts[mostPlayedRole] >= 3) {
      insights.push({ type: 'warning', message: `You are struggling slightly on ${mostPlayedRole} recently (${Math.round(mostPlayedWinRate * 100)}% WR). Consider pivoting to your secondary role.` });
    }
  }

  // 3. Hero Death Analysis
  const highDeathMatches = recent10.filter(m => m.deaths >= 7);
  if (highDeathMatches.length >= 3) {
    insights.push({ type: 'warning', message: `You've had 7+ deaths in ${highDeathMatches.length} of your last 10 games. Focus on positioning and map awareness.` });
  }

  return insights;
}

// In a real app, metaData would be fetched from the actual meta snapshot API.
export function compareBuildToMeta(heroName: string, items: string[], metaData: any[]): ImprovementInsight | null {
  // Mock logic: If the hero has a known meta build and the player diverges heavily
  const metaItem = metaData.find(m => m.heroName === heroName);
  if (metaItem) {
    const missingCore = metaItem.coreItems.filter((i: string) => !items.includes(i));
    if (missingCore.length > 0) {
      return { 
        type: 'warning', 
        message: `In your recent ${heroName} game, you skipped ${missingCore.join(', ')} which appear in 80%+ of top builds.` 
      };
    } else {
      return {
        type: 'positive',
        message: `Your ${heroName} build matches top meta trends perfectly!`
      };
    }
  }
  return null;
}
