import React, { useState, useEffect } from 'react'

export default function AdminDashboard() {
  const [logs, setLogs] = useState<string>('')
  const [running, setRunning] = useState<boolean>(false)
  const [status, setStatus] = useState<string>('Idle')
  const [mounted, setMounted] = useState<boolean>(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  return (
    <div style={{ padding: '24px', fontFamily: 'monospace', backgroundColor: '#0f172a', color: '#f1f5f9', minHeight: '100vh' }}>
      <h1>Predecessor Labs Admin</h1>
      <div style={{ margin: '16px 0', padding: '8px', border: '1px solid #334155', backgroundColor: '#1e293b' }}>
        <strong>System Status:</strong> {status}
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
      <pre style={{ padding: '16px', backgroundColor: '#020617', border: '1px solid #1e293b', overflowX: 'auto', maxHeight: '500px', whiteSpace: 'pre-wrap' }}>
        {logs || 'No log history.'}
      </pre>
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
