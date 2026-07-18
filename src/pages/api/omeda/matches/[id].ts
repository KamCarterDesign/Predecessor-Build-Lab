import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid player ID' });
  }

  try {
    const response = await fetch(`https://omeda.city/players/${id}/matches.json`);
    if (!response.ok) throw new Error('Failed to fetch matches');
    
    const matchesData = await response.json();
    
    // Transform match data to extract only relevant fields for coaching UI
    const matches = matchesData.map((match: any) => ({
      id: match.id,
      heroName: match.hero?.name || 'Unknown',
      result: match.win ? 'Victory' : 'Defeat',
      kills: match.kills,
      deaths: match.deaths,
      assists: match.assists,
      role: match.role,
      items: match.inventory_data ? Object.values(match.inventory_data).filter(Boolean) : [], // This API usually returns item IDs or names in inventory_data
      createdAt: match.created_at
    }));

    res.status(200).json(matches);
  } catch (err: any) {
    console.error('Omeda Matches Proxy Error:', err);
    res.status(500).json({ error: err.message });
  }
}
