import React from 'react';
import { 
  IconFile, 
  IconDrill 
} from '../../../layouts/components/LabIcons';
import styles from './CaseFilesCard.module.css';

const FileListItem = ({ file, icon, primaryText, subText, tag }) => (
  <li key={file.id} className={styles.fileItem}>
    <div className={styles.fileInfo}>
      {icon}
      <div>
        <div className={styles.fileName}>{primaryText}</div>
        <div className={styles.fileMeta}>
          {subText}
          {tag && <span className={`${styles.tag} ${tag.type}`}>{tag.label}</span>}
        </div>
      </div>
    </div>
    <button className="button secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
      {file.category === 'PRODUCTION_DESIGN' ? 'Download' : 'View'}
    </button>
  </li>
);

const CaseFilesCard = ({ files, caseId }) => {
    
  return (
    <>
      {/* Files: Clinical Input (Immutable) */}
      <div className="card">
        <h3 className={styles.sectionTitle}>Clinical Records (Inputs)</h3>
        <ul className={styles.fileList}>
          {files.inputs.length > 0 ? files.inputs.map(file => (
            <FileListItem
              key={file.id}
              file={file}
              icon={<IconFile className={styles.fileIcon} />}
              primaryText={file.fileName}
              subText={`${file.subCategory || file.category} • ${file.size}`}
              tag={file.isImmutable ? { label: 'IMMUTABLE', type: styles.immutableTag } : null}
            />
          )) : (
            <p className={styles.emptyText}>No clinical files attached.</p>
          )}
        </ul>
      </div>
      
      {/* Files: Lab Designs (Versioned) */}
      <div className="card">
        <h3 className={styles.sectionTitle}>
          Lab Designs ({files.designs.length})
          <button className="icon-button" title="Upload New Design">+</button>
        </h3>
        <ul className={styles.fileList}>
          {files.designs.length > 0 ? files.designs.map(file => (
            <FileListItem
              key={file.id}
              file={file}
              icon={<IconDrill className={styles.fileIcon} />}
              primaryText={file.fileName}
              subText={`Unit ${file.unitId?.split('-').pop() || 'N/A'} • v${file.version} `}
              tag={file.isLatest ? { label: '(LATEST)', type: styles.latestTag } : null}
            />
          )) : (
            <p className={styles.emptyText}>No designs generated yet.</p>
          )}
        </ul>
      </div>
    </>
  );
};

export default CaseFilesCard;