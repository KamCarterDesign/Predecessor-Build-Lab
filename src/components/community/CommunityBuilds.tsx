import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase-client';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export const CommunityBuilds: React.FC = () => {
  const [builds, setBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchBuilds = async () => {
      try {
        const q = query(collection(db, 'shared_builds'), orderBy('score', 'desc'), limit(50));
        const snap = await getDocs(q);
        setBuilds(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching community builds', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBuilds();
  }, []);

  const handleVote = async (buildId: string, direction: 'up'|'down') => {
    // Optimistic UI update
    setBuilds(prev => prev.map(b => {
      if (b.id === buildId) {
        return { ...b, score: (b.score || 0) + (direction === 'up' ? 1 : -1) };
      }
      return b;
    }));

    try {
      await fetch('/api/builds/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildId, direction, uid: user?.uid || 'anonymous' }),
      });
    } catch (err) {
      console.error('Vote failed', err);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading top builds...</div>;

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '32px' }}>Community Builds</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {builds.map(build => (
          <div key={build.id} style={{ background: '#111827', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '16px' }}>
            
            {/* Voting Column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => handleVote(build.id, 'up')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }}
              >
                ▲
              </button>
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: (build.score || 0) > 0 ? '#10b981' : (build.score || 0) < 0 ? '#ef4444' : '#cbd5e1' }}>
                {build.score || 0}
              </span>
              <button 
                onClick={() => handleVote(build.id, 'down')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }}
              >
                ▼
              </button>
            </div>

            {/* Build Content */}
            <div style={{ flex: 1 }}>
              <a href={`/builds/${build.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 style={{ margin: '0 0 4px 0', color: '#3b82f6', fontSize: '1.2rem' }}>{build.name}</h3>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '12px' }}>
                  {build.heroName} • {build.role} • By <a href={`/creator/${build.authorName}`} style={{ color: '#eab308', textDecoration: 'none' }}>{build.authorName}</a>
                </div>
                
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {build.items?.map((item: string, i: number) => (
                    <span key={i} style={{ background: '#1e293b', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #334155' }}>
                      {item}
                    </span>
                  ))}
                  {build.crest && (
                    <span style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6' }}>
                      {build.crest}
                    </span>
                  )}
                </div>
              </a>
            </div>
          </div>
        ))}
        {builds.length === 0 && <div style={{ color: '#94a3b8', textAlign: 'center', gridColumn: '1 / -1' }}>No community builds found.</div>}
      </div>
    </div>
  );
};
