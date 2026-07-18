import React, { useState } from 'react';
import { generateInsights, ImprovementInsight } from '@/lib/coaching/insights';

export const PlayerDashboard: React.FC = () => {
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [playerData, setPlayerData] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [heroes, setHeroes] = useState<any[]>([]);
  const [insights, setInsights] = useState<ImprovementInsight[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;
    
    setLoading(true);
    setError(null);
    setPlayerData(null);
    setMatches([]);
    setHeroes([]);
    setInsights([]);

    try {
      // 1. Fetch Player Data
      const playerRes = await fetch(`/api/omeda/player/${encodeURIComponent(searchName)}`);
      if (!playerRes.ok) throw new Error('Player not found or API error');
      const player = await playerRes.json();
      setPlayerData(player);

      // 2. Fetch Matches
      const matchesRes = await fetch(`/api/omeda/matches/${player.id}`);
      const matchesData = matchesRes.ok ? await matchesRes.json() : [];
      setMatches(matchesData);

      // 3. Fetch Heroes
      const heroesRes = await fetch(`/api/omeda/heroes/${player.id}`);
      const heroesData = heroesRes.ok ? await heroesRes.json() : [];
      setHeroes(heroesData);

      // 4. Generate Insights
      setInsights(generateInsights(matchesData, heroesData));

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '32px' }}>AI Coaching Dashboard</h2>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '40px' }}>
        <input 
          type="text" 
          placeholder="Enter Omeda.city Player Name..." 
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155', boxSizing: 'border-box' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Searching...' : 'Analyze'}
        </button>
      </form>

      {error && (
        <div style={{ textAlign: 'center', color: '#ef4444', padding: '20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          {error}
        </div>
      )}

      {playerData && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          
          {/* PLAYER OVERVIEW */}
          <div style={{ background: '#111827', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>{playerData.name}</h1>
              <div style={{ color: '#eab308', fontWeight: 'bold', fontSize: '1.2rem' }}>{playerData.rank || 'Unranked'}</div>
            </div>
            
            <div style={{ display: 'flex', gap: '32px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>MMR</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Math.round(playerData.mmr)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Win Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: playerData.winRate >= 0.5 ? '#10b981' : '#ef4444' }}>
                  {(playerData.winRate * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>KDA</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{playerData.kda?.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
            
            {/* MATCH HISTORY */}
            <div>
              <h3 style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Recent Matches</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {matches.slice(0, 10).map((match, i) => (
                  <div key={i} style={{ background: '#1e293b', borderLeft: `4px solid ${match.result === 'Victory' ? '#10b981' : '#ef4444'}`, borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', background: '#0f172a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                        {match.heroName}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: match.result === 'Victory' ? '#10b981' : '#ef4444' }}>{match.result}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{match.role || 'Unknown Role'}</div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold' }}>{match.kills} / <span style={{ color: '#ef4444' }}>{match.deaths}</span> / {match.assists}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>KDA: {((match.kills + match.assists) / Math.max(1, match.deaths)).toFixed(2)}</div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '4px', maxWidth: '150px', flexWrap: 'wrap' }}>
                      {match.items.slice(0, 6).map((item: any, idx: number) => (
                        <div key={idx} style={{ width: '24px', height: '24px', background: '#334155', borderRadius: '4px', fontSize: '10px', overflow: 'hidden', whiteSpace: 'nowrap' }} title={item.toString()}>
                          {/* Placeholder for item image */}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SIDEBAR: INSIGHTS & HEROES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* INSIGHTS ENGINE */}
              <div style={{ background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h3 style={{ color: '#3b82f6', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧠</span> Improvement Insights
                </h3>
                {insights.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Play more matches to generate insights.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {insights.map((insight, i) => (
                      <div key={i} style={{ 
                        background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem',
                        borderLeft: `3px solid ${insight.type === 'positive' ? '#10b981' : insight.type === 'warning' ? '#f59e0b' : '#3b82f6'}`
                      }}>
                        {insight.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TOP HEROES */}
              <div style={{ background: '#111827', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ marginTop: 0 }}>Top Played Heroes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {heroes.slice(0, 5).map((hero, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontWeight: 'bold' }}>{hero.name}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: hero.winRate >= 0.5 ? '#10b981' : '#ef4444' }}>{(hero.winRate * 100).toFixed(1)}% WR</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{hero.gamesPlayed} games</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
