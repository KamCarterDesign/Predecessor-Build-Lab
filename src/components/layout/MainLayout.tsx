import React from 'react'
import type { TabId, HeroDoc } from '@/types'
import type { SearchResultItem } from '@/lib/utils/search-engine'

interface MainLayoutProps {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  globalSearchQuery: string
  setGlobalSearchQuery: (query: string) => void
  globalSearchResults: SearchResultItem[]
  showGlobalSearchResults: boolean
  setShowGlobalSearchResults: (show: boolean) => void
  onSelectSearchResult: (res: SearchResultItem) => void
  selectedHero: HeroDoc | null
  selectedHeroB: HeroDoc | null
  onResetHeroA: () => void
  onResetHeroB: () => void
  children: React.ReactNode
}

export function MainLayout({
  activeTab,
  setActiveTab,
  globalSearchQuery,
  setGlobalSearchQuery,
  globalSearchResults,
  showGlobalSearchResults,
  setShowGlobalSearchResults,
  onSelectSearchResult,
  selectedHero,
  selectedHeroB,
  onResetHeroA,
  onResetHeroB,
  children,
}: MainLayoutProps) {
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'lab', label: 'The Lab' },
    { id: 'feed', label: 'Guides' },
    { id: 'library', label: 'Heroes' },
  ]

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        {/* ── HEADER / TOP NAVIGATION ───────────────────────────────────────────────────────────── */}
        <header style={{
          background: 'rgba(11, 19, 38, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '0 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '80px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(10px)',
        }}>
          {/* Logo */}
          <div 
            onClick={() => setActiveTab('home')}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '1.75rem', fontWeight: 900, fontStyle: 'italic', color: 'white', fontFamily: 'var(--font-hud)', letterSpacing: '0.02em' }}>
              PREDECESSOR <span style={{ color: '#9d7cff' }}>HUB</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', height: '100%' }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #9d7cff' : '3px solid transparent',
                    height: '100%',
                    padding: '0 4px',
                    color: isActive ? '#9d7cff' : 'rgba(255, 255, 255, 0.7)',
                    fontFamily: 'var(--font-hud)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'white'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                    }
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search Bar & Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Search Input Bar */}
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="🔍 Search Guides..."
                value={globalSearchQuery}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value)
                  setShowGlobalSearchResults(true)
                }}
                onFocus={() => setShowGlobalSearchResults(true)}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-hud)',
                  outline: 'none',
                }}
              />
              {showGlobalSearchResults && globalSearchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'rgba(16, 24, 48, 0.98)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid #9d7cff',
                  borderRadius: '6px',
                  marginTop: '6px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  zIndex: 100,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                }}>
                  {globalSearchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => onSelectSearchResult(res)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(157, 124, 255, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'white', fontFamily: 'var(--font-hud)' }}>{res.name}</span>
                        <span style={{ fontSize: '0.65rem', background: '#9d7cff', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-hud)' }}>{res.type}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{res.sub}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Build Simulator CTA */}
            <button 
              onClick={() => setActiveTab('lab')}
              style={{
                background: 'linear-gradient(90deg, #9d7cff, #b59bff)',
                color: 'white',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '6px',
                fontFamily: 'var(--font-hud)',
                fontWeight: 900,
                fontSize: '0.85rem',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(157, 124, 255, 0.4)',
                transition: 'transform 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Build Simulator
            </button>

            {/* User Profile Picture */}
            <div 
              onClick={() => setActiveTab('profile')}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                border: '2px solid #9d7cff',
                overflow: 'hidden',
                cursor: 'pointer',
                padding: '2px',
                flexShrink: 0
              }}
            >
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#2a2a2a'
              }}>
                <img 
                  src="https://i.pravatar.cc/150?img=32" 
                  alt="Profile" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
            </div>
          </div>
        </header>

        {/* Hero Reset Actions (Moved below header if active) */}
        {(selectedHero || selectedHeroB) && (
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            padding: '12px 40px', 
            background: 'rgba(0,0,0,0.2)',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            {selectedHero && (
              <button onClick={onResetHeroA} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                ✕ RESET HERO A
              </button>
            )}
            {selectedHeroB && (
              <button onClick={onResetHeroB} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                ✕ RESET HERO B
              </button>
            )}
          </div>
        )}

        {/* Main Content */}
        <main style={{ padding: '32px 40px', maxWidth: '1440px', margin: '0 auto' }}>
          {children}
        </main>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{
        background: 'rgba(7, 12, 24, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '32px 40px',
        marginTop: '60px',
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px'
        }}>
          {/* Left: Branding & Copyright */}
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, fontStyle: 'italic', color: 'white', fontFamily: 'var(--font-hud)', letterSpacing: '0.02em' }}>
              PREDECESSOR <span style={{ color: '#9d7cff' }}>HUB</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px', fontFamily: 'var(--font-hud)' }}>
              © 2024 Predecessor Hub. Royal Night Edition.
            </div>
          </div>

          {/* Center: Footer Navigation Links */}
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            {['Privacy Policy', 'Terms of Service', 'API Docs', 'Community Discord'].map((link) => (
              <a
                key={link}
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-hud)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#9d7cff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Right: Social Icons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {['▶', '🔗', '✉'].map((icon, idx) => (
              <button
                key={idx}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#9d7cff'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
