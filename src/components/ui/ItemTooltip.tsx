import React from 'react'
import type { ItemDoc } from '@/types'
import { sortItemStats } from '@/lib/utils/stat-helpers'
import { parseDescription } from '@/lib/utils/description-parser'

interface ItemTooltipProps {
  item: ItemDoc
  mousePos: { x: number; y: number }
}

/**
 * Floating hover tooltip that follows the cursor with Royal Night glassmorphic aesthetic.
 */
export function ItemTooltip({ item, mousePos }: ItemTooltipProps) {
  return (
    <div style={{
      position: 'fixed',
      left: mousePos.x + 16,
      top: mousePos.y + 16,
      width: '320px',
      background: 'rgba(19, 27, 46, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid var(--accent-primary-container)',
      borderTop: '2px solid var(--accent-secondary)',
      borderRadius: '0px',
      padding: '16px',
      zIndex: 9999,
      pointerEvents: 'none',
      boxShadow: 'var(--shadow-tooltip)',
      animation: 'fadeIn 0.15s ease-out'
    }}>
      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-heading)', marginBottom: '4px', fontFamily: 'var(--font-hud)' }}>
        {item.display_name}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 'bold', marginBottom: '12px', fontFamily: 'var(--font-stat)' }}>
        COST: {item.total_price}G
      </div>

      {item.stats && Object.keys(item.stats).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', background: 'var(--bg-input)', padding: '10px', border: '1px solid var(--border-subtle)' }}>
          {sortItemStats(item.stats).map(([stat, val]) => (
            <div key={stat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-hud)' }}>{stat.replace(/_/g, ' ')}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontFamily: 'var(--font-stat)' }}>+{val}</span>
            </div>
          ))}
        </div>
      )}

      {item.effects && item.effects.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {item.effects.map((eff, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', lineHeight: '1.5' }}>
              <strong style={{ color: 'var(--accent-tertiary)', fontFamily: 'var(--font-hud)' }}>{eff.name}: </strong>
              <span dangerouslySetInnerHTML={{ __html: parseDescription(eff.menu_description) }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
