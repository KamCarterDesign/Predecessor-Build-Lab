import React from 'react'

interface PatchNotesModalProps {
  patch: {
    version: string
    url?: string
  }
  onClose: () => void
}

/**
 * Full-screen modal that displays patch notes with Royal Night aesthetic.
 */
export function PatchNotesModal({ patch, onClose }: PatchNotesModalProps) {
  const patchUrl = patch.url || 'https://www.predecessorgame.com/news/patch-notes'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-overlay)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Patch Notes Viewer: ${patch.version}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-glass"
        style={{
          borderRadius: '0px',
          width: '100%',
          maxWidth: '1050px',
          height: '90vh',
          overflow: 'hidden',
          border: '1px solid var(--accent-primary-container)',
          borderTop: '3px solid var(--accent-secondary)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border-medium)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', color: 'white', fontSize: '0.95rem', fontFamily: 'var(--font-hud)' }}>
              📰 PATCH NOTES VIEWER: {patch.version}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a
              href={patchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              OPEN IN NEW TAB ↗
            </a>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-hud)' }}
              aria-label="Close patch notes viewer"
            >
              ×
            </button>
          </div>
        </div>

        {/* Iframe Content */}
        <div style={{ flex: 1, width: '100%', background: 'white' }}>
          <iframe
            width="100%"
            height="100%"
            src={patchUrl}
            title="Patch Notes Viewer"
            frameBorder="0"
          />
        </div>
      </div>
    </div>
  )
}
