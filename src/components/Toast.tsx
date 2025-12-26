import { useEffect, useState } from 'react'

export type ToastVariant = 'info' | 'success' | 'error'

interface ToastMessage {
  id: string
  text: string
  variant: ToastVariant
}

// Global toast state
let toastListeners: ((toasts: ToastMessage[]) => void)[] = []
let toasts: ToastMessage[] = []

function notifyListeners() {
  toastListeners.forEach(fn => fn([...toasts]))
}

export function showToast(text: string, variant: ToastVariant = 'info', duration = 2800) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  toasts = [...toasts, { id, text, variant }]
  notifyListeners()

  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notifyListeners()
  }, duration)
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: 'bg-gray-800 dark:bg-gray-700',
  success: 'bg-green-700 dark:bg-green-800',
  error: 'bg-red-700 dark:bg-red-800',
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    toastListeners.push(setCurrentToasts)
    return () => {
      toastListeners = toastListeners.filter(fn => fn !== setCurrentToasts)
    }
  }, [])

  if (currentToasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {currentToasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded text-sm text-white shadow-lg ${VARIANT_STYLES[toast.variant]}`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  )
}
