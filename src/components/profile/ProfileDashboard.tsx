import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase-client';
import { sendPasswordResetEmail, sendEmailVerification, deleteUser } from 'firebase/auth';
import { SubscriptionModal } from '@/components/premium/SubscriptionModal';

export const ProfileDashboard: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
  const { user, isPremium } = useAuth();
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

  const handleSendResetEmail = async () => {
    if (!user.email) return;
    setLoadingAction(true);
    setActionMessage('');
    setActionError('');
    try {
      await sendPasswordResetEmail(auth, user.email);
      setActionMessage('✅ Password reset instructions sent to your email!');
    } catch (err: any) {
      setActionError(err.message || 'Failed to send password reset email');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    setLoadingAction(true);
    setActionMessage('');
    setActionError('');
    try {
      await sendEmailVerification(user);
      setActionMessage('✅ Verification email dispatched! Please check your inbox.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to send verification email');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoadingAction(true);
    setActionMessage('');
    setActionError('');
    try {
      await deleteUser(user);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete account. You may need to log out and log in again before deleting your account.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out', maxWidth: '800px', margin: '0 auto' }}>
      {/* 1. Account Summary Card */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem' }}>Account & Profile</h2>
        
        {actionMessage && (
          <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '16px' }}>
            {actionMessage}
          </div>
        )}

        {actionError && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '16px' }}>
            {actionError}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', border: '2px solid rgba(255,255,255,0.1)' }}>
            {user.email?.[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{user.email}</div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ color: isPremium ? '#eab308' : '#94a3b8', fontWeight: 'bold', fontSize: '0.875rem' }}>
                {isPremium ? 'Premium Member 🌟' : 'Free Tier'}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: user.emailVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: user.emailVerified ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                {user.emailVerified ? 'Email Verified ✓' : 'Email Unverified'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {!isPremium && (
            <button 
              onClick={() => setIsSubModalOpen(true)}
              style={{ padding: '10px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Upgrade to Premium 🌟
            </button>
          )}
          <button 
            onClick={() => auth.signOut()}
            style={{ padding: '10px 18px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* 2. Security & Password Tools Card */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem' }}>Account Security & Recovery</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '16px' }}>
          Manage your password or request email verification links.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            disabled={loadingAction}
            onClick={handleSendResetEmail}
            style={{ padding: '8px 16px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            🔑 Send Password Reset Link
          </button>

          {!user.emailVerified && (
            <button
              disabled={loadingAction}
              onClick={handleSendVerificationEmail}
              style={{ padding: '8px 16px', background: '#1e293b', border: '1px solid #334155', color: '#f59e0b', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
            >
              ✉️ Resend Verification Email
            </button>
          )}
        </div>
      </div>

      {/* 3. Danger Zone */}
      <div style={{ background: '#111827', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#ef4444' }}>Danger Zone</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
          Permanently delete your account and custom data from Predecessor Labs.
        </p>
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
        >
          Delete Account
        </button>
      </div>

      <SubscriptionModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e1e1e', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%', color: 'white', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <h3 style={{ marginTop: 0, color: '#ef4444' }}>Delete Account</h3>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ padding: '8px 16px', background: '#334155', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={loadingAction} style={{ padding: '8px 16px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                {loadingAction ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
