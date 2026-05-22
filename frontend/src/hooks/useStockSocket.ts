import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useStockStore } from '../store/stockStore';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'http://localhost:3000';

interface PriceEvent {
  symbol: string;
  price: number;
  timestamp: number;
}

export function useStockSocket(symbols: string[]) {
  const token = useAuthStore((s) => s.token);
  const updatePrice = useStockStore((s) => s.updatePrice);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${WS_URL}/stocks`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      symbols.forEach((symbol) => {
        socket.emit('subscribe-symbol', symbol);
      });
    });

    socket.on('price', (event: PriceEvent) => {
      updatePrice(event.symbol, event.price);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // Re-connect only when token changes; symbol list is stable at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
}
