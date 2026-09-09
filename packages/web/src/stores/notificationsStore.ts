import { create } from 'zustand'

export interface Notification {
  id: string
  type:
    'ticket_created' | 'ticket_assigned' | 'approval_pending' | 'sla_breached' | 'ticket_commented'
  title: string
  message: string
  ticketId?: string
  read: boolean
  createdAt: string
}

interface NotificationsState {
  notifications: Notification[]
  count: number
  add: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  clearAll: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  count: 0,
  add: (n) =>
    set((state) => {
      const notification: Notification = {
        ...n,
        id: crypto.randomUUID(),
        read: false,
        createdAt: new Date().toISOString(),
      }
      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        count: state.count + 1,
      }
    }),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      count: Math.max(0, state.count - 1),
    })),
  clearAll: () => set({ notifications: [], count: 0 }),
}))
