import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  tone: 'success' | 'error' | 'info' | 'warning'
}

interface ToastState {
  toasts: Toast[]
  dismiss: (id: string) => void
  show: (message: string, tone?: Toast['tone']) => void
}

const nextId = () => crypto.randomUUID()

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  show: (message, tone = 'info') => {
    const id = nextId()
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), 4000)
  },
}))

export const toast = {
  success: (message: string) => useToastStore.getState().show(message, 'success'),
  error: (message: string) => useToastStore.getState().show(message, 'error'),
  info: (message: string) => useToastStore.getState().show(message, 'info'),
  warning: (message: string) => useToastStore.getState().show(message, 'warning'),
}
