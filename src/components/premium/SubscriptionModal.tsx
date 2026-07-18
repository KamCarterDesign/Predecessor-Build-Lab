import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubscribe = async (priceId: string) => {
    if (!user) return; // Should be handled by UI, but double check
    setLoading(true);
    try {
      const res = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, uid: user.uid }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button style={closeButtonStyle} onClick={onClose}>×</button>
        <h2 style={{ marginTop: 0, textAlign: 'center', color: '#eab308' }}>Upgrade to Premium 🌟</h2>
        
        <p style={{ textAlign: 'center', color: '#cbd5e1', marginBottom: '24px' }}>
          Unlock the full power of Predecessor Labs.
        </p>

        <ul style={{ marginBottom: '32px', color: '#f8fafc', lineHeight: 1.6 }}>
          <li>✨ <strong>AI Build Analysis:</strong> Get detailed insights and critiques on your builds.</li>
          <li>✨ <strong>AI "Explain This":</strong> Ask complex questions about meta, matchups, and more.</li>
          <li>✨ <strong>Unlimited Cloud Sync:</strong> Save and sync as many builds as you want across devices.</li>
          <li>✨ <strong>Ad-Free Experience:</strong> Enjoy the Lab without distractions.</li>
        </ul>

        <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
          <button 
            disabled={loading || !user}
            onClick={() => handleSubscribe('price_monthly_mock')} // Replace with actual price ID
            style={monthlyBtnStyle}
          >
            {loading ? 'Processing...' : 'Subscribe Monthly ($4.99/mo)'}
          </button>
          <button 
            disabled={loading || !user}
            onClick={() => handleSubscribe('price_annual_mock')} // Replace with actual price ID
            style={annualBtnStyle}
          >
            {loading ? 'Processing...' : 'Subscribe Annually ($49.99/yr)'}
          </button>
        </div>

        {!user && (
          <p style={{ textAlign: 'center', color: '#ef4444', marginTop: '16px', fontSize: '0.9rem' }}>
            Please log in to subscribe.
          </p>
        )}
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

const monthlyBtnStyle: React.CSSProperties = {
  padding: '12px', borderRadius: '8px', border: '1px solid #3b82f6',
  backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: 'bold',
  cursor: 'pointer', width: '100%', fontSize: '1rem', transition: 'all 0.2s'
};

const annualBtnStyle: React.CSSProperties = {
  padding: '12px', borderRadius: '8px', border: 'none',
  backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold',
  cursor: 'pointer', width: '100%', fontSize: '1rem', transition: 'all 0.2s'
};
