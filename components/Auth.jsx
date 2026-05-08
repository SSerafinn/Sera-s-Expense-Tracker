"use client";
import { useState } from 'react';
import { useStateContext } from './StateContext';

export default function Auth() {
  const { login, register } = useStateContext();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isLogin) {
      const success = await login(username, password);
      if (!success) setError('Invalid credentials');
    } else {
      const success = await register(username, password);
      if (success) {
        setIsLogin(true);
        setUsername('');
        setPassword('');
        alert("Registration successful! Please login.");
      } else {
        setError('Registration failed. Username may exist.');
      }
    }
  };

  return (
    <div className="auth-layout" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card glass" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div style={{ color: 'var(--color-danger)', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
          <button type="submit" className="primary-btn" style={{ width: '100%' }}>Submit</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
            {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
          </a>
        </p>
      </div>
    </div>
  );
}
