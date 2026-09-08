import { io, type Socket } from 'socket.io-client'

import { useAuthStore } from '@/stores/authStore'

let socket: Socket | null = null

export function connectSocket(): Socket {
  if (socket?.connected) return socket
  const token = useAuthStore.getState().accessToken
  if (socket) {
    socket.connect()
    return socket
  }
  socket = io({
    autoConnect: false,
    auth: { token },
    transports: ['websocket'],
  })
  socket.connect()
  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}