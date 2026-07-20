import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/lib/firebase-client';
import { doc, setDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      if (mode === 'reset_password') {
        await sendPasswordResetEmail(auth, email);
        setMessage('✅ Password reset email sent! Check your inbox to reset your password.');
        return;
      }

      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCred.user.uid), {
          email: userCred.user.email,
          createdAt: new Date().toISOString(),
          isPremium: false,
        });

        // Trigger Firebase Auth Email Verification
        try {
          await sendEmailVerification(userCred.user);
        } catch (e) {
          console.warn('Firebase email verification send failed:', e);
        }
        
        // Trigger Custom Confirmation Email API
        try {
          await fetch('/api/email/send-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userCred.user.email, userId: userCred.user.uid }),
          });
        } catch (e) {
          console.warn('Confirmation email API dispatch failed:', e);
        }
      }
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters long.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button style={closeButtonStyle} onClick={onClose}>×</button>
        <h2 style={{ marginTop: 0 }}>
          {mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Reset Password'}
        </h2>

        {mode === 'reset_password' && (
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '-8px', marginBottom: '16px' }}>
            Enter your account email address and we&apos;ll send you a password reset link.
          </p>
        )}
        
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</p>}
        {message && <p style={{ color: '#10b981', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{message}</p>}
        
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          {mode !== 'reset_password' && (
            <div>
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <span 
                    onClick={() => { setMode('reset_password'); setError(''); setMessage(''); }}
                    style={{ fontSize: '0.75rem', color: '#66b2ff', cursor: 'pointer' }}
                  >
                    Forgot Password?
                  </span>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? 'Processing...' : (mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link')}
          </button>
        </form>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          {mode === 'reset_password' ? (
            <span 
              style={{ cursor: 'pointer', color: '#66b2ff', fontSize: '0.85rem' }} 
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
            >
              ← Back to Log In
            </span>
          ) : (
            <span 
              style={{ cursor: 'pointer', color: '#66b2ff', fontSize: '0.85rem' }} 
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Inline styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e',
  padding: '2rem',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '400px',
  position: 'relative',
  color: 'white',
  boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute', top: '10px', right: '15px',
  background: 'none', border: 'none', color: '#ccc',
  fontSize: '1.5rem', cursor: 'pointer'
};

const inputStyle: React.CSSProperties = {
  padding: '0.75rem', borderRadius: '4px', border: '1px solid #333',
  backgroundColor: '#2a2a2a', color: 'white', width: '100%', boxSizing: 'border-box'
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.75rem', borderRadius: '4px', border: 'none',
  backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold',
  cursor: 'pointer', width: '100%'
};
