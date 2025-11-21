import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
// We will create this CSS module next
import styles from './Login.module.css'; 

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();

  // Default credentials for demo purposes (matches your mock data)
  const [email, setEmail] = useState('admin@jslab.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');

  // Determine where to redirect after login (default to dashboard)
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Redirect to the page they tried to visit, or home
        navigate(from, { replace: true });
      } else {
        setError(result.message || 'Failed to log in');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    }
  };

  return (
    <div className={`card ${styles.loginCard}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Welcome Back</h2>
        <p className={styles.subtitle}>Please sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="error-text" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading} 
          className={styles.loginBtn}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className={styles.footer}>
        <a href="#" className={styles.forgotLink}>Forgot password?</a>
      </div>
    </div>
  );
};

export default Login;