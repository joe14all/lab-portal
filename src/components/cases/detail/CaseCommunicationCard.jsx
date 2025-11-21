import React, { useState, useRef, useEffect } from 'react';
import { useLab } from '../../../contexts';
import { IconAlert } from '../../../layouts/components/LabIcons';
import styles from './CaseCommunicationCard.module.css';

const CaseCommunicationCard = ({ messages, caseId, currentUserId }) => {
  const { addCaseMessage } = useLab();
  const [inputValue, setInputValue] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    setIsSending(true);
    try {
      await addCaseMessage(caseId, { content: inputValue, isInternal });
      setInputValue('');
      setIsInternal(false);
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
      
      {/* STREAM */}
      <div className={styles.stream}>
        {messages.length > 0 ? messages.map(msg => {
          const isMe = msg.senderId === currentUserId;
          
          return (
            <div 
              key={msg.id} 
              className={`${styles.messageGroup} ${isMe ? styles.groupMine : ''}`}
            >
              {/* META DATA (Outside Bubble) */}
              <div className={styles.meta}>
                <span className={styles.author}>
                  {msg.senderName}
                </span>
                <span className={styles.role}>{msg.senderRole}</span>
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

              {/* BUBBLE (Content Only) */}
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
        <div ref={messagesEndRef} />
      </div>

      {/* COMPOSER (Inside Card) */}
      <div className={`${styles.composer} ${isInternal ? styles.composerInternal : ''}`}>
        <div className={styles.toolbar}>
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