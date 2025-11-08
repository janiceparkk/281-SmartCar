/**
 * WebSocket Hook for Real-time Device Updates
 *
 * Connects to backend WebSocket server and listens for:
 * - device_status_update: Device connection state changes
 * - car_status_update: Car telemetry updates
 * - new_alert: Audio events and alerts
 */

import { useEffect, useState, useCallback, useRef } from 'react';

const WS_URL = 'ws://localhost:3001';

const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [devices, setDevices] = useState(new Map());
  const [cars, setCars] = useState(new Map());
  const [alerts, setAlerts] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to backend');
        setIsConnected(true);

        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);

          // Handle different message types
          switch (message.topic) {
            case 'device_status_update':
              handleDeviceUpdate(message.data);
              break;
            case 'car_status_update':
              handleCarUpdate(message.data);
              break;
            case 'new_alert':
              handleNewAlert(message.data);
              break;
            default:
              console.log('[WebSocket] Unknown message type:', message.topic);
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        setIsConnected(false);

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocket] Attempting to reconnect...');
          connect();
        }, 5000);
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
    }
  }, []);

  const handleDeviceUpdate = useCallback((data) => {
    setDevices((prev) => {
      const newDevices = new Map(prev);
      newDevices.set(data.device_id, {
        ...data,
        lastUpdate: new Date()
      });
      return newDevices;
    });
  }, []);

  const handleCarUpdate = useCallback((data) => {
    setCars((prev) => {
      const newCars = new Map(prev);
      newCars.set(data.car_id, {
        ...data,
        lastUpdate: new Date()
      });
      return newCars;
    });
  }, []);

  const handleNewAlert = useCallback((data) => {
    setAlerts((prev) => [data, ...prev].slice(0, 50)); // Keep last 50 alerts
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Send message to backend
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    devices: Array.from(devices.values()),
    cars: Array.from(cars.values()),
    alerts,
    sendMessage,
    reconnect: connect
  };
};

export default useWebSocket;
