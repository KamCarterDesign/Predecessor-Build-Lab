import React, { useState, useEffect } from 'react'
import type { SavedPost, TabId } from '@/types'

interface HomeViewProps {
  posts: any[]
  ugcVideos: any[]
  homeSettings?: {
    featuredPostIds?: string[]
    customCtaText?: string
    customCtaUrl?: string
    featuredVideos?: any[]
  }
  savedPosts: SavedPost[]
  onToggleSavePost: (post: any) => void
  setActiveTab: (tab: TabId) => void
}

export function HomeView({
  posts,
  ugcVideos,
  homeSettings,
  savedPosts,
  onToggleSavePost,
  setActiveTab,
}: HomeViewProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [selectedPostModal, setSelectedPostModal] = useState<any | null>(null)

  // Determine featured slides (from posts or fallback mock post)
  const configuredFeaturedIds = homeSettings?.featuredPostIds || []
  const configuredFeaturedPosts = posts.filter((p) => configuredFeaturedIds.includes(p.id))
  
  const fallbackSlides = [
    {
      id: 'serath-guide-fallback',
      title: 'MASTERING THE OFF-LANE: SERATH REBORN',
      summary: 'Unlock the true potential of the celestial warrior. We break down the new item rework and optimal rotational patterns for high-elo play.',
      category: 'Hero Guide',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      highlights: ['New crit curves analyzed', 'Counter-building the tank meta']
    },
    {
      id: 'meta-report-fallback',
      title: 'V0.18 META REPORT: MIDLANE DOMINANCE',
      summary: 'Gideon winrate spikes 5% while Support rotations decline. Analyze key midlane item power spikes in patch v0.18.',
      category: 'Meta',
      imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      highlights: ['Gideon winrate spikes 5%', 'The decline of Support rotations']
    }
  ]

  const featuredSlides = configuredFeaturedPosts.length > 0 ? configuredFeaturedPosts : fallbackSlides
  const activeSlide = featuredSlides[currentSlideIndex % featuredSlides.length]

  // Auto-slide effect
  useEffect(() => {
    if (featuredSlides.length <= 1) return
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % featuredSlides.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [featuredSlides.length])

  // Get 3 latest posts for "Latest News" section
  const latestPosts = posts.slice(0, 3).length > 0 ? posts.slice(0, 3) : [
    {
      id: 'post-1',
      title: 'TwinBlast 1.0 Itemization Guide',
      summary: 'Comprehensive analysis of attack speed and crit scaling on TwinBlast.',
      category: 'Hero Guide',
      highlights: ['New crit curves analyzed', 'Counter-building the tank meta'],
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      duration: '14:22'
    },
    {
      id: 'post-2',
      title: 'V0.18 Meta Report: Midlane',
      summary: 'Deep dive into midlane mage priorities and objective control.',
      category: 'Meta',
      highlights: ['Gideon winrate spikes 5%', 'The decline of Support rotations'],
      imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'post-3',
      title: 'The Invisible Menace: Kallari',
      summary: 'Optimized jungle pathing for level 2 ganks and ward placement.',
      category: 'Hero Guide',
      highlights: ['Jungle pathing for level 2 ganks', 'Essential warding locations'],
      imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80'
    }
  ]

  // Featured videos list
  const videoList = homeSettings?.featuredVideos && homeSettings.featuredVideos.length > 0 
    ? homeSettings.featuredVideos 
    : ugcVideos.length > 0 
      ? ugcVideos 
      : [
          { id: 'v1', videoId: '5qap5aO4i9A', title: 'TwinBlast Max DPS Build Guide', channelTitle: 'Predecessor Hub' },
          { id: 'v2', videoId: 'dQw4w9WgXcQ', title: 'Patch 0.18 Tier List & Rotation Guide', channelTitle: 'Meta Breakdown' }
        ]

  const isSaved = (postId: string) => savedPosts.some((p) => p.id === postId)
  const customCtaText = homeSettings?.customCtaText || 'SAVE BUILD FOR LATER'

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '48px' }}>
      
      {/* ── 1. HERO BANNER SLIDER ───────────────────────────────────────────── */}
      <section style={{ position: 'relative' }}>
        <div style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          minHeight: '380px',
          background: 'linear-gradient(135deg, rgba(16, 24, 48, 0.95), rgba(30, 20, 60, 0.95))',
          border: '1px solid rgba(157, 124, 255, 0.2)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 48px',
        }}>
          {/* Top Gold Accent Line Indicator */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '48px',
            width: '80px',
            height: '4px',
            background: 'linear-gradient(90deg, #ffd700, #ff9900)',
            borderRadius: '0 0 4px 4px'
          }} />

          {/* Background Graphic / Color Block Fallback */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: activeSlide?.imageUrl ? `url(${activeSlide.imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.25,
            filter: 'blur(2px)',
            zIndex: 0,
          }} />

          {/* Banner Content Container */}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '650px' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: 'white',
              fontFamily: 'var(--font-hud)',
              letterSpacing: '0.02em',
              margin: '0 0 16px 0',
              lineHeight: '1.15',
              textTransform: 'uppercase',
              textShadow: '0 4px 20px rgba(0,0,0,0.8)'
            }}>
              {activeSlide.title}
            </h1>

            <p style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6',
              margin: '0 0 32px 0',
              fontFamily: 'var(--font-body)'
            }}>
              {activeSlide.summary}
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {/* Primary CTA */}
              <button
                onClick={() => setSelectedPostModal(activeSlide)}
                style={{
                  background: 'linear-gradient(90deg, #9d7cff, #b59bff)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-hud)',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(157, 124, 255, 0.4)',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                VIEW FULL GUIDE
              </button>

              {/* Custom Optional Secondary CTA */}
              <button
                onClick={() => {
                  if (homeSettings?.customCtaUrl) {
                    window.open(homeSettings.customCtaUrl, '_blank')
                  } else {
                    onToggleSavePost(activeSlide)
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffd700',
                  border: '1px solid rgba(255, 215, 0, 0.4)',
                  padding: '14px 28px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-hud)',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.15)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {customCtaText}
              </button>
            </div>
          </div>

          {/* Slider Pagination Controls */}
          {featuredSlides.length > 1 && (
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '8px', marginTop: '24px' }}>
              {featuredSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  style={{
                    width: idx === currentSlideIndex ? '32px' : '10px',
                    height: '6px',
                    borderRadius: '3px',
                    background: idx === currentSlideIndex ? '#9d7cff' : 'rgba(255, 255, 255, 0.3)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 2. FEATURED YOUTUBE VIDEOS CAROUSEL ──────────────────────────────── */}
      {videoList.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '1.2rem', color: '#ff4d4d' }}>🎥</span>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'white', fontFamily: 'var(--font-hud)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              FEATURED VIDEO GUIDES
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {videoList.slice(0, 4).map((video: any) => (
              <div 
                key={video.id || video.videoId} 
                style={{
                  background: 'rgba(16, 24, 48, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(157, 124, 255, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
              >
                <iframe
                  width="100%"
                  height="190"
                  src={`https://www.youtube.com/embed/${video.videoId || video.id}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div style={{ padding: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'white', fontWeight: 700, fontFamily: 'var(--font-hud)', lineHeight: '1.4' }}>
                    {video.title}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '6px', display: 'block', fontFamily: 'var(--font-hud)' }}>
                    {video.channelTitle || 'Community Creator'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. LATEST NEWS SECTION ───────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#ffd700', fontSize: '1.2rem' }}>✨</span>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'white', fontFamily: 'var(--font-hud)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              LATEST NEWS
            </h2>
          </div>

          <button
            onClick={() => setActiveTab('feed')}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: 'var(--font-hud)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#9d7cff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
          >
            View All Guides →
          </button>
        </div>

        {/* 3 Posts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {latestPosts.map((post) => (
            <div
              key={post.id}
              style={{
                background: 'rgba(16, 24, 48, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.borderColor = 'rgba(157, 124, 255, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
              }}
            >
              {/* Card Image Thumbnail */}
              <div style={{ position: 'relative', height: '180px', background: 'linear-gradient(135deg, #1e1b4b, #31103f)' }}>
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                {post.duration && (
                  <span style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-hud)'
                  }}>
                    {post.duration}
                  </span>
                )}
              </div>

              {/* Card Content */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 
                    onClick={() => setSelectedPostModal(post)}
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: 'white',
                      fontFamily: 'var(--font-hud)',
                      cursor: 'pointer',
                      lineHeight: '1.3'
                    }}
                  >
                    {post.title}
                  </h3>

                  {/* Bullet Highlights */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {(post.highlights || [post.summary || 'Strategic overview & build breakdown.']).map((hl: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                        <span style={{ color: '#9d7cff', fontSize: '0.8rem' }}>☑</span>
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Tag & Save Action */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem' }}>👤</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'var(--font-hud)', fontWeight: 600 }}>
                      {post.category || 'Hero Guide'}
                    </span>
                  </div>

                  <button
                    onClick={() => onToggleSavePost(post)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isSaved(post.id) ? '#ffd700' : 'rgba(255, 255, 255, 0.4)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-hud)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'color 0.2s',
                    }}
                  >
                    {isSaved(post.id) ? 'SAVED' : 'Save for later'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. COMMUNITY HIGHLIGHTS ───────────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <span style={{ color: '#9d7cff', fontSize: '1.2rem' }}>👥</span>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'white', fontFamily: 'var(--font-hud)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            COMMUNITY HIGHLIGHTS
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Left Card: Fan Art Spotlight */}
          <div style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            minHeight: '340px',
            background: 'linear-gradient(135deg, #1e1035, #0c182e)',
            border: '1px solid rgba(157, 124, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '32px',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.4,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{
                background: '#00c853',
                color: 'black',
                fontSize: '0.65rem',
                fontWeight: 900,
                padding: '4px 10px',
                borderRadius: '4px',
                fontFamily: 'var(--font-hud)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'inline-block',
                marginBottom: '12px'
              }}>
                FAN ART SPOTLIGHT
              </span>

              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-hud)', textTransform: 'uppercase' }}>
                Dekker's Containment
              </h3>

              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'var(--font-hud)' }}>
                By Artist: VoidMaster99
              </p>
            </div>
          </div>

          {/* Right Column: Tournament Banner & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Right Card: Community Tournament */}
            <div style={{
              background: 'rgba(16, 24, 48, 0.7)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255, 215, 0, 0.15)',
                    border: '1px solid #ffd700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem'
                  }}>
                    🏆
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-hud)' }}>
                      Community Tournament
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'var(--font-hud)' }}>
                      Registration closes in 24h
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.5' }}>
                Join the Discord to participate in the upcoming 5v5 Imperial Open. Test your skills against the best and compete for a $500 prize pool!
              </p>

              <button style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '10px 20px',
                borderRadius: '6px',
                fontFamily: 'var(--font-hud)',
                fontWeight: 800,
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                alignSelf: 'flex-start'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#9d7cff'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                SIGN UP NOW
              </button>
            </div>

            {/* Bottom Right Side-by-Side Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* MVP Card */}
              <div style={{
                background: 'rgba(16, 24, 48, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: 'white', fontFamily: 'var(--font-hud)', fontWeight: 800, letterSpacing: '0.05em' }}>
                  MVP OF THE WEEK
                </h5>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'var(--font-hud)' }}>
                  Player: <strong style={{ color: 'white' }}>SoulReaper</strong>
                </span>
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                  <span style={{ color: '#ff9900', fontSize: '0.6rem' }}>●</span>
                  <span style={{ color: '#ff9900', fontSize: '0.6rem' }}>●</span>
                  <span style={{ color: '#ff9900', fontSize: '0.6rem' }}>●</span>
                </div>
              </div>

              {/* Discussion Card */}
              <div style={{
                background: 'rgba(16, 24, 48, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '1.4rem', color: '#9d7cff', marginBottom: '4px' }}>💬</span>
                <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'white', fontFamily: 'var(--font-hud)', fontWeight: 800, textTransform: 'uppercase' }}>
                  DISCUSSION
                </h5>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'var(--font-hud)' }}>
                  Item Rework Feedback
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#ffd700', marginTop: '8px', fontFamily: 'var(--font-hud)' }}>
                  420 Comments
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── POST MODAL VIEWER ────────────────────────────────────────────────── */}
      {selectedPostModal && (
        <div
          onClick={() => setSelectedPostModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#101830',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '36px',
              border: '1px solid #9d7cff',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ background: '#9d7cff', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-hud)' }}>
                {selectedPostModal.category || 'Guide'}
              </span>
              <button
                onClick={() => setSelectedPostModal(null)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.8rem', cursor: 'pointer', fontFamily: 'var(--font-hud)' }}
              >
                ×
              </button>
            </div>

            <h2 style={{ color: 'white', marginTop: 0, fontSize: '1.8rem', fontFamily: 'var(--font-hud)', lineHeight: '1.2' }}>
              {selectedPostModal.title}
            </h2>

            <div style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.95rem', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: '24px 0' }}>
              {selectedPostModal.content || selectedPostModal.summary}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button
                onClick={() => setSelectedPostModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-hud)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
