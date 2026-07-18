import React, { useState, useMemo } from 'react';
import { HeroDoc } from '@/lib/simulation/engine';
import { analyzeComposition } from '@/lib/simulation/composition';

interface DraftBoardProps {
  heroes: HeroDoc[];
}

type DraftRole = 'Offlane' | 'Jungle' | 'Midlane' | 'Carry' | 'Support';
const ROLES: DraftRole[] = ['Offlane', 'Jungle', 'Midlane', 'Carry', 'Support'];

export const DraftBoard: React.FC<DraftBoardProps> = ({ heroes }) => {
  const [teamBlue, setTeamBlue] = useState<(HeroDoc | null)[]>([null, null, null, null, null]);
  const [teamRed, setTeamRed] = useState<(HeroDoc | null)[]>([null, null, null, null, null]);
  const [activeSlot, setActiveSlot] = useState<{ team: 'blue'|'red', index: number } | null>(null);
  const [search, setSearch] = useState('');

  const handleHeroSelect = (hero: HeroDoc) => {
    if (!activeSlot) return;
    if (activeSlot.team === 'blue') {
      const newTeam = [...teamBlue];
      newTeam[activeSlot.index] = hero;
      setTeamBlue(newTeam);
    } else {
      const newTeam = [...teamRed];
      newTeam[activeSlot.index] = hero;
      setTeamRed(newTeam);
    }
    setActiveSlot(null);
    setSearch('');
  };

  const filteredHeroes = heroes.filter(h => h.display_name.toLowerCase().includes(search.toLowerCase()));

  const blueAnalysis = useMemo(() => analyzeComposition(teamBlue), [teamBlue]);
  const redAnalysis = useMemo(() => analyzeComposition(teamRed), [teamRed]);

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '32px' }}>Draft Assistant</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: '32px' }}>
        {/* TEAM BLUE */}
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <h3 style={{ color: '#3b82f6', textAlign: 'center' }}>Team Blue</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {ROLES.map((role, i) => (
              <div 
                key={role} 
                onClick={() => setActiveSlot({ team: 'blue', index: i })}
                style={{ 
                  height: '60px', background: '#1e293b', borderRadius: '8px', border: activeSlot?.team === 'blue' && activeSlot.index === i ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', padding: '0 16px', cursor: 'pointer'
                }}
              >
                {teamBlue[i] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={teamBlue[i]?.image_url} alt="hero" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                    <span style={{ fontWeight: 'bold' }}>{teamBlue[i]?.display_name}</span>
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Select {role}...</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px' }}>
            <h4>Team Strengths</h4>
            <ul style={{ fontSize: '0.85rem', color: '#10b981', paddingLeft: '20px' }}>
              {blueAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
              {blueAnalysis.strengths.length === 0 && <li style={{ color: '#94a3b8' }}>Pick heroes to analyze...</li>}
            </ul>
            <h4>Team Weaknesses</h4>
            <ul style={{ fontSize: '0.85rem', color: '#ef4444', paddingLeft: '20px' }}>
              {blueAnalysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>

        {/* HERO SELECTOR */}
        <div style={{ background: '#111827', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ textAlign: 'center' }}>Hero Pool</h3>
          <input 
            type="text" 
            placeholder="Search heroes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155', marginBottom: '20px', boxSizing: 'border-box' }}
          />
          {!activeSlot ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>
              Click a slot on Team Blue or Team Red to select a hero.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {filteredHeroes.map(hero => (
                <div 
                  key={hero.slug} 
                  onClick={() => handleHeroSelect(hero)}
                  style={{ cursor: 'pointer', textAlign: 'center' }}
                >
                  <img src={hero.image_url} alt={hero.display_name} style={{ width: '60px', height: '60px', borderRadius: '8px', border: '2px solid transparent' }} />
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>{hero.display_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TEAM RED */}
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h3 style={{ color: '#ef4444', textAlign: 'center' }}>Team Red</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {ROLES.map((role, i) => (
              <div 
                key={role} 
                onClick={() => setActiveSlot({ team: 'red', index: i })}
                style={{ 
                  height: '60px', background: '#1e293b', borderRadius: '8px', border: activeSlot?.team === 'red' && activeSlot.index === i ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', padding: '0 16px', cursor: 'pointer'
                }}
              >
                {teamRed[i] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={teamRed[i]?.image_url} alt="hero" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                    <span style={{ fontWeight: 'bold' }}>{teamRed[i]?.display_name}</span>
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Select {role}...</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px' }}>
            <h4>Team Strengths</h4>
            <ul style={{ fontSize: '0.85rem', color: '#10b981', paddingLeft: '20px' }}>
              {redAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
              {redAnalysis.strengths.length === 0 && <li style={{ color: '#94a3b8' }}>Pick heroes to analyze...</li>}
            </ul>
            <h4>Team Weaknesses</h4>
            <ul style={{ fontSize: '0.85rem', color: '#ef4444', paddingLeft: '20px' }}>
              {redAnalysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
