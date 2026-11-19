import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export type WorldPresence = {
  online: number | null;
  connected: boolean;
  emitMove: (x: number, y: number, mapId: string) => void;
  joinMap: (mapId: string) => void;
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
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    if (!enabled) {
      setOnline(null);
      setConnected(false);
      return;
    }

    const s = io(socketEndpoint(), { withCredentials: true });
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => {
      setConnected(false);
      setOnline(null);
    });
    s.on('connect_error', () => setConnected(false));
    s.on('world:presence', (payload: { online?: number }) => {
      if (typeof payload?.online === 'number') setOnline(payload.online);
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, [enabled]);

  const emitMove = (x: number, y: number, mapId: string) => {
    if (socket) socket.emit('world:move', { x, y, mapId });
  };

  const joinMap = (mapId: string) => {
    if (socket) socket.emit('world:join-map', { mapId });
  };

  return { online, connected, emitMove, joinMap };
}