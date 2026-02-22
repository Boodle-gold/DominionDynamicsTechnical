import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * WebSocket hook for real-time vessel updates.
 */
export function useWebSocket(onMessage) {
    const [connected, setConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const onMessageRef = useRef(onMessage);

    // Keep callback ref fresh
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const connect = useCallback(() => {
        // Build WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.host;
        const defaultUrl = `${protocol}://${host}/ws/vessels/`;
        const url = import.meta.env.VITE_WS_URL || defaultUrl;

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WS] Connected');
                setConnected(true);
                if (reconnectTimerRef.current) {
                    clearTimeout(reconnectTimerRef.current);
                    reconnectTimerRef.current = null;
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessageRef.current(data);
                } catch (err) {
                    console.error('[WS] Parse error:', err);
                }
            };

            ws.onclose = () => {
                console.log('[WS] Disconnected, reconnecting in 3s...');
                setConnected(false);
                reconnectTimerRef.current = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error('[WS] Error:', err);
                ws.close();
            };
        } catch (err) {
            console.error('[WS] Connection failed:', err);
            reconnectTimerRef.current = setTimeout(connect, 3000);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, [connect]);

    return { connected };
}

