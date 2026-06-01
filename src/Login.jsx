import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // Evaluate multi-tenant path routing context alongside real-time input fields
  const currentPath = window.location.pathname.toLowerCase();
  
  const isGandiva = 
    currentPath.includes('gandiva') || 
    email.toLowerCase().includes('gandiva');

  const portal = isGandiva ? 'gandiva' : 'leodoesit';

  const themeColor = isGandiva ? '#4F46E5' : '#10B981';
  const companyName = isGandiva ? 'Gandiva Insights' : 'Leodoes It';

  // Dynamic title-bar and tab updates reflecting the active tenant workspace
  useEffect(() => {
    document.title = `${companyName} Portal Login`;
    
    // Dynamically toggle default tab favicons safely
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = '/vite.svg';
  }, [companyName]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            password,
            portal
          })
        }
      );

      const data = await response.json();
      console.log("LOGIN RESPONSE:", data);

      if (data.success) {
        const userId = data.data.id;

        // Save active session payload variables
        sessionStorage.setItem(`user_${userId}`, JSON.stringify(data.data));

        if (data.token) {
          sessionStorage.setItem(`token_${userId}`, data.token);
        }

        // Redirect safely with uid param intact
        if (data.data.role === 'ADMIN') {
          navigate(`/admin/queue?uid=${userId}`);
        } else {
          navigate(`/portal?uid=${userId}`);
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Is backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Right panel */}
      <div style={styles.rightPanel}>
        <div style={styles.loginBox}>
          {/* Highlight top branding border accent dynamically */}
          <div style={{ ...styles.topAccentBar, backgroundColor: themeColor }} />

          {/* ========================================================================= */}
          {/* 🔥 BRANDING REDACTION FIXED: Extraneous brand text layouts removed completely */}
          {/* ========================================================================= */}

          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Enter your work email to access your portal.</p>

          {error && (
            <div style={styles.errorBox}>
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={styles.form}>
            {/* Email */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Work Email Address</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  ...styles.input,
                  border: email
                    ? `1px solid ${themeColor}66`
                    : '1px solid #D1D5DB'
                }}
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
                disabled={isLoading}
              />
            </div>

            {/* Button */}
            <button
              type="submit"
              style={{
                ...styles.button,
                backgroundColor: themeColor
              }}
              disabled={isLoading || !email || !password}
            >
              {isLoading ? 'Authenticating...' : 'Sign In ➔'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    fontFamily: 'system-ui, sans-serif',
    backgroundColor: '#F3F4F6',
    overflow: 'hidden'
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  loginBox: {
    position: 'relative',
    backgroundColor: 'white',
    padding: '40px 50px',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '100%',
    maxWidth: '480px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    // Generates a clean top margin spacing adjustment due to missing brand row
    paddingTop: '45px'
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '5px',
    transition: 'background-color 0.4s ease'
  },
  title: {
    fontSize: '24px',
    margin: '0 0 6px 0',
    color: '#111827',
    fontWeight: '700'
  },
  subtitle: {
    color: '#6B7280',
    margin: '0 0 25px 0',
    fontSize: '15px'
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    border: '1px solid #FECACA',
    fontWeight: '500'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '15px',
    backgroundColor: '#F9FAFB',
    border: '1px solid #D1D5DB',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease'
  },
  button: {
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
    width: '100%',
    transition: 'background 0.4s ease'
  }
};