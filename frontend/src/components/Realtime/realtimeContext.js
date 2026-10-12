import { createContext } from 'react';

// Shared WebSocket connection, provided by RealtimeProvider:
// { connected, connectionCount, subscribe(destination, handler) -> unsubscribe, publish(destination, body) }
export const RealtimeContext = createContext(null);
