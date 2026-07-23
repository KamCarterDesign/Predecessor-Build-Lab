import { useMemo } from 'react'
import type { HeroDoc, ItemDoc, EternalDoc } from '@/types'

export interface SearchResultItem {
  type: 'hero' | 'item' | 'crest' | 'eternal' | 'ability' | 'patch'
  name: string
  sub: string
  raw: any
  heroContext?: any
}

export function useSearchRegistry(
  heroes: HeroDoc[] = [],
  items: ItemDoc[] = [],
  eternals: EternalDoc[] = [],
  patchesData: Array<{ version: string; released: string; content: string; url?: string }> = []
) {
  return useMemo(() => {
    return (query: string, category: 'all' | 'heroes' | 'items' | 'crests' | 'eternals' | 'patches'): SearchResultItem[] => {
      const q = query.toLowerCase().trim()
      if (!q) {
        if (category === 'heroes') return heroes.map(h => ({ type: 'hero' as const, name: h.display_name, sub: `Hero (${(h.classes || []).join(', ')})`, raw: h }))
        if (category === 'items') return items.filter(i => i.slot_type !== 'Crest').map(i => ({ type: 'item' as const, name: i.display_name, sub: `Item - Cost: ${i.total_price}g`, raw: i }))
        if (category === 'crests') return items.filter(i => i.slot_type === 'Crest').map(i => ({ type: 'crest' as const, name: i.display_name, sub: `Crest - Cost: ${i.total_price}g`, raw: i }))
        if (category === 'eternals') return eternals.map(e => ({ type: 'eternal' as const, name: e.display_name || e.name, sub: `Eternal - Category: ${e.category || 'General'}`, raw: e }))
        if (category === 'patches') return patchesData.map(p => ({ type: 'patch' as const, name: p.version, sub: `Released: ${p.released}`, raw: p }))
        return []
      }

      const results: SearchResultItem[] = []

      // Match heroes
      if (category === 'all' || category === 'heroes') {
        heroes.forEach((h) => {
          if ((h.display_name && h.display_name.toLowerCase().includes(q)) || (h.name && h.name.toLowerCase().includes(q))) {
            results.push({ type: 'hero', name: h.display_name, sub: `Hero (${(h.classes || []).join(', ')})`, raw: h })
          }
          if (category === 'all') {
            h.abilities?.forEach((ab: any) => {
              if ((ab.display_name && ab.display_name.toLowerCase().includes(q)) || (ab.game_description && ab.game_description.toLowerCase().includes(q))) {
                results.push({ type: 'ability', name: ab.display_name, sub: `Ability on ${h.display_name}`, raw: ab, heroContext: h })
              }
            })
          }
        })
      }

      // Match items
      if (category === 'all' || category === 'items') {
        items.forEach((item) => {
          if (item.slot_type !== 'Crest' && item.display_name && item.display_name.toLowerCase().includes(q)) {
            results.push({
              type: 'item',
              name: item.display_name,
              sub: `Item - Cost: ${item.total_price}g (${item.aggression_type || 'General'})`,
              raw: item
            })
          }
        })
      }

      // Match crests
      if (category === 'all' || category === 'crests') {
        items.forEach((item) => {
          if (item.slot_type === 'Crest' && item.display_name && item.display_name.toLowerCase().includes(q)) {
            results.push({
              type: 'crest',
              name: item.display_name,
              sub: `Crest - Cost: ${item.total_price}g (${item.aggression_type || 'General'})`,
              raw: item
            })
          }
        })
      }

      // Match eternals
      if (category === 'all' || category === 'eternals') {
        eternals.forEach((et) => {
          if ((et.display_name && et.display_name.toLowerCase().includes(q)) || (et.name && et.name.toLowerCase().includes(q)) || (et.description && et.description.toLowerCase().includes(q))) {
            results.push({ type: 'eternal', name: et.display_name || et.name, sub: `Eternal - Category: ${et.category || 'General'}`, raw: et })
          }
        })
      }

      // Match patches
      if (category === 'all' || category === 'patches') {
        patchesData.forEach((p) => {
          if (p.version.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)) {
            results.push({
              type: 'patch',
              name: p.version,
              sub: `Patch Notes - Released: ${p.released}`,
              raw: p
            })
          }
        })
      }

      return results
    }
  }, [heroes, items, eternals, patchesData])
}
