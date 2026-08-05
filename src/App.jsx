import React, { useState, useEffect } from 'react';
import Form from './components/Form';
import { Package, Lock } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

function App() {
  const [userEmail, setUserEmail] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

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
          <div className="app-logo" style={{ marginBottom: '1.5rem' }}>
            <Lock color="var(--accent-color)" size={28} />
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
        <div className="app-logo">
          <Package color="var(--accent-color)" size={24} />
        </div>
        <h1>Order to Dispatch</h1>
        <p>Premium WebForm for Buyer PO Entry</p>
      </header>
      
      <main className="container animate-slide-up delay-1">
        <div className="glass-panel">
          <Form authenticatedEmail={userEmail} onLogout={() => {
            localStorage.removeItem('userEmail');
            setUserEmail(null);
          }} />
        </div>
      </main>
    </>
  );
}

export default App;
