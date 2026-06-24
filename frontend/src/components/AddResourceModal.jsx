// src/components/AddResourceModal.jsx
import { useState, useRef } from 'react';
import Modal from './Modal';
import { BRANCHES, SEMESTERS, TYPES } from '../constants';
import { isValidUrl } from '../utils.jsx';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import { api } from '../api';

// File types accepted by the file picker and validated on the backend
const ACCEPTED_MIME = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
].join(',');

const MAX_SIZE_MB = 20;

// Human-readable label shown under the file picker
function fileTypeLabel(mimeType) {
  if (!mimeType) return '';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.includes('word')) return 'Word document';
  return 'File';
}

export default function AddResourceModal({ onClose, onSubmit }) {
  const { user } = useAuth();
  const showToast = useToast();
  const fileInputRef = useRef(null);

  // 'text' | 'link' | 'file'
  const [contentType, setContentType] = useState('text');

  const [title,       setTitle]       = useState('');
  const [branch,      setBranch]      = useState(user?.branch || BRANCHES[0]);
  const [semester,    setSemester]    = useState(user?.semester || SEMESTERS[0]);
  const [subject,     setSubject]     = useState('');
  const [type,        setType]        = useState(Object.values(TYPES)[0]);
  const [description, setDescription] = useState('');
  const [content,     setContent]     = useState('');
  const [link,        setLink]        = useState('');
  const [tags,        setTags]        = useState('');

  // File upload state
  const [selectedFile,   setSelectedFile]   = useState(null);   // File object
  const [uploadedUrl,    setUploadedUrl]     = useState('');     // S3 URL after upload
  const [uploadProgress, setUploadProgress] = useState('idle'); // 'idle'|'uploading'|'done'|'error'

  const [submitting, setSubmitting] = useState(false);

  // ── file picker ────────────────────────────────────────────────────────────

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast(`File is too large — maximum is ${MAX_SIZE_MB}MB.`, true);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setUploadedUrl('');
    setUploadProgress('idle');
  }

  async function handleUploadFile() {
    if (!selectedFile) return;
    setUploadProgress('uploading');
    try {
      const result = await api.uploadFile(selectedFile);
      setUploadedUrl(result.url);
      setUploadProgress('done');
      showToast('File uploaded successfully.');
    } catch (err) {
      setUploadProgress('error');
      showToast(err.message, true);
    }
  }

  function clearFile() {
    setSelectedFile(null);
    setUploadedUrl('');
    setUploadProgress('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!title.trim())       return showToast('Please add a title.', true);
    if (!subject.trim())     return showToast('Please add a subject.', true);
    if (!description.trim()) return showToast('Please add a short description.', true);

    if (contentType === 'text' && !content.trim())
      return showToast('Please paste or write some notes, or switch to another tab.', true);
    if (contentType === 'link' && !link.trim())
      return showToast('Please add a link, or switch to another tab.', true);
    if (contentType === 'link' && !isValidUrl(link.trim()))
      return showToast("That link doesn't look valid — make sure it starts with http(s)://", true);
    if (contentType === 'file' && !uploadedUrl)
      return showToast('Please upload a file first, then click Publish.', true);

    setSubmitting(true);
    try {
      await onSubmit({
        title:       title.trim(),
        branch,
        semester,
        subject:     subject.trim(),
        type,
        description: description.trim(),
        content:     contentType === 'text' ? content.trim() : '',
        // For both 'link' and 'file' modes, we store a URL in the same `link` field.
        // The backend treats them identically — it's just a URL that gets rendered
        // as an "Open" button in the resource detail view.
        link:        contentType === 'link' ? link.trim()
                   : contentType === 'file' ? uploadedUrl
                   : '',
        tags: tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 8)
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      title="Add a resource"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Publishing…' : 'Publish to archive'}
          </button>
        </>
      }
    >
      {/* ── title ── */}
      <div className="field">
        <label>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Thermodynamics — Unit 2 Notes"
        />
      </div>

      {/* ── branch + semester ── */}
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

      {/* ── subject + type ── */}
      <div className="field-row">
        <div className="field">
          <label>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Thermodynamics"
          />
        </div>
        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPES).map(([label, code]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── description ── */}
      <div className="field">
        <label>Short description</label>
        <textarea
          style={{ minHeight: 54 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One or two lines describing what this covers"
        />
      </div>

      {/* ── content type selector ── */}
      <div className="field">
        <label>Content</label>
        <div className="seg" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className={contentType === 'text' ? 'active' : ''}
            onClick={() => setContentType('text')}
          >
            ✏️ Paste notes
          </button>
          <button
            type="button"
            className={contentType === 'link' ? 'active' : ''}
            onClick={() => setContentType('link')}
          >
            🔗 External link
          </button>
          <button
            type="button"
            className={contentType === 'file' ? 'active' : ''}
            onClick={() => setContentType('file')}
          >
            📎 Upload file
          </button>
        </div>

        {/* ── paste notes ── */}
        {contentType === 'text' && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste or write your notes here. Use **bold** for emphasis."
          />
        )}

        {/* ── external link ── */}
        {contentType === 'link' && (
          <>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://drive.google.com/…  or a YouTube link, etc."
            />
            <div className="hint">Paste a shareable link from Google Drive, OneDrive, YouTube, etc.</div>
          </>
        )}

        {/* ── file upload ── */}
        {contentType === 'file' && (
          <div style={{
            border: '1.5px dashed var(--border)',
            borderRadius: 7,
            padding: 16,
            background: 'var(--bg)'
          }}>
            {/* file picker */}
            {!selectedFile && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_MIME}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="file-upload-input"
                />
                <label
                  htmlFor="file-upload-input"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    padding: '10px 0'
                  }}
                >
                  <span style={{ fontSize: 32 }}>📂</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                    Click to choose a file
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                    PDF, JPG, PNG, GIF, WEBP, DOCX · Max {MAX_SIZE_MB}MB
                  </span>
                </label>
              </>
            )}

            {/* file chosen but not yet uploaded */}
            {selectedFile && uploadProgress === 'idle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>
                    {selectedFile.type === 'application/pdf' ? '📄'
                      : selectedFile.type.startsWith('image/') ? '🖼️'
                      : '📝'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{selectedFile.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                      {fileTypeLabel(selectedFile.type)} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={clearFile}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-accent"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleUploadFile}
                >
                  ☁ Upload to server
                </button>
              </div>
            )}

            {/* uploading spinner */}
            {uploadProgress === 'uploading' && (
              <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--ink-soft)' }}>
                <span className="skel" style={{ marginRight: 8 }} />
                Uploading <b>{selectedFile.name}</b>…
              </div>
            )}

            {/* upload succeeded */}
            {uploadProgress === 'done' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>✅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--green)' }}>
                    File uploaded successfully
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', wordBreak: 'break-all' }}>
                    {selectedFile.name}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={clearFile}
                  title="Replace file"
                >
                  Replace
                </button>
              </div>
            )}

            {/* upload failed */}
            {uploadProgress === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ color: 'var(--red)', fontSize: 13 }}>
                  ⚠️ Upload failed — check your connection and try again.
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setUploadProgress('idle')}
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── tags ── */}
      <div className="field">
        <label>Tags <span style={{ textTransform: 'none', fontWeight: 400 }}>(comma separated)</span></label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. midterm, formulas, unit2"
        />
      </div>
    </Modal>
  );
}
