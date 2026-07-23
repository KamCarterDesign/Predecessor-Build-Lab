import React, { useState } from 'react'
import type { FeedFilter, SavedPost } from '@/types'

interface FeedViewProps {
  feedItems: any[]
  aiPosts: any[]
  ugcVideos: any[]
  officialNewsItems: any[]
  savedPosts: SavedPost[]
  onToggleSavePost: (post: any) => void
}

export function FeedView({
  feedItems,
  aiPosts,
  ugcVideos,
  officialNewsItems,
  savedPosts,
  onToggleSavePost,
}: FeedViewProps) {
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const [selectedAiPostModal, setSelectedAiPostModal] = useState<any | null>(null)

  const isSaved = (postId: string) => savedPosts.some((p) => p.id === postId)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Feed Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'white', fontFamily: 'var(--font-hud)', textTransform: 'uppercase' }}>COMMUNITY & STRATEGY FEED</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Official developer updates, AI strategy analysis, and community video guides.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input)', padding: '4px', border: '1px solid var(--border-medium)' }}>
          {[
            { id: 'all', label: 'ALL CONTENT' },
            { id: 'official', label: '📰 OFFICIAL NEWS' },
            { id: 'ai_posts', label: '🤖 AI STRATEGY' },
            { id: 'youtube', label: '🎥 VIDEO GUIDES' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFeedFilter(f.id as FeedFilter)}
              style={{
                padding: '6px 14px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.75rem',
                fontFamily: 'var(--font-hud)',
                textTransform: 'uppercase',
                background: feedFilter === f.id ? 'var(--accent-primary-container)' : 'transparent',
                color: feedFilter === f.id ? 'white' : 'var(--text-muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION: AI STRATEGY POSTS */}
      {(feedFilter === 'all' || feedFilter === 'ai_posts') && aiPosts.length > 0 && (
        <div>
          <h3 className="hud-label" style={{ color: 'white', fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🤖 AI STRATEGY GUIDES</span>
            <span className="badge badge-gold">DEEP DIVES</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {aiPosts.map((post) => (
              <div key={post.id} className="card-interactive" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <span className="badge badge-primary">
                    {post.category || 'Strategy'}
                  </span>
                  <h4 style={{ margin: '12px 0 6px 0', fontSize: '1.1rem', color: 'white', cursor: 'pointer', fontFamily: 'var(--font-hud)' }} onClick={() => setSelectedAiPostModal(post)}>
                    {post.title}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', margin: 0, lineHeight: '1.5' }}>{post.summary}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => setSelectedAiPostModal(post)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    READ GUIDE →
                  </button>

                  <button
                    onClick={() => onToggleSavePost(post)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                    title={isSaved(post.id) ? 'Remove bookmark' : 'Bookmark post'}
                  >
                    {isSaved(post.id) ? '🔖' : '📑'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: YOUTUBE VIDEO GUIDES */}
      {(feedFilter === 'all' || feedFilter === 'youtube') && ugcVideos.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h3 className="hud-label" style={{ color: 'white', fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🎥 COMMUNITY VIDEO GUIDES</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {ugcVideos.map((video) => (
              <div key={video.id} className="card-glass" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <iframe
                  width="100%"
                  height="180"
                  src={`https://www.youtube.com/embed/${video.videoId || video.id}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div style={{ padding: '14px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'white', lineHeight: '1.4', fontFamily: 'var(--font-hud)' }}>{video.title}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', fontFamily: 'var(--font-hud)' }}>{video.channelTitle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI POST MODAL VIEWER */}
      {selectedAiPostModal && (
        <div
          onClick={() => setSelectedAiPostModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-glass"
            style={{ borderRadius: '0px', width: '100%', maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto', padding: '32px', border: '1px solid var(--accent-primary-container)', borderTop: '3px solid var(--accent-secondary)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="badge badge-primary">
                {selectedAiPostModal.category || 'Guide'}
              </span>
              <button onClick={() => setSelectedAiPostModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', fontFamily: 'var(--font-hud)' }}>×</button>
            </div>
            <h2 style={{ color: 'white', marginTop: 0, fontSize: '1.6rem', fontFamily: 'var(--font-hud)' }}>{selectedAiPostModal.title}</h2>
            <div style={{ color: 'var(--text-subtle)', fontSize: '0.9rem', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {selectedAiPostModal.content || selectedAiPostModal.summary}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
