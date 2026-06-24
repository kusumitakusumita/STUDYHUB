// src/components/AddRequestModal.jsx
import { useState } from 'react';
import Modal from './Modal';
import { BRANCHES, SEMESTERS } from '../constants';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

export default function AddRequestModal({ onClose, onSubmit }) {
  const { user } = useAuth();
  const showToast = useToast();

  const [title, setTitle] = useState('');
  const [branch, setBranch] = useState(user?.branch || BRANCHES[0]);
  const [semester, setSemester] = useState(user?.semester || SEMESTERS[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return showToast("Please describe what you're looking for.", true);
    if (!subject.trim()) return showToast('Please add a subject.', true);

    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), branch, semester, subject: subject.trim(), description: description.trim() });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Request a resource"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Posting…' : 'Post request'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>What do you need?</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Looking for Surveying Unit 3 notes" />
      </div>
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
      <div className="field">
        <label>Subject</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Surveying" />
      </div>
      <div className="field">
        <label>More details</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any specifics — unit, professor, exam it's for, etc." />
      </div>
    </Modal>
  );
}
