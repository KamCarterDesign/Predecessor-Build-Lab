import React, { useState } from 'react';

interface DiscordShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  build: any;
}

export const DiscordShareModal: React.FC<DiscordShareModalProps> = ({ isOpen, onClose, build }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!webhookUrl) return;
    setLoading(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/builds/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ build, webhookUrl }),
      });
      
      if (!res.ok) throw new Error('Failed to share to Discord');
      
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setWebhookUrl('');
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button style={closeButtonStyle} onClick={onClose}>×</button>
        <h2 style={{ marginTop: 0, textAlign: 'center', color: '#5865F2' }}>Share to Discord</h2>
        
        <p style={{ textAlign: 'center', color: '#cbd5e1', marginBottom: '24px' }}>
          Enter a Discord Webhook URL to share <strong>{build?.name}</strong> to your server.
        </p>

        <input 
          type="url"
          placeholder="https://discord.com/api/webhooks/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155', marginBottom: '16px', boxSizing: 'border-box' }}
        />

        <button 
          disabled={loading || !webhookUrl}
          onClick={handleShare}
          style={shareBtnStyle(loading || !webhookUrl)}
        >
          {loading ? 'Sending...' : 'Send to Discord'}
        </button>

        {status === 'success' && <p style={{ color: '#10b981', textAlign: 'center', marginTop: '16px' }}>Successfully sent to Discord!</p>}
        {status === 'error' && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '16px' }}>Failed to send. Check your webhook URL.</p>}
      </div>
    </div>
  );
};

// Inline styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  padding: '32px',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '480px',
  position: 'relative',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute', top: '16px', right: '16px',
  background: 'none', border: 'none', color: '#94a3b8',
  fontSize: '1.5rem', cursor: 'pointer'
};

const shareBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '12px', borderRadius: '8px', border: 'none',
  backgroundColor: disabled ? '#475569' : '#5865F2', color: 'white', fontWeight: 'bold',
  cursor: disabled ? 'not-allowed' : 'pointer', width: '100%', fontSize: '1rem', transition: 'all 0.2s'
});
