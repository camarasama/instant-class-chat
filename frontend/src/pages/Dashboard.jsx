// src/pages/Dashboard.jsx - Updated connection section
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';
import ChannelList from '../components/channels/ChannelList.jsx';
import MessageList from '../components/messages/MessageList.jsx';
import MessageInput from '../components/messages/MessageInput.jsx';
import { channelAPI } from '../services/api.js';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected, connectionError } = useSocket();
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debug connection status
  useEffect(() => {
    console.log('📡 Connection Status:', {
      isConnected,
      connectionError,
      socketExists: !!socket,
      socketConnected: socket?.connected
    });
  }, [isConnected, connectionError, socket]);

  useEffect(() => {
    if (socket && isConnected) {
      console.log('🎯 Setting up socket listeners for active channel:', activeChannel?.name);

      const handleNewMessage = (message) => {
        console.log('📨 New message received:', message);
        if (message.channelId === activeChannel?.id) {
          setMessages(prev => [...prev, message]);
        }
      };

      const handleMessageError = (error) => {
        console.error('❌ Message error:', error);
        alert(`Failed to send message: ${error.error}`);
      };

      // Remove any existing listeners first
      socket.off('new_message');
      socket.off('message_error');

      // Add new listeners
      socket.on('new_message', handleNewMessage);
      socket.on('message_error', handleMessageError);

      return () => {
        console.log('🧹 Cleaning up socket listeners');
        socket.off('new_message', handleNewMessage);
        socket.off('message_error', handleMessageError);
      };
    }
  }, [socket, isConnected, activeChannel]);

  const handleChannelSelect = async (channel) => {
    console.log('🔄 Selecting channel:', channel.name);
    setActiveChannel(channel);
    setLoading(true);
    
    try {
      // Load channel details with messages
      const response = await channelAPI.getById(channel.id);
      const channelMessages = response.data.data.messages || [];
      console.log('📨 Channel messages loaded:', channelMessages.length);
      setMessages(channelMessages);
      
      // Join the channel room for real-time updates
      if (socket && isConnected) {
        socket.emit('join_channel', channel.id);
        console.log('✅ Joined channel room:', channel.id);
      } else {
        console.warn('⚠️ Cannot join channel room: Socket not connected');
      }
    } catch (error) {
      console.error('❌ Failed to load channel messages:', error);
      alert('Failed to load channel messages: ' + (error.response?.data?.message || error.message));
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (messageText) => {
    if (!activeChannel) {
      console.error('❌ No active channel selected');
      alert('Please select a channel first');
      return;
    }

    if (!socket || !isConnected) {
      console.error('❌ Socket not connected, cannot send message');
      alert('Not connected to chat server. Please check your connection.');
      return;
    }

    console.log('🔄 Sending message:', { channelId: activeChannel.id, text: messageText });

    try {
      // Send message via Socket.IO
      socket.emit('send_message', {
        channelId: activeChannel.id,
        text: messageText
      });
      console.log('✅ Message sent via socket');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      alert('Failed to send message: ' + (error.message || 'Unknown error'));
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleReconnect = () => {
    if (socket) {
      socket.connect();
    }
  };

  const canSendMessages = isConnected && !loading && activeChannel;

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Class Chat</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? '🟢 Online' : '🔴 Offline'}
                </span>
                {connectionError && (
                  <span className="text-sm text-red-600">• {connectionError}</span>
                )}
                {!isConnected && socket && (
                  <button
                    onClick={handleReconnect}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name || user?.username}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user?.role === 'INSTRUCTOR' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {user?.role === 'INSTRUCTOR' ? '👨‍🏫 Instructor' : '👨‍🎓 Student'}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Connection Status Banner */}
      {connectionError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-red-600">⚠️</span>
              <span className="text-red-700 text-sm">{connectionError}</span>
            </div>
            <button
              onClick={handleReconnect}
              className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
            >
              Reconnect
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ChannelList 
          onChannelSelect={handleChannelSelect}
          activeChannel={activeChannel}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {activeChannel ? (
            <>
              {/* Channel Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        # {activeChannel.name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {activeChannel.description || 'A place for conversation'}
                        {!isConnected && ' • Disconnected from chat'}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {activeChannel._count?.members || 0} members
                    {loading && ' • Loading messages...'}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-hidden">
                <MessageList 
                  messages={messages}
                  currentUser={user}
                />
              </div>

              {/* Message Input */}
              <MessageInput 
                onSendMessage={handleSendMessage}
                disabled={!canSendMessages}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-6">💬</div>
                <h3 className="text-2xl font-bold mb-2">
                  {isConnected ? 'Welcome to ClassChat' : 'Connecting...'}
                </h3>
                <p className="text-lg mb-6">
                  {isConnected 
                    ? 'Select a channel from the sidebar to start chatting'
                    : 'Please wait while we connect to the chat server'
                  }
                </p>
                {!isConnected && (
                  <div className="text-sm text-red-500">
                    ⚡ {connectionError || 'Establishing connection...'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;