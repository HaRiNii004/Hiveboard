import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { RealtimeContext } from './realtimeContext';
import { getToken } from '../../utils/authSession';

const TOKEN_CHECK_MS = 2000; // notice log in / log out without a page reload
const RECONNECT_MS = 3000;
const HEARTBEAT_MS = 10000;

// Same origin as the page; Vite proxies /ws to the backend in development
const brokerUrl = () => `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

// One STOMP connection for the whole app (opened only while logged in).
//
// - subscribe(destination, handler) keeps working across reconnects: every
//   subscription is re-made each time the connection comes back.
// - connectionCount goes up on every (re)connect. Events missed while disconnected
//   are gone, so pages watch it and refetch from REST to resync.
export default function RealtimeProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const clientRef = useRef(null);
  const subscriptions = useRef(new Map()); // id -> { destination, handler, stompSubscription }
  const nextId = useRef(0);

  useEffect(() => {
    let currentToken = null;

    const stop = () => {
      const client = clientRef.current;
      clientRef.current = null;
      if (client) client.deactivate();
      subscriptions.current.forEach(entry => { entry.stompSubscription = null; });
      setConnected(false);
    };

    const start = (token) => {
      const client = new Client({
        brokerURL: brokerUrl(),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: RECONNECT_MS,
        heartbeatIncoming: HEARTBEAT_MS,
        heartbeatOutgoing: HEARTBEAT_MS,
        debug: () => {},
        onConnect: () => {
          subscriptions.current.forEach(entry => {
            entry.stompSubscription = client.subscribe(entry.destination, entry.deliver);
          });
          setConnected(true);
          setConnectionCount(count => count + 1);
        },
        onWebSocketClose: () => {
          subscriptions.current.forEach(entry => { entry.stompSubscription = null; });
          setConnected(false);
        },
        onStompError: (frame) => {
          // A rejected token won't get better by retrying; wait for a new login
          if ((frame.headers.message || '').toLowerCase().includes('token')) {
            stop();
          }
        }
      });
      clientRef.current = client;
      client.activate();
    };

    const sync = () => {
      const token = getToken();
      if (token === currentToken) return;
      currentToken = token;
      stop();
      if (token) start(token);
    };

    sync();
    const interval = setInterval(sync, TOKEN_CHECK_MS);
    // Cleanup also covers React StrictMode mounting effects twice in development
    return () => {
      clearInterval(interval);
      stop();
    };
  }, []);

  const subscribe = useCallback((destination, handler) => {
    const id = nextId.current++;
    const entry = {
      destination,
      deliver: (message) => {
        try {
          handler(JSON.parse(message.body));
        } catch (err) {
          console.error('Bad realtime message on', destination, err);
        }
      },
      stompSubscription: null
    };
    subscriptions.current.set(id, entry);

    const client = clientRef.current;
    if (client && client.connected) {
      entry.stompSubscription = client.subscribe(destination, entry.deliver);
    }

    return () => {
      subscriptions.current.delete(id);
      if (entry.stompSubscription) {
        try {
          entry.stompSubscription.unsubscribe();
        } catch {
          // connection already gone
        }
      }
    };
  }, []);

  // Fire-and-forget; dropped while disconnected (presence/cursors are re-sent on reconnect)
  const publish = useCallback((destination, body = {}) => {
    const client = clientRef.current;
    if (client && client.connected) {
      client.publish({ destination, body: JSON.stringify(body) });
    }
  }, []);

  const value = useMemo(
    () => ({ connected, connectionCount, subscribe, publish }),
    [connected, connectionCount, subscribe, publish]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
