import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export type WorldPresence = {
  online: number | null;
  connected: boolean;
};

function socketEndpoint(): string {
  const configured = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');
  const base = configured.replace(/\/api\/?$/, '');
  return `${base}/game`;
}

/**
 * Assina a presença do mundo no namespace `/game`. A sessão viaja no cookie
 * HttpOnly, por isso `withCredentials` é obrigatório e nenhum token é exposto
 * ao JavaScript.
 */
export function useWorldPresence(enabled: boolean): WorldPresence {
  const [online, setOnline] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOnline(null);
      setConnected(false);
      return;
    }

    const socket = io(socketEndpoint(), { withCredentials: true });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => {
      setConnected(false);
      setOnline(null);
    });
    socket.on('connect_error', () => setConnected(false));
    socket.on('world:presence', (payload: { online?: number }) => {
      if (typeof payload?.online === 'number') setOnline(payload.online);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled]);

  return { online, connected };
}
