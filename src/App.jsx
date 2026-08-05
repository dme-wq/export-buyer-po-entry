import React, { useState, useEffect } from 'react';
import Form from './components/Form';
import { Package, Lock, Clock, CheckCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

function App() {
  const [userEmail, setUserEmail] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Current time formatting
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }).replace(/ /g, '-') + ' ' + now.toLocaleTimeString('en-GB');
      setCurrentTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setUserEmail(storedEmail);
    }
    setIsAuthChecking(false);
  }, []);

  const handleLoginSuccess = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    const email = decoded.email;
    if (email) {
      localStorage.setItem('userEmail', email);
      setUserEmail(email);
    }
  };

  const handleLoginError = () => {
    console.error('Google Login Failed');
    alert('Google Login Failed. Please try again.');
  };

  if (isAuthChecking) {
    return null; // Avoid flicker
  }

  // Authentication Gate (Login Screen)
  if (!userEmail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div className="glass-panel animate-slide-up" style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem' }}>
          <div className="app-logo" style={{ marginBottom: '1.5rem', justifyContent: 'center' }}>
            <img 
              src="https://static.wixstatic.com/media/68b92a_d71e34133826499983234774dea1945b~mv2.png/v1/fill/w_186,h_156,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/RKD-Logo.png" 
              alt="RKD Logo" 
              style={{ height: '64px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <h1 style={{ color: 'var(--text-heading)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Secure Access</h1>
          <p style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>Please sign in with your Google account to access the PO Entry WebForm.</p>
          
          <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            useOneTap
            shape="pill"
            theme="outline"
            text="continue_with"
            size="large"
          />
        </div>
      </div>
    );
  }

  // Authenticated State (WebForm Screen)
  return (
    <>
      <header className="app-header animate-slide-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
          <div className="app-logo" style={{ marginBottom: 0 }}>
            <img 
              src="https://static.wixstatic.com/media/68b92a_d71e34133826499983234774dea1945b~mv2.png/v1/fill/w_186,h_156,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/RKD-Logo.png" 
              alt="RKD Logo" 
              style={{ height: '56px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <p style={{ margin: 0 }}>Export Buyer Purchase Order Entry</p>
        </div>
        
        {/* Header Profile Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', fontSize: '0.75rem', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <Clock size={12} /> {currentTime}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success-color)', fontWeight: 600 }}>
              <CheckCircle size={12} /> {userEmail} 
              <button type="button" onClick={() => {
                 localStorage.removeItem('userEmail');
                 setUserEmail(null);
              }} style={{color: 'var(--error-color)', border: 'none', background: 'none', marginLeft: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', background: '#ffebee'}}>Sign Out</button>
          </div>
        </div>
      </header>
      
      <main className="container animate-slide-up delay-1">
        <div className="animated-border-wrapper">
          <div className="glass-panel">
            <Form authenticatedEmail={userEmail} onLogout={() => {
              localStorage.removeItem('userEmail');
              setUserEmail(null);
            }} />
          </div>
        </div>
      </main>
    </>
  );
}

export default App;
