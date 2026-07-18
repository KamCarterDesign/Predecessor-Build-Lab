import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getFirestore } from '@/lib/firebase-admin';

interface CreatorProfileProps {
  creator: {
    username: string;
    isPremium: boolean;
  } | null;
  builds: any[];
  error?: string;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { username } = context.params as { username: string };
  try {
    const db = getFirestore();
    
    // In a real app, users would have a unique 'username' field.
    // For this prototype, we'll query by email prefix or simply show all builds shared by authorName.
    const buildsSnap = await db.collection('shared_builds')
      .where('authorName', '==', username)
      .orderBy('views', 'desc')
      .limit(20)
      .get();
      
    const builds = buildsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return {
      props: { 
        creator: { username, isPremium: true },
        builds: JSON.parse(JSON.stringify(builds)) 
      }
    };
  } catch (err) {
    console.error('Error fetching creator profile', err);
    return { props: { error: 'Error fetching profile', creator: null, builds: [] } };
  }
};

export default function CreatorProfilePage({ creator, builds, error }: CreatorProfileProps) {
  if (error || !creator) {
    return (
      <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>
        <h1>Error</h1>
        <p>{error || 'Creator not found'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', color: 'white', maxWidth: '1000px', margin: '0 auto' }}>
      <Head>
        <title>{creator.username}&apos;s Profile - Predecessor Labs</title>
      </Head>

      <div style={{ background: '#111827', borderRadius: '16px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
          {creator.username[0].toUpperCase()}
        </div>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>{creator.username}</h1>
          <div style={{ color: creator.isPremium ? '#eab308' : '#94a3b8', fontWeight: 'bold' }}>
            {creator.isPremium ? 'Premium Creator 🌟' : 'Community Member'}
          </div>
        </div>
      </div>

      <h2 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '24px' }}>
        Popular Builds by {creator.username}
      </h2>

      {builds.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>This creator hasn't shared any builds yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {builds.map((build) => (
            <a 
              key={build.id} 
              href={`/builds/${build.id}`}
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <h3 style={{ margin: '0 0 8px 0', color: '#3b82f6' }}>{build.name}</h3>
              <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '16px' }}>
                {build.heroName} • {build.role}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {build.items.slice(0, 3).map((item: string, i: number) => (
                  <span key={i} style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                    {item}
                  </span>
                ))}
                {build.items.length > 3 && (
                  <span style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                    +{build.items.length - 3}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
