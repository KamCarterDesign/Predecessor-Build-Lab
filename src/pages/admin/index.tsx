import React, { useState, useEffect } from 'react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  updatedAt?: string
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<string>('')
  const [running, setRunning] = useState<boolean>(false)
  const [status, setStatus] = useState<string>('Idle')
  const [mounted, setMounted] = useState<boolean>(false)

  // ── Email Templates State ──────────────────────────────────────────────────
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [templateId, setTemplateId] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateMessage, setTemplateMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'sync' | 'emails' | 'ai_posts'>('ai_posts')

  // ── AI Posts Review State ──────────────────────────────────────────────────
  const [adminPosts, setAdminPosts] = useState<any[]>([])
  const [postFilter, setPostFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [editTagsText, setEditTagsText] = useState<string>('')
  const [loadingPosts, setLoadingPosts] = useState<boolean>(false)
  const [postActionMsg, setPostActionMsg] = useState<string>('')

  useEffect(() => {
    if (selectedPost) {
      setEditTagsText(selectedPost.tags ? selectedPost.tags.join(', ') : '')
    }
  }, [selectedPost])

  useEffect(() => {
    setMounted(true)
    fetchTemplates()
    fetchAdminPosts()
  }, [])

  const fetchAdminPosts = async () => {
    setLoadingPosts(true)
    try {
      const res = await fetch('/api/posts/admin?status=all')
      const data = await res.json()
      if (data.posts) {
        setAdminPosts(data.posts)
        if (data.posts.length > 0 && !selectedPost) {
          setSelectedPost(data.posts[0])
          setEditTagsText(data.posts[0].tags ? data.posts[0].tags.join(', ') : '')
        }
      }
    } catch (err) {
      console.error('Error fetching admin posts:', err)
    } finally {
      setLoadingPosts(false)
    }
  }

  const handleSaveTags = async () => {
    if (!selectedPost) return
    const parsedTags = editTagsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    try {
      setPostActionMsg(`Saving tags for ${selectedPost.id}...`)
      const res = await fetch('/api/posts/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_tags', postId: selectedPost.id, tags: parsedTags }),
      })
      const data = await res.json()
      if (data.success) {
        setPostActionMsg('✅ Tags updated successfully!')
        const updatedPost = { ...selectedPost, tags: parsedTags }
        setSelectedPost(updatedPost)
        setAdminPosts((prev) => prev.map((p) => (p.id === selectedPost.id ? updatedPost : p)))
      } else {
        setPostActionMsg(`❌ Error updating tags: ${data.error}`)
      }
    } catch (err: any) {
      setPostActionMsg(`❌ Error: ${err.message}`)
    }
  }

  const handleUpdatePostStatus = async (postId: string, status: 'approved' | 'rejected') => {
    try {
      setPostActionMsg(`Updating post ${postId}...`)
      const res = await fetch('/api/posts/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', postId, status }),
      })
      const data = await res.json()
      if (data.success) {
        setPostActionMsg(`✅ Post status set to ${status}!`)
        await fetchAdminPosts()
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost({ ...selectedPost, status })
        }
      } else {
        setPostActionMsg(`❌ Error: ${data.error}`)
      }
    } catch (err: any) {
      setPostActionMsg(`❌ Error updating status: ${err.message}`)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    try {
      setPostActionMsg(`Deleting post ${postId}...`)
      const res = await fetch('/api/posts/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', postId }),
      })
      const data = await res.json()
      if (data.success) {
        setPostActionMsg('✅ Post deleted successfully!')
        setSelectedPost(null)
        await fetchAdminPosts()
      } else {
        setPostActionMsg(`❌ Error: ${data.error}`)
      }
    } catch (err: any) {
      setPostActionMsg(`❌ Delete failed: ${err.message}`)
    }
  }

  const handleSeedPosts = async () => {
    try {
      setPostActionMsg('Seeding sample AI posts...')
      const res = await fetch('/api/posts/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_samples' }),
      })
      const data = await res.json()
      if (data.success) {
        setPostActionMsg(`✅ Seeded ${data.message || 'sample posts'}`)
        await fetchAdminPosts()
      } else {
        setPostActionMsg(`❌ Error seeding: ${data.error}`)
      }
    } catch (err: any) {
      setPostActionMsg(`❌ Error: ${err.message}`)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/email-templates')
      const data = await res.json()
      if (data.templates) {
        setTemplates(data.templates)
        if (data.templates.length > 0 && !selectedTemplate) {
          selectTemplate(data.templates[0])
        }
      }
    } catch (err) {
      console.error('Error fetching email templates:', err)
    }
  }

  const selectTemplate = (t: EmailTemplate) => {
    setSelectedTemplate(t)
    setTemplateId(t.id)
    setTemplateName(t.name)
    setTemplateSubject(t.subject)
    setTemplateBody(t.body)
    setTemplateMessage('')
  }

  const startNewTemplate = () => {
    setSelectedTemplate(null)
    setTemplateId('')
    setTemplateName('')
    setTemplateSubject('')
    setTemplateBody('<h2>Header</h2>\n<p>Hello {{email}},</p>\n<p>Your message here...</p>')
    setTemplateMessage('')
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateId || !templateName || !templateSubject || !templateBody) return

    setSavingTemplate(true)
    setTemplateMessage('')

    try {
      const res = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: templateId,
          name: templateName,
          subject: templateSubject,
          body: templateBody,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setTemplateMessage('✅ Email template saved successfully!')
        await fetchTemplates()
      } else {
        setTemplateMessage(`❌ Error: ${data.error}`)
      }
    } catch (err: any) {
      setTemplateMessage(`❌ Save failed: ${err.message}`)
    } finally {
      setSavingTemplate(false)
    }
  }

  const insertPlaceholder = (ph: string) => {
    setTemplateBody((prev) => prev + ph)
  }

  const triggerAction = async (action: string) => {
    if (running) return
    setRunning(true)
    setStatus(`Running ${action}...`)
    setLogs((prev) => `${prev}\n\n[System] Starting ${action}...`)

    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        setLogs((prev) => `${prev}\n${data.output}\n[System] Completed successfully.`)
        setStatus('Success')
      } else {
        setLogs((prev) => `${prev}\nError: ${data.error}\n[System] Action failed.`)
        setStatus('Failed')
      }
    } catch (err: any) {
      setLogs((prev) => `${prev}\nNetwork Error: ${err.message}\n[System] Action failed.`)
      setStatus('Failed')
    } finally {
      setRunning(false)
    }
  }

  if (!mounted) {
    return null
  }

  // Live preview formatting
  const previewSubject = templateSubject.replace(/\{\{email\}\}/g, 'user@example.com').replace(/\{\{appName\}\}/g, 'Predecessor Labs').replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
  const previewBody = templateBody.replace(/\{\{email\}\}/g, 'user@example.com').replace(/\{\{appName\}\}/g, 'Predecessor Labs').replace(/\{\{date\}\}/g, new Date().toLocaleDateString())

  return (
    <div style={{ padding: '24px', fontFamily: 'monospace', backgroundColor: '#0f172a', color: '#f1f5f9', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#38bdf8' }}>Predecessor Labs Admin</h1>
        <a href="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', background: '#1e293b', padding: '8px 14px', borderRadius: '6px', border: '1px solid #334155' }}>
          ← Back to App
        </a>
      </div>

      {/* ADMIN TABS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('ai_posts')}
          style={{ padding: '8px 16px', background: activeTab === 'ai_posts' ? '#3b82f6' : '#1e293b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🤖 AI Content & n8n Moderation
          {adminPosts.filter((p) => p.status === 'pending').length > 0 && (
            <span style={{ background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '0.75rem' }}>
              {adminPosts.filter((p) => p.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          style={{ padding: '8px 16px', background: activeTab === 'sync' ? '#3b82f6' : '#1e293b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ⚙️ Data Sync & Actions
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          style={{ padding: '8px 16px', background: activeTab === 'emails' ? '#3b82f6' : '#1e293b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ✉️ Email Templates Manager
        </button>
      </div>

      {/* TAB 1: DATA SYNC & ACTIONS */}
      {activeTab === 'sync' && (
        <div>
          <div style={{ margin: '16px 0', padding: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', borderRadius: '8px' }}>
            <strong>System Status:</strong> <span style={{ color: status === 'Success' ? '#4ade80' : status === 'Failed' ? '#f87171' : '#facc15' }}>{status}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', margin: '24px 0' }}>
            <button disabled={running} onClick={() => triggerAction('sync_heroes')} style={buttonStyle}>Sync Heroes & Assets</button>
            <button disabled={running} onClick={() => triggerAction('sync_items')} style={buttonStyle}>Sync Items & Tiers</button>
            <button disabled={running} onClick={() => triggerAction('sync_eternals')} style={buttonStyle}>Scrape/Sync Eternals</button>
            <button disabled={running} onClick={() => triggerAction('sync_feed')} style={buttonStyle}>Sync News & Reddit Feed</button>
            <button disabled={running} onClick={() => triggerAction('sync_matches')} style={buttonStyle}>Sync Matches (Incremental)</button>
            <button disabled={running} onClick={() => triggerAction('sync_stats')} style={buttonStyle}>Sync Hero Win Rates</button>
            <button disabled={running} onClick={() => triggerAction('compute_synergy')} style={buttonStyle}>Compute Synergy Scores</button>
            <button disabled={running} onClick={() => triggerAction('compute_meta')} style={buttonStyle}>Compute Meta Snapshot</button>
            <button disabled={running} onClick={() => triggerAction('compute_narrative')} style={buttonStyle}>Generate Narrative</button>
          </div>

          <h2>Execution Logs</h2>
          <pre style={{ padding: '16px', backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px', overflowX: 'auto', maxHeight: '400px', whiteSpace: 'pre-wrap' }}>
            {logs || 'No log history.'}
          </pre>
        </div>
      )}

      {/* TAB 2: EMAIL TEMPLATES MANAGER */}
      {activeTab === 'emails' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
          {/* TEMPLATE LIST SIDEBAR */}
          <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Templates</h3>
              <button onClick={startNewTemplate} style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}>
                + New
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: templateId === t.id ? '#3b82f6' : '#0f172a',
                    border: '1px solid #334155',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: 'white' }}>{t.name}</div>
                  <div style={{ fontSize: '0.7rem', color: templateId === t.id ? '#e0f2fe' : '#94a3b8', marginTop: '2px' }}>
                    ID: {t.id} {t.id === 'account_confirmation' ? '• (Auto-sent on Signup)' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TEMPLATE EDITOR & PREVIEW */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <form onSubmit={handleSaveTemplate} style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#3b82f6' }}>
                {selectedTemplate ? `Edit Template: ${selectedTemplate.name}` : 'Create New Email Template'}
              </h2>

              {templateMessage && (
                <div style={{ padding: '10px', background: templateMessage.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.85rem' }}>
                  {templateMessage}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Template ID (unique key)</label>
                  <input
                    type="text"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    placeholder="e.g. account_confirmation"
                    disabled={selectedTemplate?.id === 'account_confirmation'}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Template Display Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Account Confirmation"
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Email Subject Line</label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  placeholder="e.g. Welcome to Predecessor Labs — Account Confirmation"
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Email Body (HTML / Plain Text)</label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Insert:</span>
                    {['{{email}}', '{{appName}}', '{{date}}'].map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => insertPlaceholder(ph)}
                        style={{ padding: '2px 6px', background: '#334155', color: '#38bdf8', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        {ph}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  rows={8}
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="submit" disabled={savingTemplate} style={{ ...buttonStyle, backgroundColor: '#10b981', padding: '10px 20px' }}>
                  {savingTemplate ? 'Saving...' : '💾 Save Template to Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: AI POSTS MODERATION & N8N HUB */}
      {activeTab === 'ai_posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Action Header & Notifications */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#38bdf8' }}>AI Content Engine & Approval Workflow</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                Review AI-generated SEO posts (n8n integration). Approved posts go live on the Feed & Library.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSeedPosts} style={{ padding: '8px 14px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                🌱 Seed Sample AI Posts
              </button>
              <button onClick={fetchAdminPosts} style={{ padding: '8px 14px', background: '#334155', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                🔄 Refresh Queue
              </button>
            </div>
          </div>

          {postActionMsg && (
            <div style={{ padding: '12px', background: postActionMsg.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.85rem' }}>
              {postActionMsg}
            </div>
          )}

          {/* n8n Webhook Endpoint Guide Card */}
          <div style={{ background: '#090d16', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#facc15', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚡ n8n / AI Workflow Webhook Integration URL
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>POST Webhook Endpoint:</strong> <code style={{ background: '#1e293b', padding: '3px 8px', borderRadius: '4px', color: '#38bdf8' }}>POST /api/webhooks/n8n-post</code></div>
              <div><strong>Header (optional secret):</strong> <code style={{ background: '#1e293b', padding: '3px 8px', borderRadius: '4px', color: '#38bdf8' }}>x-api-key: predecessor_n8n_secret</code></div>
              <div><strong>Sample JSON Payload:</strong></div>
              <pre style={{ margin: 0, padding: '10px', background: '#020617', borderRadius: '6px', fontSize: '0.75rem', overflowX: 'auto', color: '#a7f3d0' }}>
{`{
  "title": "Countess Beginners Guide",
  "summary": "Master Countess midlane burst combos...",
  "content": "Full Markdown/HTML guide text...",
  "category": "hero_guide",
  "tags": ["Countess", "Midlane", "Burst"],
  "heroId": "countess",
  "author": "n8n AI Engine"
}`}
              </pre>
            </div>
          </div>

          {/* Status Filter Bar */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => {
              const count = adminPosts.filter((p) => st === 'all' || p.status === st).length
              return (
                <button
                  key={st}
                  onClick={() => setPostFilter(st)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: postFilter === st ? '#3b82f6' : '#1e293b',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {st} ({count})
                </button>
              )
            })}
          </div>

          {/* Main Grid: Left Post List | Right Selected Post Details & Review */}
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px' }}>
            {/* Left Posts List */}
            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '650px', overflowY: 'auto' }}>
              {loadingPosts ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading posts...</div>
              ) : adminPosts.filter((p) => postFilter === 'all' || p.status === postFilter).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No posts found in `{postFilter}` state.
                </div>
              ) : (
                adminPosts
                  .filter((p) => postFilter === 'all' || p.status === postFilter)
                  .map((post) => {
                    const isSelected = selectedPost?.id === post.id
                    return (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: isSelected ? '#3b82f6' : '#0f172a',
                          border: '1px solid #334155',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              background: post.status === 'approved' ? '#10b981' : post.status === 'rejected' ? '#ef4444' : '#f59e0b',
                              color: 'white',
                            }}
                          >
                            {post.status}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: isSelected ? '#e0f2fe' : '#94a3b8' }}>
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'white', lineClamp: 2, WebkitLineClamp: 2, overflow: 'hidden' }}>
                          {post.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: isSelected ? '#dbeafe' : '#94a3b8' }}>
                          Cat: {post.category} • Author: {post.author}
                        </div>
                      </div>
                    )
                  })
              )}
            </div>

            {/* Right Post Detail & Approval Pane */}
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!selectedPost ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Select a post from the list on the left to review, approve, or reject.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: selectedPost.status === 'approved' ? '#10b981' : selectedPost.status === 'rejected' ? '#ef4444' : '#f59e0b', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          Status: {selectedPost.status}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Category: {selectedPost.category}</span>
                      </div>
                      <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'white' }}>{selectedPost.title}</h2>
                    </div>

                    {/* Moderation Controls */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleUpdatePostStatus(selectedPost.id, 'approved')}
                        disabled={selectedPost.status === 'approved'}
                        style={{ padding: '8px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ✅ Approve Post
                      </button>
                      <button
                        onClick={() => handleUpdatePostStatus(selectedPost.id, 'rejected')}
                        disabled={selectedPost.status === 'rejected'}
                        style={{ padding: '8px 14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ❌ Reject Post
                      </button>
                      <button
                        onClick={() => handleDeletePost(selectedPost.id)}
                        style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  {/* Summary & Tag Editor */}
                  <div style={{ background: '#0f172a', padding: '14px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                    <div><strong>Summary:</strong> {selectedPost.summary}</div>
                    
                    {/* Interactive Tag Editor */}
                    <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>🏷️ Assigned Tags (Taxonomy: Guide / [Hero Name] / Builds / Gameplay / Misc):</strong>
                        <button
                          onClick={handleSaveTags}
                          style={{ padding: '4px 10px', background: '#38bdf8', color: '#090d16', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          💾 Save Tags
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={editTagsText}
                          onChange={(e) => setEditTagsText(e.target.value)}
                          placeholder="e.g. Guide, Countess, Builds, Gameplay"
                          style={{ ...inputStyle, fontSize: '0.8rem', padding: '6px 10px' }}
                        />
                      </div>

                      {/* Taxonomy Quick Add Buttons */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Quick Add:</span>
                        {['Guide', 'Builds', 'Gameplay', 'Misc'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              const current = editTagsText.split(',').map((t) => t.trim()).filter(Boolean)
                              if (!current.includes(preset)) {
                                setEditTagsText([...current, preset].join(', '))
                              }
                            }}
                            style={{ padding: '2px 8px', background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rendered Post Content Body */}
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#94a3b8' }}>Post Content Body</h4>
                    <div style={{ background: '#020617', padding: '16px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '0.85rem', color: '#e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '350px', overflowY: 'auto' }}>
                      {selectedPost.content}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: '12px',
  cursor: 'pointer',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontWeight: 'bold',
}

const inputStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '6px',
  border: '1px solid #334155',
  backgroundColor: '#0f172a',
  color: 'white',
  width: '100%',
  boxSizing: 'border-box',
}
