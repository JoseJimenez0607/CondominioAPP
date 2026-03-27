import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '@/store/authStore';

let socketInstance = null;

export function getSocket() {
  return socketInstance;
}

export function useSocket(handlers = {}) {
  const token   = useAuthStore((s) => s.token);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io(import.meta.env.VITE_SOCKET_URL || '', {
        auth:              { token },
        transports:        ['websocket'],
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });
    }

    socketRef.current = socketInstance;

    // Registrar handlers del componente
    Object.entries(handlers).forEach(([event, handler]) => {
      socketInstance.on(event, handler);
    });

    return () => {
      // Limpiar handlers al desmontar
      Object.entries(handlers).forEach(([event, handler]) => {
        socketInstance?.off(event, handler);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return socketRef.current;
}
