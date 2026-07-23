import React, { useState } from 'react'
import type { SavedBuild, SavedPost } from '@/types'

interface SavedCollectionViewProps {
  savedBuilds: SavedBuild[]
  savedPosts: SavedPost[]
  onLoadBuild: (build: SavedBuild) => void
  onDeleteBuild: (id: string) => void
  onToggleSavePost: (post: any) => void
  isPremium: boolean
  onOpenSubscriptionModal: () => void
}

export function SavedCollectionView({
  savedBuilds,
  savedPosts,
  onLoadBuild,
  onDeleteBuild,
  onToggleSavePost,
  isPremium,
  onOpenSubscriptionModal,
}: SavedCollectionViewProps) {
  const [savedTabSection, setSavedTabSection] = useState<'builds' | 'posts'>('builds')

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Sub-Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'white', fontFamily: 'var(--font-hud)', textTransform: 'uppercase' }}>YOUR SAVED COLLECTION</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Access your custom theorycrafting builds and bookmarked AI gameplay guides.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input)', padding: '4px', border: '1px solid var(--border-medium)' }}>
          <button
            onClick={() => setSavedTabSection('builds')}
            style={{
              padding: '8px 18px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
              fontFamily: 'var(--font-hud)',
              textTransform: 'uppercase',
              background: savedTabSection === 'builds' ? 'var(--accent-primary-container)' : 'transparent',
              color: savedTabSection === 'builds' ? 'white' : 'var(--text-muted)',
              transition: 'all var(--transition-fast)'
            }}
          >
            🧪 BUILDS ({savedBuilds.length})
          </button>
          <button
            onClick={() => setSavedTabSection('posts')}
            style={{
              padding: '8px 18px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
              fontFamily: 'var(--font-hud)',
              textTransform: 'uppercase',
              background: savedTabSection === 'posts' ? 'var(--accent-primary-container)' : 'transparent',
              color: savedTabSection === 'posts' ? 'white' : 'var(--text-muted)',
              transition: 'all var(--transition-fast)'
            }}
          >
            🔖 BOOKMARKS ({savedPosts.length})
          </button>
        </div>
      </div>

      {/* SECTION 1: SAVED BUILDS */}
      {savedTabSection === 'builds' && (
        <>
          {savedBuilds.length === 0 ? (
            <div className="card-glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🧪</div>
              <h3 style={{ color: 'white', marginTop: 0, fontFamily: 'var(--font-hud)' }}>NO SAVED BUILDS YET</h3>
              <p style={{ maxWidth: '400px', margin: '0 auto 16px auto', fontSize: '0.85rem' }}>Create a hero composition in the Theorycrafting Lab and click &apos;Save Build&apos; to keep it here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {savedBuilds.map((build) => (
                <div key={build.id} className="card-interactive" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: 'bold', fontFamily: 'var(--font-hud)' }}>{build.name}</h4>
                      <span className="badge badge-primary">
                        {build.role || 'Offlane'}
                      </span>
                    </div>

                    {build.description && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', margin: '0 0 12px 0', lineHeight: '1.4' }}>{build.description}</p>
                    )}

                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '4px', fontFamily: 'var(--font-hud)' }}>
                      HERO A: {build.heroName} (Lvl {build.level || 1})
                    </div>

                    {build.heroBName && (
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-secondary)', marginBottom: '4px', fontFamily: 'var(--font-hud)' }}>
                        HERO B (VS): {build.heroBName} (Lvl {build.levelB || 1})
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => onLoadBuild(build)}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                    >
                      LOAD INTO LAB 🧪
                    </button>

                    <button
                      onClick={() => onDeleteBuild(build.id)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                    >
                      DELETE 🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SECTION 2: SAVED POSTS */}
      {savedTabSection === 'posts' && (
        <>
          {savedPosts.length === 0 ? (
            <div className="card-glass" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔖</div>
              <h3 style={{ color: 'white', marginTop: 0, fontFamily: 'var(--font-hud)' }}>NO SAVED BOOKMARKS</h3>
              <p style={{ maxWidth: '400px', margin: '0 auto 16px auto', fontSize: '0.85rem' }}>Browse the Feed tab and bookmark AI gameplay posts to save them for quick reference.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {savedPosts.map((post) => (
                <div key={post.id} className="card-interactive" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <span className="badge badge-gold">
                      {post.category || 'Guide'}
                    </span>
                    <h4 style={{ margin: '10px 0 6px 0', fontSize: '1.05rem', color: 'white', fontFamily: 'var(--font-hud)' }}>{post.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', margin: 0, lineHeight: '1.4' }}>{post.summary}</p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-hud)' }}>BY {post.author || 'PREDECESSOR AI'}</span>
                    <button
                      onClick={() => onToggleSavePost(post)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.7rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                    >
                      REMOVE BOOKMARK 🔖
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
