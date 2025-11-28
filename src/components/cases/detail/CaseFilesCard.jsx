import React, { useRef, useState, useMemo } from 'react';
import { useToast, useLab } from '../../../contexts';
import Modal from '../../common/Modal';
import UniversalFileViewer from './UniversalFileViewer'; // Updated Import
import { 
  IconFile, 
  IconMill, 
  IconPdf,
  IconImage,
  IconBox,
  IconCalendar,
  IconEye,
  IconArrowDown
} from '../../../layouts/components/LabIcons';
import styles from './CaseFilesCard.module.css';

// --- Helper: Icon Logic ---
const getFileIcon = (fileName, type) => {
  const lowerName = fileName.toLowerCase();
  const iconProps = { width: "18", height: "18" };
  
  if (lowerName.endsWith('.pdf')) return { icon: <IconPdf {...iconProps} />, style: styles.iconPdf };
  if (lowerName.match(/\.(jpg|jpeg|png|gif)$/)) return { icon: <IconImage {...iconProps} />, style: styles.iconImg };
  if (lowerName.endsWith('.stl') || lowerName.endsWith('.ply') || lowerName.endsWith('.obj')) {
    return { icon: <IconBox {...iconProps} />, style: styles.iconStl };
  }
  
  return { icon: <IconFile {...iconProps} />, style: styles.iconGeneric };
};

// --- Single File Row ---
const FileRow = ({ file, onView, onDownload }) => {
  const { icon, style } = getFileIcon(file.fileName, file.category);
  const timeString = new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Check if we can preview this file type in the UniversalViewer
  const canPreview = file.fileName.match(/\.(stl|ply|obj|pdf|jpg|jpeg|png|gif)$/i);

  return (
    <div className={styles.fileItem}>
      <div className={`${styles.iconBox} ${style}`}>
        {icon}
      </div>
      
      <div className={styles.fileInfo}>
        {/* Title now opens preview if available, else download */}
        <span 
          className={styles.fileName} 
          title={file.fileName}
          onClick={() => canPreview ? onView(file) : onDownload(file)}
          style={{ cursor: 'pointer' }}
        >
          {file.fileName}
        </span>
        <div className={styles.fileMeta}>
          <span>{timeString}</span>
          <span className={styles.dot} />
          <span>{file.subCategory || file.category}</span>
          <span className={styles.dot} />
          <span>{file.size}</span>
        </div>
      </div>

      <div className={styles.actions}>
        {/* View Button: Only show if supported type */}
        {canPreview && (
          <button 
            className={`${styles.actionBtn} ${styles.viewBtn}`} 
            onClick={() => onView(file)}
            title="Preview"
          >
            <IconEye width="14" height="14" />
            View
          </button>
        )}
        
        <button 
          className={styles.actionBtn} 
          onClick={() => onDownload(file)}
          title="Download"
        >
          <IconArrowDown width="14" height="14" />
        </button>
      </div>
    </div>
  );
};

const CaseFilesCard = ({ files, caseId }) => {
  const { addToast } = useToast();
  const { addCaseFile } = useLab();
  
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [viewingFile, setViewingFile] = useState(null); // Passed to UniversalViewer
  const [pendingFile, setPendingFile] = useState(null);

  // --- Unified List (Input + Output) ---
  const allFiles = useMemo(() => {
    return [...files.inputs, ...files.designs];
  }, [files]);

  // --- Group by Date ---
  const groupedFiles = useMemo(() => {
    if (allFiles.length === 0) return {};
    
    const sorted = [...allFiles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return sorted.reduce((groups, file) => {
      const dateKey = new Date(file.createdAt).toLocaleDateString(undefined, { 
        weekday: 'short', month: 'short', day: 'numeric' 
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(file);
      return groups;
    }, {});
  }, [allFiles]);

  // --- Handlers ---
  const processFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setPendingFile(fileList[0]);
    setShowCategoryModal(true);
  };

  const handleUpload = async (category) => {
    setShowCategoryModal(false);
    if (!pendingFile) return;

    setIsUploading(true);
    try {
      await addCaseFile(caseId, pendingFile, category);
      addToast(`Uploaded ${pendingFile.name}`, 'success');
    } catch (error) {
      addToast("Upload failed", 'error');
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      setIsDragOver(false);
    }
  };

  const handleDrag = (e, active) => {
    e.preventDefault();
    setIsDragOver(active);
  };

  return (
    <>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>Case Files</h3>
          <span className={styles.countBadge}>{allFiles.length}</span>
        </div>

        {/* Scrollable List */}
        <div className={styles.contentArea}>
          {Object.keys(groupedFiles).length > 0 ? (
            Object.entries(groupedFiles).map(([date, groupFiles]) => (
              <div key={date} className={styles.dateGroup}>
                <div className={styles.dateHeader}>
                  <IconCalendar width="12" height="12" /> {date}
                </div>
                {groupFiles.map(file => (
                  <FileRow 
                    key={file.id} 
                    file={file} 
                    onView={setViewingFile} 
                    onDownload={(f) => window.open(f.url, '_blank')} 
                  />
                ))}
              </div>
            ))
          ) : (
            <div className={styles.emptyText}>No files uploaded yet.</div>
          )}
        </div>

        {/* Footer Dropzone */}
        <div 
          className={`${styles.dropZone} ${isDragOver ? styles.dragActive : ''}`}
          onDragOver={(e) => handleDrag(e, true)}
          onDragLeave={(e) => handleDrag(e, false)}
          onDrop={(e) => { handleDrag(e, false); processFiles(e.dataTransfer.files); }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={(e) => processFiles(e.target.files)} 
          />
          <button 
            className={styles.uploadBtn} 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : (
              <>
                <IconFile width="16" height="16" />
                Upload New File
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Classify Upload"
        width="400px"
        footer={<button className="button text" onClick={() => setShowCategoryModal(false)}>Cancel</button>}
      >
        <div className={styles.categoryGrid}>
          <button className={styles.catBtn} onClick={() => handleUpload('INPUT_SCAN')}>
            <div className={styles.catIcon}><IconBox /></div>
            <div className={styles.catText}><strong>Input Scan</strong><span>STL / PLY</span></div>
          </button>
          <button className={styles.catBtn} onClick={() => handleUpload('REFERENCE')}>
            <div className={styles.catIcon}><IconImage /></div>
            <div className={styles.catText}><strong>Reference</strong><span>Photo / PDF</span></div>
          </button>
          <button className={styles.catBtn} onClick={() => handleUpload('PRODUCTION_DESIGN')}>
            <div className={styles.catIcon}><IconMill /></div>
            <div className={styles.catText}><strong>Design Output</strong><span>CAM File</span></div>
          </button>
        </div>
      </Modal>

      {/* UNIVERSAL VIEWER */}
      <UniversalFileViewer 
        file={viewingFile} 
        isOpen={!!viewingFile} 
        onClose={() => setViewingFile(null)} 
      />
    </>
  );
};

export default CaseFilesCard;