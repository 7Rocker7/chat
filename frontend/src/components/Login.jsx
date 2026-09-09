import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';

export default function Login({ setAuthToken, setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();

    // Enforce letters only (A-Z, a-z)
    const letterOnlyRegex = /^[A-Za-z]+$/;
    if (!letterOnlyRegex.test(trimmedName)) {
      setError('Name can only contain letters (A-Z, a-z). No numbers, spaces, or special characters allowed.');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 25) {
      setError('Name must be between 2 and 25 characters long.');
      return;
    }

    const endpoint = isLogin ? '/api/login' : '/api/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuthToken(data.token);
      setUser(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-box">
        <div className="brand-logo-container">
          <div className="brand-orb">
            <Radio size={28} color="#fff" />
          </div>
          <h1 className="brand-title">Chat</h1>
          <p className="brand-tagline">Real-Time Messaging & Media</p>
        </div>

        <h2 style={{ fontSize: '18px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
          {isLogin ? 'Welcome Back' : 'Create an Account'}
        </h2>

        {error && <div className="status-badge status-error" style={{ justifyContent: 'center' }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username / Name (Letters Only)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Alex (No numbers or symbols)"
              autoComplete="username"
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Letters only (A-Z, a-z) • Case-insensitive
            </span>
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          <button type="submit" className="primary-button">
            {isLogin ? 'Enter Chat' : 'Join Chat'}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "Need an account? " : "Already registered? "}
          <span onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}>
            {isLogin ? "Create one now" : "Log In"}
          </span>
        </div>
      </div>
    </div>
  );
}
