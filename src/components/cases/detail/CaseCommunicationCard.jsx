import React from 'react';
import { IconAlert } from '../../../layouts/components/LabIcons';
import styles from './CaseCommunicationCard.module.css';

const CaseCommunicationCard = ({ messages, caseId, currentUserId }) => {
  return (
    <div className="card">
      <h3 className={styles.sectionTitle}>Communication</h3>
      
      <div className={styles.messageList}>
        {messages.length > 0 ? messages.map(msg => (
          <div 
            key={msg.id} 
            className={`${styles.messageBubble} ${msg.isInternal ? styles.internalNote : ''}`}
          >
            <div className={styles.msgHeader}>
              <span className={styles.msgAuthor}>
                {msg.isInternal && <IconAlert width="12" height="12" style={{marginRight:4}} />}
                {msg.senderName} ({msg.senderRole})
              </span>
              <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
          </div>
        )) : (
          <p className={styles.emptyText}>No messages yet.</p>
        )}
      </div>

      {/* Reply Box Stub */}
      <div className={styles.replyBox}>
        <textarea 
          placeholder="Type a message or internal note..." 
          style={{ width: '100%', marginBottom: '0.5rem', fontSize: '0.9rem' }}
          rows="3"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="button primary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default CaseCommunicationCard;