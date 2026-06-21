import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { TOKEN_KEY } from './api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type KitchenEvent =
  | { type: 'order:new'; order: unknown }
  | { type: 'order:item:updated'; payload: { orderId: string; itemId: string; status: string } }
  | { type: 'order:ready'; order: unknown }
  | { type: 'order:cancelled'; orderId: string };

/**
 * Connects to the /kitchen Socket.IO namespace (JWT in handshake auth) and
 * invokes `onEvent` for each real-time kitchen event. Exposes live connection
 * status so the UI can show an online/offline indicator.
 */
export function useKitchenSocket(onEvent: (e: KitchenEvent) => void) {
  const [connected, setConnected] = useState(false);
  // Keep latest callback without re-subscribing the socket on every render
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const socket: Socket = io(`${API_URL}/kitchen`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('order:new', (order) => handler.current({ type: 'order:new', order }));
    socket.on('order:item:updated', (payload) =>
      handler.current({ type: 'order:item:updated', payload }),
    );
    socket.on('order:ready', (order) => handler.current({ type: 'order:ready', order }));
    socket.on('order:cancelled', ({ orderId }: { orderId: string }) =>
      handler.current({ type: 'order:cancelled', orderId }),
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  return { connected };
}
