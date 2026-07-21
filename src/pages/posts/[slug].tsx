import React from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { getFirestore } from '@/lib/firebase-admin'

interface AIPost {
  id: string
  title: string
  slug: string
  summary: string
  content: string
  category: 'gameplay' | 'hero_guide' | 'item_overview' | 'meta_analysis'
  tags: string[]
  heroId?: string
  itemId?: string
  eternalId?: string
  status: 'pending' | 'approved' | 'rejected'
  author: string
  seoKeywords?: string[]
  createdAt: string
  updatedAt?: string
}

interface PostPageProps {
  post: AIPost | null
  relatedPosts: AIPost[]
  notFoundError?: boolean
}

export default function PostDetail({ post, relatedPosts = [], notFoundError }: PostPageProps) {
  if (notFoundError || !post) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#0f172a', color: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <Head>
          <title>Post Not Found | Predecessor Build Lab</title>
        </Head>
        <h1 style={{ fontSize: '2rem', color: '#ef4444' }}>404 - Article Not Found</h1>
        <p style={{ color: '#94a3b8', margin: '16px 0 24px 0' }}>The guide or post you are looking for does not exist or has been removed.</p>
        <Link
          href="/?tab=feed"
          style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}
        >
          ← Back to Predecessor Feed
        </Link>
      </div>
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://predecessorbuildlab.com'
  const canonicalUrl = `${siteUrl}/posts/${post.slug}`

  // JSON-LD Article Schema for Google Search Indexing
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    author: {
      '@type': 'Organization',
      name: post.author || 'Predecessor AI Lab',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Predecessor Build Lab',
      url: siteUrl,
    },
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    mainEntityOfPage: canonicalUrl,
    keywords: post.seoKeywords ? post.seoKeywords.join(', ') : post.tags.join(', '),
  }

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <Head>
        <title>{`${post.title} | Predecessor Build Lab`}</title>
        <meta name="description" content={post.summary} />
        {post.seoKeywords && <meta name="keywords" content={post.seoKeywords.join(', ')} />}
        <link rel="canonical" href={canonicalUrl} />

        {/* OpenGraph Tags */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.summary} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.summary} />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      {/* Main Container */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px 80px 20px' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
          <Link
            href="/?tab=feed"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}
          >
            ← Back to Predecessor Content Feed
          </Link>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Predecessor Build Lab SEO Engine
          </div>
        </div>

        {/* Article Header */}
        <article style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#3b82f6',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              {post.category?.replace('_', ' ')}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Published {new Date(post.createdAt).toLocaleDateString()}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>•</span>
            <span style={{ fontSize: '0.85rem', color: '#60a5fa' }}>By {post.author}</span>
          </div>

          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, color: 'white', lineHeight: '1.25' }}>
            {post.title}
          </h1>

          {/* Excerpt / Summary Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(17, 24, 39, 0.8) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '12px',
              padding: '20px',
              fontSize: '1.05rem',
              color: '#dbeafe',
              lineHeight: '1.5',
              fontStyle: 'italic',
            }}
          >
            "{post.summary}"
          </div>

          {/* Tag Bar */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>Topics:</span>
              {post.tags.map((t) => (
                <span key={t} style={{ padding: '3px 10px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: '6px', fontSize: '0.8rem' }}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Full Post Body */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '32px',
              lineHeight: '1.7',
              fontSize: '1rem',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              marginTop: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            }}
          >
            {post.content}
          </div>
        </article>

        {/* Related Guides Section */}
        {relatedPosts.length > 0 && (
          <div style={{ marginTop: '50px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '32px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', color: 'white' }}>
              📚 Related Predecessor Gameplay Guides
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/posts/${rel.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      background: '#111827',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      height: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {rel.category?.replace('_', ' ')}
                    </span>
                    <h4 style={{ margin: 0, color: 'white', fontSize: '0.95rem', fontWeight: 'bold' }}>
                      {rel.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineClamp: 2, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {rel.summary}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params || {}
  if (!slug || typeof slug !== 'string') {
    return { props: { notFoundError: true, relatedPosts: [] } }
  }

  try {
    const db = getFirestore()
    // First try querying by slug
    let snap = await db.collection('ai_posts').where('slug', '==', slug).get()
    if (snap.empty) {
      // Fallback try by doc ID
      const docRef = await db.collection('ai_posts').doc(slug).get()
      if (docRef.exists) {
        const postData = { id: docRef.id, ...docRef.data() } as AIPost
        return fetchRelatedAndReturn(db, postData)
      }
      return { props: { notFoundError: true, relatedPosts: [] } }
    }

    const postData = { id: snap.docs[0].id, ...snap.docs[0].data() } as AIPost

    // Ensure only approved posts are indexed (or pending if previewing)
    return fetchRelatedAndReturn(db, postData)
  } catch (err) {
    console.error('Error loading post page:', err)
    return { props: { notFoundError: true, relatedPosts: [] } }
  }
}

async function fetchRelatedAndReturn(db: any, post: AIPost) {
  let relatedPosts: AIPost[] = []
  try {
    const relSnap = await db
      .collection('ai_posts')
      .where('status', '==', 'approved')
      .limit(6)
      .get()

    relatedPosts = relSnap.docs
      .map((d: any) => ({ id: d.id, ...d.data() } as AIPost))
      .filter((p: AIPost) => p.slug !== post.slug)
  } catch (err) {
    console.error('Error fetching related posts:', err)
  }

  return {
    props: {
      post: JSON.parse(JSON.stringify(post)),
      relatedPosts: JSON.parse(JSON.stringify(relatedPosts)),
    },
  }
}
