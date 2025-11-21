import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLab, useAuth } from '../../contexts';

// Mock Data Imports (Direct import for robust demo)
import caseFilesData from '../../_mock/data/cases/case_files.json';
import caseMessagesData from '../../_mock/data/cases/case_messages.json';
import caseStagesData from '../../_mock/data/cases/case_stages.json';

import { 
  IconChevronRight, 
  IconClock, 
  IconUser, 
  IconFile, 
  IconAlert,
  IconCheck,
  IconMenu,
  IconPrinter // Assuming this might exist, or we reuse another
} from '../../layouts/components/LabIcons';

import styles from './CaseDetail.module.css';

const CaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { cases, updateCaseStatus } = useLab();
  const { user } = useAuth();
  
  // --- 1. Resolve Data ---
  const activeCase = useMemo(() => {
    return cases.find(c => c.id === caseId);
  }, [cases, caseId]);

  // Filter related data
  const files = useMemo(() => caseFilesData.filter(f => f.caseId === caseId), [caseId]);
  const messages = useMemo(() => caseMessagesData.filter(m => m.caseId === caseId), [caseId]);

  // --- 2. Loading/Error States ---
  if (!activeCase) {
    return (
      <div className="card">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Case Not Found</h2>
          <p>The requested case ID <strong>{caseId}</strong> does not exist or you do not have permission to view it.</p>
          <button className="button secondary" onClick={() => navigate('/cases')}>
            Back to Case List
          </button>
        </div>
      </div>
    );
  }

  // --- 3. Helpers ---
  const currentStageIndex = caseStagesData.findIndex(s => s.id === activeCase.status);
  
  const getStageClass = (stageId, index) => {
    if (activeCase.status === stageId) return `${styles.step} ${styles.active}`;
    if (index < currentStageIndex) return `${styles.step} ${styles.completed}`;
    return styles.step;
  };

  const handleStatusChange = (newStatus) => {
    updateCaseStatus(caseId, newStatus);
  };

  return (
    <div className={styles.container}>
      
      {/* === HEADER === */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>
            <span className={styles.patientName}>{activeCase.patient.name}</span>
            <span className={styles.caseNumber}>#{activeCase.caseNumber}</span>
          </h1>
          <div className={styles.metaRow}>
            <span className={styles.metaItem}>
              <IconUser width="16" height="16" /> Dr. {activeCase.doctorId}
            </span>
            <span className={styles.metaItem}>
              <IconClock width="16" height="16" /> Due: {new Date(activeCase.dates.due).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className="button secondary">Print Ticket</button>
          <button className="button primary" onClick={() => console.log("Open Actions")}>
            Actions <IconChevronRight width="16" height="16" />
          </button>
        </div>
      </header>

      {/* === WORKFLOW STEPPER === */}
      <section className={styles.stepperCard}>
        <div className={styles.stepper}>
          {caseStagesData.map((stage, index) => {
            // Don't show "Exception" stages like Hold/Cancelled in linear flow unless active
            if (stage.category === 'EXCEPTION' && activeCase.status !== stage.id) return null;
            
            return (
              <div key={stage.id} className={getStageClass(stage.id, index)}>
                <div className={styles.stepCircle}>
                  {index < currentStageIndex ? <IconCheck width="16" height="16" /> : index + 1}
                </div>
                <span className={styles.stepLabel}>{stage.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* === MAIN GRID === */}
      <div className={styles.grid}>
        
        {/* --- COL 1: CONTEXT (Patient/Clinic) --- */}
        <div className={styles.leftCol}>
          <div className="card">
            <h3 className={styles.sectionTitle}>Clinic & Patient</h3>
            <div className={styles.detailList}>
              <div className={styles.detailItem}>
                <span className={styles.label}>Patient</span>
                <span className={styles.value}>{activeCase.patient.name} ({activeCase.patient.age} / {activeCase.patient.gender})</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Chart #</span>
                <span className={styles.value}>{activeCase.patient.chartNumber || 'N/A'}</span>
              </div>
              <hr style={{ borderColor: 'var(--border-color)', margin: '0.5rem 0' }} />
              <div className={styles.detailItem}>
                <span className={styles.label}>Clinic</span>
                <span className={styles.value}>{activeCase.clinicId}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Doctor</span>
                <span className={styles.value}>{activeCase.doctorId}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className={styles.sectionTitle}>Dates</h3>
            <div className={styles.detailList}>
              <div className={styles.detailItem}>
                <span className={styles.label}>Received</span>
                <span className={styles.value}>{new Date(activeCase.dates.received).toLocaleDateString()}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Due Date</span>
                <span className={styles.value} style={{ color: 'var(--primary)' }}>
                  {new Date(activeCase.dates.due).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- COL 2: THE WORK (RX, Items, Files) --- */}
        <div className={styles.centerCol}>
          
          {/* Prescription / Items */}
          <div className="card">
            <h3 className={styles.sectionTitle}>Prescription Details</h3>
            {activeCase.items.map((item, idx) => (
              <div key={idx} className={styles.rxItem}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className={styles.toothBadge}>#{item.tooth}</span>
                  <strong>{item.type}</strong>
                </div>
                <div className={styles.detailList}>
                  <div className={styles.detailItem}>
                    <span className={styles.label}>Material</span>
                    <span className={styles.value}>{item.material}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div className={styles.detailItem}>
                      <span className={styles.label}>Shade</span>
                      <span className={styles.value}>{item.shade}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.label}>Stump</span>
                      <span className={styles.value}>{item.stumpShade || 'N/A'}</span>
                    </div>
                  </div>
                  {item.instructions && (
                    <div className={styles.detailItem}>
                      <span className={styles.label}>Instructions</span>
                      <p style={{ fontSize: '0.9rem', margin: 0 }}>{item.instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Files */}
          <div className="card">
            <h3 className={styles.sectionTitle}>
              Files & Scans
              <button className="icon-button" title="Upload File">+</button>
            </h3>
            <ul className={styles.fileList}>
              {files.length > 0 ? files.map(file => (
                <li key={file.id} className={styles.fileItem}>
                  <div className={styles.fileInfo}>
                    <IconFile className={styles.fileIcon} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{file.fileName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {file.category} • {file.size}
                      </div>
                    </div>
                  </div>
                  <button className="button secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                    View
                  </button>
                </li>
              )) : (
                <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>No files attached.</p>
              )}
            </ul>
          </div>

        </div>

        {/* --- COL 3: COMMUNICATION --- */}
        <div className={styles.rightCol}>
          <div className="card" style={{ height: '100%' }}>
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
                      {msg.senderName}
                    </span>
                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              )) : (
                <p style={{ textAlign: 'center', padding: '2rem 0' }}>No messages yet.</p>
              )}
            </div>

            {/* Reply Box Stub */}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
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
        </div>

      </div>
    </div>
  );
};

export default CaseDetail;