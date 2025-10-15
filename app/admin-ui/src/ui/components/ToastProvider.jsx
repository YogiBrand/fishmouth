import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { X } from 'lucide-react'

const ToastContext = createContext({
  pushToast: () => {},
})

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(({ title, tone = 'info', timeout = 5000 }) => {
    const id = ++idCounter
    setToasts((current) => [...current, { id, title, tone }])
    if (timeout) {
      setTimeout(() => remove(id), timeout)
    }
  }, [remove])

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone === 'error' ? 'error' : 'info'}`}>
            <span>{toast.title}</span>
            <button type="button" onClick={() => remove(toast.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
