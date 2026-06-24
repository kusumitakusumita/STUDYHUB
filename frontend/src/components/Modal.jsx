// src/components/Modal.jsx
import { useEffect } from 'react';

export default function Modal({ title, onClose, children, footer, hideClose = false }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && !hideClose) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, hideClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !hideClose) onClose(); }}
    >
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          {!hideClose && <button className="modal-close" onClick={onClose}>✕</button>}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
