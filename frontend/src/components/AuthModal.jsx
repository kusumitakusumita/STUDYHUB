// src/components/AuthModal.jsx
import { useState } from 'react';
import Modal from './Modal';
import { BRANCHES, SEMESTERS } from '../constants';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

export default function AuthModal({ onClose }) {
  const { applySession } = useAuth();
  const showToast = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [semester, setSemester] = useState(SEMESTERS[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!name.trim() || !password) {
      setError('Please fill in your name and password.');
      return;
    }
    setSubmitting(true);
    try {
      const body = mode === 'login'
        ? { name: name.trim(), password }
        : { name: name.trim(), password, branch, semester };
      const result = mode === 'login' ? await api.login(body) : await api.register(body);
      applySession(result);
      showToast(mode === 'login' ? `Welcome back, ${result.user.name}!` : `Welcome, ${result.user.name}!`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={mode === 'login' ? 'Log in' : 'Create your account'}
      onClose={onClose}
      footer={
        <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      }
    >
      {error && <div className="error-text">{error}</div>}
      {mode === 'register' && (
        <p className="hint" style={{ marginBottom: 14 }}>
          Your name is attached to anything you upload, comment on, or request — so classmates know who to thank.
        </p>
      )}

      <div className="field">
        <label>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ananya Sharma" onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} />
      </div>
      <div className="field">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'} onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} />
      </div>

      {mode === 'register' && (
        <div className="field-row">
          <div className="field">
            <label>Branch</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Semester</label>
            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="auth-switch">
        {mode === 'login' ? (
          <>New here? <button className="link-btn" onClick={() => { setMode('register'); setError(''); }}>Create an account</button></>
        ) : (
          <>Already have an account? <button className="link-btn" onClick={() => { setMode('login'); setError(''); }}>Log in</button></>
        )}
      </div>
    </Modal>
  );
}
