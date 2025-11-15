// src/components/messages/MessageList.jsx
import React, { useEffect, useRef } from 'react';
import '../../styles/messages.css';

const MessageList = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!messages || messages.length === 0) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#f9fafb',
        color: '#6b7280'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            No messages yet
          </div>
          <div style={{ fontSize: '0.95rem' }}>
            Start the conversation by sending the first message!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      flex: 1, 
      overflowY: 'auto', 
      backgroundColor: '#f9fafb',
      padding: '1.5rem'
    }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
        {messages.map((message) => {
          const isOwnMessage = message.author.id === currentUser?.id;
          
          return (
            <div
              key={message.id}
              className={`message-container ${isOwnMessage ? 'own' : 'other'}`}
            >
              <div className={`message-bubble ${isOwnMessage ? 'own' : 'other'}`}>
                {!isOwnMessage && (
                  <div className={`message-sender ${isOwnMessage ? 'own' : 'other'}`}>
                    {message.author.name || message.author.username}
                  </div>
                )}
                <div className={`message-text ${isOwnMessage ? 'own' : 'other'}`}>
                  {message.text}
                </div>
                <div className={`message-time ${isOwnMessage ? 'own' : 'other'}`}>
                  {formatTime(message.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;