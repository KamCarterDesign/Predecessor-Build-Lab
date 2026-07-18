import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid player name' });
  }

  try {
    // 1. Search for player by name
    const searchRes = await fetch(`https://omeda.city/players.json?filter[name]=${encodeURIComponent(name)}`);
    if (!searchRes.ok) throw new Error('Failed to fetch player search');
    const searchData = await searchRes.json();

    if (!searchData || searchData.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = searchData[0]; // Take the first match
    const playerId = player.id;

    // 2. Fetch detailed statistics
    const statsRes = await fetch(`https://omeda.city/players/${playerId}/statistics.json`);
    if (!statsRes.ok) throw new Error('Failed to fetch player stats');
    const statsData = await statsRes.json();

    // Combine and return
    res.status(200).json({
      id: playerId,
      name: player.display_name || player.name,
      rank: statsData.rank_title,
      mmr: statsData.mmr,
      winRate: statsData.win_rate,
      kda: statsData.kda,
      gamesPlayed: statsData.games_played
    });
  } catch (err: any) {
    console.error('Omeda API Proxy Error:', err);
    res.status(500).json({ error: err.message });
  }
}
