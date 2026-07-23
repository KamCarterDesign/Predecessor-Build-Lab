import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getFirestore } from '@/lib/firebase-admin';
import { useState } from 'react';
import { DiscordShareModal } from '@/components/social/DiscordShareModal';

interface SharedBuildProps {
  build: any;
  error?: string;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { buildId } = context.params as { buildId: string };
  try {
    const db = getFirestore();
    const buildDoc = await db.collection('shared_builds').doc(buildId).get();
    
    if (!buildDoc.exists) {
      return { props: { error: 'Build not found' } };
    }

    return {
      props: { build: JSON.parse(JSON.stringify(buildDoc.data())) }
    };
  } catch (err) {
    return { props: { error: 'Error fetching build' } };
  }
};

export default function SharedBuildPage({ build, error }: SharedBuildProps) {
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);

  if (error) {
    return (
      <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://predecessorbuildlab.com';
  const canonicalUrl = `${siteUrl}/builds/${build.id || ''}`;
  const pageTitle = `${build.name} - ${build.heroName} Build | Predecessor Labs`;
  const pageDescription = build.description
    || `${build.heroName} ${build.role} build featuring ${build.items?.join(', ') || 'custom items'}. Created by ${build.authorName} on Predecessor Labs.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: build.name,
    description: pageDescription,
    author: { '@type': 'Person', name: build.authorName },
    publisher: { '@type': 'Organization', name: 'Predecessor Build Lab', url: siteUrl },
    url: canonicalUrl,
  };

  return (
    <div style={{ padding: '40px', color: 'white', maxWidth: '800px', margin: '0 auto' }}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />

        {/* OpenGraph Tags */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <div style={{ background: '#111827', borderRadius: '16px', padding: '32px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h1 style={{ marginTop: 0, color: '#3b82f6' }}>{build.name}</h1>
        <p style={{ color: '#94a3b8' }}>By {build.authorName}</p>
        
        {build.description && (
          <div style={{ margin: '24px 0', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <p style={{ margin: 0 }}>{build.description}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{build.heroName}</div>
            <div style={{ color: '#eab308' }}>{build.role}</div>
          </div>
        </div>

        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Items</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {build.items.map((itemSlug: string, i: number) => (
            <div key={i} style={{ background: '#1e293b', padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155' }}>
              {itemSlug}
            </div>
          ))}
        </div>

        {build.crest && (
          <>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Crest</h3>
            <div style={{ background: '#1e293b', padding: '8px 16px', borderRadius: '8px', border: '1px solid #3b82f6', display: 'inline-block', marginBottom: '24px' }}>
              {build.crest}
            </div>
          </>
        )}

        {build.augment && (
          <>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Selected Augment</h3>
            <div style={{ background: '#1e293b', padding: '8px 16px', borderRadius: '8px', border: '1px solid #10b981', display: 'inline-block', marginBottom: '24px' }}>
              {build.augment}
            </div>
          </>
        )}

        <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '16px' }}>
          <a href="/" style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'inline-block' }}>
            Open in Predecessor Labs
          </a>
          <button 
            onClick={() => setIsDiscordModalOpen(true)}
            style={{ padding: '12px 24px', background: '#5865F2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Share to Discord
          </button>
        </div>
      </div>

      <DiscordShareModal 
        isOpen={isDiscordModalOpen} 
        onClose={() => setIsDiscordModalOpen(false)} 
        build={build} 
      />
    </div>
  );
}
