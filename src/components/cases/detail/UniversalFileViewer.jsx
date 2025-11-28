import React, { Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Loader, Center, Html } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import Modal from '../../common/Modal';
import { 
  IconEye, 
  IconFile, 
  IconMill, 
  IconAlert 
} from '../../../layouts/components/LabIcons';

// --- 1. Error Boundary Component ---
// This catches errors in its child components (like useLoader failures)
class ViewerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("3D Viewer Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render the Fallback UI inside the Canvas using <Html>
      return (
        <Html center>
          <div style={{ 
            color: 'white', 
            textAlign: 'center', 
            width: '280px',
            background: 'rgba(0,0,0,0.6)',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <IconAlert width="32" height="32" style={{ color: '#ef4444' }} />
            </div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Preview Unavailable</h4>
            <p style={{ fontSize: '0.85rem', opacity: 0.9, margin: 0 }}>
              The 3D model could not be loaded. Please download the file to view it locally.
            </p>
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}

// --- 2. 3D Model Sub-component ---
const Model = ({ url }) => {
  // This hook will throw if the network request fails (caught by ErrorBoundary)
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.1} />
    </mesh>
  );
};

const UniversalFileViewer = ({ file, isOpen, onClose }) => {
  if (!isOpen || !file) return null;

  const fileExt = file.fileName.split('.').pop().toLowerCase();
  
  // Determine Viewer Type
  const is3D = ['stl', 'ply', 'obj'].includes(fileExt);
  const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExt);
  const isPDF = ['pdf'].includes(fileExt);

  // Viewer Content Logic
  let content = null;

  if (is3D) {
    content = (
      <div style={{ width: '100%', height: '600px', background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)', borderRadius: '0.5rem', position: 'relative' }}>
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 150], fov: 50 }}>
          {/* Wrap Suspense/Model in ErrorBoundary */}
          <ViewerErrorBoundary>
            <Suspense fallback={null}>
              <Stage environment="city" intensity={0.5} adjustCamera>
                <Center>
                  <Model url={file.url} />
                </Center>
              </Stage>
            </Suspense>
          </ViewerErrorBoundary>
          
          <OrbitControls makeDefault />
        </Canvas>
        
        {/* Helper overlay (outside Canvas so it's not affected by 3D errors) */}
        <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', pointerEvents: 'none', width:'100%', textAlign:'center' }}>
          Left Click: Rotate • Right Click: Pan • Scroll: Zoom
        </div>
        
        {/* Loading Bar */}
        <Loader />
      </div>
    );
  } else if (isImage) {
    content = (
      <div style={{ width: '100%', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <img 
          src={file.url} 
          alt={file.fileName} 
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = 'none';
            e.target.parentNode.innerHTML = '<div style="color:#64748b">Image failed to load</div>';
          }}
        />
      </div>
    );
  } else if (isPDF) {
    content = (
      <iframe 
        src={file.url} 
        title="PDF Viewer"
        style={{ width: '100%', height: '600px', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: '#fff' }} 
      />
    );
  } else {
    // Fallback
    content = (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <IconFile width="48" height="48" style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <p>Preview not available for <strong>.{fileExt}</strong> files.</p>
        <button className="button primary" onClick={() => window.open(file.url, '_blank')}>
          Download to View
        </button>
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={file.fileName}
      width="900px"
      icon={is3D ? <IconMill width="20" height="20" /> : <IconEye width="20" height="20" />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {file.fileType || fileExt.toUpperCase()} • {file.size}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="button secondary" onClick={onClose}>Close</button>
            <button className="button primary" onClick={() => window.open(file.url, '_blank')}>Download</button>
          </div>
        </div>
      }
    >
      {content}
    </Modal>
  );
};

export default UniversalFileViewer;