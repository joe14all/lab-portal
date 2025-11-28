import React, { useState, useRef, useEffect } from 'react';
import { useLab, useAuth } from '../../../contexts';
import { IconAlert } from '../../../layouts/components/LabIcons';
import styles from './CaseCommunicationCard.module.css';

const CaseCommunicationCard = ({ messages, caseId }) => {
  const { user } = useAuth();
  const { addCaseMessage } = useLab();
  
  const [inputValue, setInputValue] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // 1. CHANGE: Use a ref for the CONTAINER, not a dummy div at the end
  const streamRef = useRef(null);

  // --- Permissions ---
  const isClient = user?.roleId === 'role-client';
  const canSendInternal = !isClient;

  // 2. CHANGE: Scroll the container's scrollTop instead of using scrollIntoView
  useEffect(() => {
    if (streamRef.current) {
      // This scrolls ONLY the internal chat box to the bottom
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    setIsSending(true);
    try {
      const messageType = canSendInternal ? isInternal : false;
      await addCaseMessage(caseId, { content: inputValue, isInternal: messageType });
      setInputValue('');
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutHint = isMac ? 'Cmd + Enter' : 'Ctrl + Enter';

  return (
    <div className={styles.card}>
      
      {/* HEADER */}
      <div className={styles.header}>
        <h3 className={styles.title}>Communication</h3>
        <span className={styles.countBadge}>{messages.length} messages</span>
      </div>
      
      {/* 3. CHANGE: Attach the ref to the stream container 
         and remove the old messagesEndRef div 
      */}
      <div className={styles.stream} ref={streamRef}>
        {messages.length > 0 ? messages.map(msg => {
          const isMe = msg.senderId === user?.id;
          
          return (
            <div 
              key={msg.id} 
              className={`${styles.messageGroup} ${isMe ? styles.groupMine : ''}`}
            >
              {/* META DATA */}
              <div className={styles.meta}>
                <span className={styles.author}>
                  {isMe ? 'You' : msg.senderName}
                </span>
                {!isMe && <span className={styles.role}>{msg.senderRole}</span>}
                
                {msg.isInternal && (
                  <span className={styles.internalBadge}>
                    <IconAlert width="10" height="10" /> Internal
                  </span>
                )}
                
                <span className={styles.time}>
                  {new Date(msg.createdAt).toLocaleString([], { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </span>
              </div>

              {/* BUBBLE */}
              <div className={`
                ${styles.bubble} 
                ${msg.isInternal ? styles.bubbleInternal : ''}
                ${isMe ? styles.bubbleMine : ''}
              `}>
                {msg.content}
              </div>
            </div>
          );
        }) : (
          <div className={styles.emptyState}>
            <p>No history found.</p>
            <small>Messages sent here are visible to the clinic.</small>
          </div>
        )}
        {/* Removed <div ref={messagesEndRef} /> as it's no longer needed */}
      </div>

      {/* COMPOSER */}
      <div className={`${styles.composer} ${isInternal ? styles.composerInternal : ''}`}>
        <div className={styles.toolbar}>
          
          {canSendInternal ? (
            <label className={`${styles.toggle} ${isInternal ? styles.toggleActive : ''}`}>
              <input 
                type="checkbox" 
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              <span className={styles.toggleLabel}>
                {isInternal ? 'Internal Note' : 'Public Message'}
              </span>
            </label>
          ) : (
            <span className={styles.hint} style={{ fontWeight: 500 }}>
              Public Message
            </span>
          )}

          <span className={styles.hint}>{shortcutHint}</span>
        </div>

        <div className={styles.editorRow}>
          <textarea 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isInternal ? "Add a private note..." : "Type a message..."}
            className={styles.textarea}
            rows={3}
            disabled={isSending}
          />
          <button 
            className={`button ${isInternal ? 'secondary danger' : 'primary'}`}
            onClick={handleSend}
            disabled={isSending || !inputValue.trim()}
            style={{ height: 'fit-content', marginBottom: '4px' }}
          >
            {isSending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaseCommunicationCard;