import React, { useRef, useState } from 'react';
import { 
  IconFile, 
  IconDrill, 
  IconPdf,
  IconImage,
  IconBox 
} from '../../../layouts/components/LabIcons';
import styles from './CaseFilesCard.module.css';

// Helper to choose icon based on file type/extension
const getFileIcon = (fileName, type) => {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.pdf')) return <IconPdf className={styles.iconPdf} />;
  if (lowerName.match(/\.(jpg|jpeg|png)$/)) return <IconImage className={styles.iconImg} />;
  if (lowerName.endsWith('.stl') || lowerName.endsWith('.ply')) return <IconBox className={styles.iconStl} />;
  
  return type === 'PRODUCTION_DESIGN' ? <IconDrill className={styles.iconGeneric} /> : <IconFile className={styles.iconGeneric} />;
};

const FileListItem = ({ file, onAction }) => {
  const icon = getFileIcon(file.fileName, file.category);
  const isDesign = file.category === 'PRODUCTION_DESIGN';

  return (
    <li className={styles.fileItem}>
      <div className={styles.fileInfo}>
        <div className={styles.iconWrapper}>{icon}</div>
        <div className={styles.textGroup}>
          <div className={styles.fileName}>
            <a href={file.url} target="_blank" rel="noreferrer" className={styles.fileLink}>
              {file.fileName}
            </a>
            {file.isLatest && <span className={styles.badgeLatest}>Latest</span>}
          </div>
          <div className={styles.fileMeta}>
            <span>{file.subCategory || file.category}</span>
            <span className={styles.dot}>•</span>
            <span>{file.size}</span>
            {file.version && (
              <>
                <span className={styles.dot}>•</span>
                <span>v{file.version}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className={styles.actions}>
        <button 
          className="button secondary" 
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
          onClick={() => onAction(file)}
        >
          {isDesign ? 'Download' : 'View'}
        </button>
      </div>
    </li>
  );
};

const CaseFilesCard = ({ files, caseId }) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handler: Trigger hidden input
  const onUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handler: Simulate File Upload
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const fileToUpload = e.target.files[0];

      // Simulate network request
      setTimeout(() => {
        // --- USAGE OF caseId ---
        // In a real app, this would be: await api.uploadFile(caseId, fileToUpload);
        console.log(`[Mock API] Uploading ${fileToUpload.name} to Case ID: ${caseId}`);
        
        alert(`Successfully uploaded: ${fileToUpload.name}`);
        setIsUploading(false);
      }, 1000);
    }
  };

  // Handler: File Action (View/Download)
  const handleFileAction = (file) => {
    if (file.category === 'PRODUCTION_DESIGN') {
      console.log(`Downloading ${file.fileName}...`);
      window.open(file.url, '_blank'); 
    } else {
      window.open(file.url, '_blank');
    }
  };

  return (
    <>
      {/* --- INPUTS CARD --- */}
      <div className="card">
        <h3 className={styles.sectionTitle}>Clinical Records (Inputs)</h3>
        <ul className={styles.fileList}>
          {files.inputs.length > 0 ? files.inputs.map(file => (
            <FileListItem 
              key={file.id} 
              file={file} 
              onAction={handleFileAction} 
            />
          )) : (
            <p className={styles.emptyText}>No clinical files attached.</p>
          )}
        </ul>
      </div>
      
      {/* --- DESIGNS CARD --- */}
      <div className="card">
        <div className={styles.headerRow}>
          <h3 className={styles.sectionTitle} style={{border:0, margin:0, padding:0}}>
            Lab Designs ({files.designs.length})
          </h3>
          
          <div className={styles.uploadWrapper}>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
              accept=".stl,.ply,.obj,.dcm"
            />
            <button 
              className="icon-button" 
              onClick={onUploadClick}
              title="Upload New Design"
              disabled={isUploading}
            >
              {isUploading ? <span className={styles.spinner}>⟳</span> : '+'}
            </button>
          </div>
        </div>

        <ul className={styles.fileList}>
          {files.designs.length > 0 ? files.designs.map(file => (
            <FileListItem 
              key={file.id} 
              file={file} 
              onAction={handleFileAction} 
            />
          )) : (
            <div className={styles.emptyStateDesign}>
              <p>No designs generated yet.</p>
              <button className="button text" onClick={onUploadClick}>Upload Initial Design</button>
            </div>
          )}
        </ul>
      </div>
    </>
  );
};

export default CaseFilesCard;