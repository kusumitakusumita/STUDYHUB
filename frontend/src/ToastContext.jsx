// src/ToastContext.jsx
//
// Lets any component call showToast("message") to pop up a small
// notification at the bottom of the screen, without prop-drilling a
// callback through every layer of the component tree.

import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className={`toast${toast.isError ? ' error' : ''}`}>{toast.message}</div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
