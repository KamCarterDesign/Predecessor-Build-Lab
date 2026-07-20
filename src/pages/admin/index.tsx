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
  const [activeTab, setActiveTab] = useState<'sync' | 'emails'>('sync')

  useEffect(() => {
    setMounted(true)
    fetchTemplates()
  }, [])

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

            {/* LIVE PREVIEW PANE */}
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#facc15' }}>👁 Live Email Preview</h3>
              <div style={{ background: '#ffffff', color: '#111827', padding: '20px', borderRadius: '6px', border: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px' }}>
                  <strong>Subject:</strong> {previewSubject}
                </div>
                <div dangerouslySetInnerHTML={{ __html: previewBody }} />
              </div>
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
