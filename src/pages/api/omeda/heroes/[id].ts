import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid player ID' });
  }

  try {
    const response = await fetch(`https://omeda.city/players/${id}/hero_statistics.json`);
    if (!response.ok) throw new Error('Failed to fetch hero statistics');
    
    const heroesData = await response.json();
    
    // Sort by games played to get most played heroes
    const sortedHeroes = heroesData.hero_statistics
      .sort((a: any, b: any) => b.games_played - a.games_played)
      .slice(0, 10);

    const heroes = sortedHeroes.map((hero: any) => ({
      name: hero.hero_name,
      gamesPlayed: hero.games_played,
      winRate: hero.win_rate,
      kda: hero.kda
    }));

    res.status(200).json(heroes);
  } catch (err: any) {
    console.error('Omeda Hero Stats Proxy Error:', err);
    res.status(500).json({ error: err.message });
  }
}
