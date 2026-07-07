import { io } from 'socket.io-client'

let socket = null

/**
 * Connect to the Socket.io server with authentication.
 * @param {string} token - JWT token for authentication
 * @returns {import('socket.io-client').Socket} The socket instance
 */
export const connectSocket = (token) => {
  if (socket?.connected) {
    return socket
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || '/'
  socket = io(socketUrl, {
    autoConnect: false,
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  })

  socket.connect()

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message)
  })

  return socket
}

/**
 * Disconnect the socket if it is connected.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
    console.log('[Socket] Manually disconnected')
  }
}

/**
 * Get the current socket instance.
 * @returns {import('socket.io-client').Socket | null}
 */
export const getSocket = () => socket
