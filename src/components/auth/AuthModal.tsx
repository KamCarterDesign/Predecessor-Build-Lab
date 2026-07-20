import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '@/lib/firebase-client';
import { doc, setDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
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
        <h2 style={{ marginTop: 0 }}>{isLogin ? 'Log In' : 'Sign Up'}</h2>
        
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</p>}
        
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1rem', cursor: 'pointer', color: '#66b2ff' }} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </p>
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
