// src/components/messages/MessageInput.jsx
import React, { useState, useRef, useEffect } from 'react';
import '../../styles/messages.css';

const MessageInput = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="message-input-container">
      <form onSubmit={handleSubmit} className="message-input-form">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            disabled 
              ? "Connecting to chat..." 
              : "Type a message... (Press Enter to send)"
          }
          disabled={disabled}
          className="message-input-field"
          autoFocus
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default MessageInput;