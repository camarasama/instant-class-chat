// src/contexts/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('🔄 Initializing socket connection...');
      
      // Create socket connection
      const newSocket = io('http://localhost:5000', {
        withCredentials: true,
        transports: ['websocket', 'polling'], // Fallback transports
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        setIsConnected(true);
        setConnectionError(null);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
        setConnectionError('Disconnected from server');
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        setIsConnected(false);
        setConnectionError('Failed to connect to server');
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
        setConnectionError(null);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection error:', error);
        setConnectionError('Reconnection failed');
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Socket reconnection failed');
        setConnectionError('Unable to reconnect to server');
      });

      setSocket(newSocket);

      return () => {
        console.log('🧹 Cleaning up socket connection');
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
        setConnectionError(null);
      };
    } else {
      // Clean up if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setConnectionError(null);
      }
    }
  }, [user]); // Reconnect when user changes

  const value = {
    socket,
    isConnected,
    connectionError,
    // Helper function to manually check connection
    checkConnection: () => socket?.connected || false,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};