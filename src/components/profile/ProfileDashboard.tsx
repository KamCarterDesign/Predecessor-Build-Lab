import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase-client';
import { SubscriptionModal } from '@/components/premium/SubscriptionModal';

export const ProfileDashboard: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
  const { user, isPremium } = useAuth();
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#111827', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ color: 'white' }}>Sign in to view your profile</h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Save your builds to the cloud, access premium features, and share your creations.</p>
        <button 
          onClick={onLoginClick}
          style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
        >
          Log In / Sign Up
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
        <h2 style={{ margin: '0 0 16px 0' }}>Profile</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
            {user.email?.[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{user.email}</div>
            <div style={{ color: isPremium ? '#eab308' : '#94a3b8', fontWeight: 'bold' }}>
              {isPremium ? 'Premium Member 🌟' : 'Free Tier'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {!isPremium && (
            <button 
              onClick={() => setIsSubModalOpen(true)}
              style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Upgrade to Premium
            </button>
          )}
          <button 
            onClick={() => auth.signOut()}
            style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <SubscriptionModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} />
    </div>
  );
};
