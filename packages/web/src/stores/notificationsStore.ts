import { create } from 'zustand'

interface NotificationsState {
  count: number
  increment: () => void
  clear: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  clear: () => set({ count: 0 }),
}))