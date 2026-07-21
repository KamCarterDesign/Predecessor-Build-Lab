import type { NextApiRequest, NextApiResponse } from 'next'
import { getFirestore } from '@/lib/firebase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getFirestore()

  if (req.method === 'GET') {
    try {
      const { status = 'all' } = req.query
      let query: any = db.collection('ai_posts')

      if (status !== 'all' && typeof status === 'string') {
        query = query.where('status', '==', status)
      }

      const snap = await query.get()
      const posts = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
      posts.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

      return res.status(200).json({ success: true, posts })
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || String(error) })
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, postId, postData, status } = req.body

      if (action === 'update_status') {
        if (!postId || !status) {
          return res.status(400).json({ error: 'Missing postId or status' })
        }
        await db.collection('ai_posts').doc(postId).update({
          status,
          updatedAt: new Date().toISOString(),
        })
        return res.status(200).json({ success: true, message: `Post status updated to ${status}` })
      }

      if (action === 'delete') {
        if (!postId) {
          return res.status(400).json({ error: 'Missing postId' })
        }
        await db.collection('ai_posts').doc(postId).delete()
        return res.status(200).json({ success: true, message: 'Post deleted successfully' })
      }

      if (action === 'create' || action === 'seed_samples') {
        if (action === 'create') {
          const id = postData.slug || 'post_' + Date.now()
          const postDoc = {
            ...postData,
            status: postData.status || 'pending',
            createdAt: postData.createdAt || new Date().toISOString(),
          }
          await db.collection('ai_posts').doc(id).set(postDoc, { merge: true })
          return res.status(200).json({ success: true, id, post: postDoc })
        }

        // Seed Sample Posts for Predecessor SEO driver & approval testing
        const samplePosts = [
          {
            id: 'how-to-gank-jungle-guide',
            title: 'How To Gank Like a Master Jungler in Predecessor',
            slug: 'how-to-gank-jungle-guide',
            summary: 'Complete guide on wave reading, power spikes, gank pathing, and securing early lane leads in Predecessor.',
            content: `### Mastering the Jungle Gank in Predecessor

Ganking is the primary tool for jungle players to snowball lanes and create map pressure in Predecessor. Successful ganks depend on reading enemy wave positions, cooldown tracking, and approaching from fog of war.

#### 1. Pre-Gank Checklist
- **Lane Wave Control:** Check if the enemy is overextended past the river center.
- **Mana & Cooldowns:** Ensure your primary hard CC (e.g. Khaimera jump/stun or Rampage rock) is off cooldown.
- **Vision Sweeping:** Sweep river brushes with Sentry or approach through lane bushes.

#### 2. The Flank Route
Avoid walking straight down the river lane unless your laner has set up a collapse. Path behind the enemy hero through the jungle exit to cut off their escape path back to tower.

#### 3. Securing Fangtooth & Objectives
Following a successful kill, ping your team to immediately transition into **Fangtooth** or invade the enemy jungle camps to deny gold.`,
            category: 'gameplay',
            tags: ['Jungle', 'Gank', 'Beginner Guide', 'Macro Strategy'],
            status: 'approved',
            author: 'Predecessor AI Content Engine',
            seoKeywords: ['how to gank predecessor', 'predecessor jungle guide', 'gank tips'],
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          },
          {
            id: 'countess-beginners-guide',
            title: 'Countess Beginners Guide: High-Burst Assassin Masterclass',
            slug: 'countess-beginners-guide',
            summary: 'Learn Countess skill order, shadow slip combos, burst damage scaling, and itemization for Midlane and Offlane.',
            content: `### Countess: The Shadow Assassin

Countess relies on relentless burst damage, life steal scaling, and slippery mobility to eliminate squishy targets before disappearing back to safety.

#### Core Abilities & Combos
- **Shadow Slip (Q):** Teleport to an enemy, slow them, and recast within 3.5s to return to your starting position.
- **Eventide (E):** Waves of dark magic dealing heavy AoE magical damage.
- **Feast (Ultimate):** Target hero lockdown with massive burst execute damage.

#### Standard Combo Sequence:
1. Initiate with **Shadow Slip (Q)** to close distance.
2. Cast **Eventide (E)** and **Dark Tide (RMB)**.
3. Lock down with **Feast (R)**.
4. Recast **Shadow Slip (Q)** to warp back safely!

#### Hero Synergy & Tags
Best paired with CC initiators like Steel or Dekker. Tagged for **Countess** library integration.`,
            category: 'hero_guide',
            tags: ['Countess', 'Midlane', 'Assassin', 'Burst'],
            heroId: 'countess',
            status: 'approved',
            author: 'Predecessor AI Content Engine',
            seoKeywords: ['countess build', 'countess beginners guide', 'predecessor countess mid'],
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          },
          {
            id: 'boris-jungle-build-overview',
            title: 'Boris Jungle Build Overview: Dominating Offlane & Jungle',
            slug: 'boris-jungle-build-overview',
            summary: 'Full breakdown of Boris pathing, item tier picks, crest choices, and combat rotation.',
            content: `### Boris Build & Role Breakdown

Boris brings ferocious bruiser durability combined with relentless single-target lockdown.

#### Preferred Crest & Core Items
- **Crest:** Pacifier / Leviathan
- **Core Items:** Dread, Overlord, Salvation, Resolution

#### Playstyle & Objectives
Farm jungle camps efficiently while looking for overextended mid laners. In teamfights, act as the frontline disrupter, targeting high-value enemy ADCs.`,
            category: 'hero_guide',
            tags: ['Boris', 'Jungle', 'Offlane', 'Build Overview'],
            heroId: 'boris',
            status: 'pending', // Seeded as pending so admin review can test approving it!
            author: 'Predecessor AI Content Engine',
            seoKeywords: ['boris build predecessor', 'boris jungle overview'],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'jungle-clear-explained',
            title: 'Jungle Clear Speed Explained: Optimizing Camp Routes',
            slug: 'jungle-clear-explained',
            summary: 'How to achieve a sub-3 minute full jungle clear in Predecessor to secure River Buffs and level advantage.',
            content: `### Efficient Jungle Pathing

Maximizing XP per minute is the key to out-leveling enemy junglers.

#### 1. Red Side vs Blue Side Start
- **Red Buff Start:** Ideal for level 3 aggressive gankers.
- **Blue Buff Start:** Ideal for mana-reliant heroes needing rapid cooldowns.

#### 2. Kiting Camps
Auto-attack and kite camps towards the next camp boundary to minimize movement downtime between camps!`,
            category: 'gameplay',
            tags: ['Jungle Clear', 'River Buff', 'Macro', 'Tips'],
            status: 'approved',
            author: 'Predecessor AI Content Engine',
            seoKeywords: ['jungle clear predecessor', 'predecessor jungle route'],
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          },
        ]

        for (const post of samplePosts) {
          await db.collection('ai_posts').doc(post.id).set(post, { merge: true })
        }

        return res.status(200).json({ success: true, message: `Seeded ${samplePosts.length} sample posts.` })
      }

      return res.status(400).json({ error: 'Invalid action' })
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message || String(error) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
