import React, { useRef, useState } from 'react';
import { useToast, useLab } from '../../../contexts';
import Modal from '../../common/Modal';
import STLViewer from './STLViewer'; 
import { 
  IconFile, 
  IconDrill, 
  IconPdf,
  IconImage,
  IconBox 
} from '../../../layouts/components/LabIcons';
import styles from './CaseFilesCard.module.css';

const getFileIcon = (fileName, type) => {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.pdf')) return <IconPdf className={styles.iconPdf} />;
  if (lowerName.match(/\.(jpg|jpeg|png)$/)) return <IconImage className={styles.iconImg} />;
  if (lowerName.endsWith('.stl') || lowerName.endsWith('.ply')) return <IconBox className={styles.iconStl} />;
  return type === 'PRODUCTION_DESIGN' ? <IconDrill className={styles.iconGeneric} /> : <IconFile className={styles.iconGeneric} />;
};

const FileListItem = ({ file, onView, onDownload }) => {
  const icon = getFileIcon(file.fileName, file.category);
  const isSTL = file.fileName.toLowerCase().endsWith('.stl');
  
  return (
    <li className={styles.fileItem}>
      <div className={styles.fileInfo}>
        <div className={styles.iconWrapper}>{icon}</div>
        <div className={styles.textGroup}>
          <div className={styles.fileName}>
            <a href={file.url} target="_blank" rel="noreferrer" className={styles.fileLink}>{file.fileName}</a>
            {file.isLatest && <span className={styles.badgeLatest}>Latest</span>}
          </div>
          <div className={styles.fileMeta}>
            <span>{file.subCategory || file.category}</span>
            <span className={styles.dot}>•</span>
            <span>{file.size}</span>
            {file.version && <><span className={styles.dot}>•</span><span>v{file.version}</span></>}
          </div>
        </div>
      </div>
      
      <div className={styles.actions}>
        {isSTL ? (
          <>
            <button onClick={() => onView(file)}>View</button>
            <button onClick={() => onDownload(file)}>Download</button>
          </>
        ) : (
          <button onClick={() => onDownload(file)}>
            {file.category === 'PRODUCTION_DESIGN' ? 'Download' : 'View'}
          </button>
        )}
      </div>
    </li>
  );
};

const CaseFilesCard = ({ files, caseId }) => {
  const { addToast } = useToast();
  const { addCaseFile } = useLab();
  
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  const processFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setPendingFile(file);
    setShowCategoryModal(true);
  };

  const handleUpload = async (category) => {
    setShowCategoryModal(false);
    if (!pendingFile) return;

    setIsUploading(true);
    try {
      await addCaseFile(caseId, pendingFile, category);
      addToast(`Successfully uploaded ${pendingFile.name}`, 'success');
    } catch (error) {
      console.error("Upload failed:", error);
      addToast("Failed to upload file", 'error');
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      setIsDragOver(false);
    }
  };

  const handleCancelUpload = () => {
    setShowCategoryModal(false);
    setPendingFile(null);
    setIsDragOver(false);
  };

  const handleViewFile = (file) => { setViewingFile(file); };
  const handleDownloadFile = (file) => { window.open(file.url, '_blank'); };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); processFiles(e.dataTransfer.files); };
  const handleFileChange = (e) => { processFiles(e.target.files); };
  const onUploadClick = () => { fileInputRef.current?.click(); };

  return (
    <>
      <div className="card">
        <h3 className={styles.sectionTitle}>Clinical Records (Inputs)</h3>
        {files.inputs.length > 0 ? (
          <ul className={styles.fileList}>
            {files.inputs.map(file => (
              <FileListItem key={file.id} file={file} onView={handleViewFile} onDownload={handleDownloadFile} />
            ))}
          </ul>
        ) : (
          <p className={styles.emptyText}>No clinical files attached.</p>
        )}
      </div>
      
      <div className="card">
        <div className={styles.headerRow}>
          <h3 className={styles.sectionTitle} style={{border:0, margin:0, padding:0}}>
            Lab Designs ({files.designs.length})
          </h3>
        </div>

        <div 
          className={`${styles.dropZone} ${isDragOver ? styles.dragActive : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept=".stl,.ply,.obj,.dcm,.pdf,.jpg,.png" />
          
          {files.designs.length > 0 ? (
            <ul className={styles.fileList}>
              {files.designs.map(file => (
                <FileListItem key={file.id} file={file} onView={handleViewFile} onDownload={handleDownloadFile} />
              ))}
            </ul>
          ) : (
            <div className={styles.emptyStateDesign}>
              <p>No designs generated yet.</p>
            </div>
          )}

          <div className={styles.uploadAction}>
            <button className="button secondary" onClick={onUploadClick} disabled={isUploading}>
              {isUploading ? <span className={styles.spinner}>⟳ Uploading...</span> : <span>+ Upload File or Drag Here</span>}
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showCategoryModal}
        onClose={handleCancelUpload}
        title="Classify File"
        width="400px"
        footer={<button className="button text" onClick={handleCancelUpload}>Cancel</button>}
      >
        <div className={styles.modalBody}>
          <p style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            How should <strong>{pendingFile?.name}</strong> be categorized?
          </p>
          <div className={styles.categoryGrid}>
            <button className={styles.catBtn} onClick={() => handleUpload('INPUT_SCAN')}>
              <div className={styles.catIcon}><IconBox /></div>
              <div className={styles.catText}><strong>Input Scan</strong><span>Patient impressions / STL</span></div>
            </button>
            <button className={styles.catBtn} onClick={() => handleUpload('REFERENCE')}>
              <div className={styles.catIcon}><IconImage /></div>
              <div className={styles.catText}><strong>Reference</strong><span>Photos, PDF RX, Notes</span></div>
            </button>
            <button className={styles.catBtn} onClick={() => handleUpload('PRODUCTION_DESIGN')}>
              <div className={styles.catIcon}><IconDrill /></div>
              <div className={styles.catText}><strong>Design File</strong><span>Final CAM Output / CAD</span></div>
            </button>
          </div>
        </div>
      </Modal>

      <STLViewer 
        file={viewingFile} 
        isOpen={!!viewingFile} 
        onClose={() => setViewingFile(null)} 
      />
    </>
  );
};

export default CaseFilesCard;