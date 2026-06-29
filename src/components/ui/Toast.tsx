import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { CheckCircle } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  function removeToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDone={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDone }: { toast: ToastItem; onDone: (id: number) => void }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDone(toast.id), 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onDone])

  return (
    <div
      className={`
        pointer-events-auto
        flex items-center gap-3
        px-5 py-3.5 rounded-xl
        shadow-[0_8px_32px_rgba(0,0,0,0.5)]
        border backdrop-blur-xl
        transition-all duration-300 ease-out
        ${toast.type === 'success'
          ? 'bg-[#1a2332]/95 border-green-500/30 text-white'
          : 'bg-[#1a2332]/95 border-red-500/30 text-white'
        }
        ${exiting ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100 translate-x-0 scale-100'}
      `}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        toast.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
      }`}>
        <CheckCircle size={18} className={toast.type === 'success' ? 'text-green-400' : 'text-red-400'} />
      </div>
      <div>
        <p className="text-sm font-bold">{toast.message}</p>
      </div>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
