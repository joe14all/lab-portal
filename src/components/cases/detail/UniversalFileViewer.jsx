import React, { Suspense, useState, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Loader, Center, Html, Grid, GizmoHelper, GizmoViewcube } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
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
const STLModel = ({ url, opacity }) => {
  // This hook will throw if the network request fails (caught by ErrorBoundary)
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial 
        color="#e2e8f0" 
        roughness={0.5} 
        metalness={0.1}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
};

// --- 3. PLY Model Sub-component (with color support) ---
const PLYModel = ({ url, showColor, opacity }) => {
  // PLYLoader returns a BufferGeometry with color attributes if present in the file
  const geometry = useLoader(PLYLoader, url);
  
  return (
    <mesh geometry={geometry} castShadow receiveShadow key={showColor ? 'color' : 'mono'}>
      <meshStandardMaterial 
        vertexColors={showColor && geometry.attributes.color}
        color={showColor && geometry.attributes.color ? undefined : "#e2e8f0"}
        roughness={0.5} 
        metalness={0.1}
        transparent={true}
        opacity={opacity}
      />
    </mesh>
  );
};

const UniversalFileViewer = ({ file, isOpen, onClose, allFiles = [] }) => {
  const [showColor, setShowColor] = useState(true); // State for color toggle
  const [showAxes, setShowAxes] = useState(true); // Axes helper toggle (default on)
  const [darkBackground, setDarkBackground] = useState(true); // Background toggle
  const [opacity, setOpacity] = useState(1); // Model opacity (0-1)
  const [lightIntensity, setLightIntensity] = useState(0.5); // Light intensity
  const [showShadows, setShowShadows] = useState(true); // Shadow toggle
  const [autoRotate, setAutoRotate] = useState(false); // Auto-rotation
  const [opposingFile, setOpposingFile] = useState(null); // Opposing arch file
  const [showFileSelector, setShowFileSelector] = useState(false); // File selector modal
  const [archSpacing, setArchSpacing] = useState(30); // Spacing between arches
  const controlsRef = useRef(); // Reference to OrbitControls for reset
  
  if (!isOpen || !file) return null;

  const fileExt = file.fileName.split('.').pop().toLowerCase();
  
  // Determine Viewer Type
  const is3D = ['stl', 'ply', 'obj'].includes(fileExt);
  const isPLY = fileExt === 'ply';
  const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExt);
  const isPDF = ['pdf'].includes(fileExt);

  // Filter available 3D files for opposing arch selection
  const available3DFiles = allFiles.filter(f => {
    const ext = f.fileName.split('.').pop().toLowerCase();
    return ['stl', 'ply', 'obj'].includes(ext) && f.id !== file.id;
  });

  // Reset camera to default position
  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  // Handle opposing arch selection
  const handleSelectOpposingArch = (selectedFile) => {
    setOpposingFile(selectedFile);
    setShowFileSelector(false);
  };

  // Clear opposing arch
  const handleClearOpposingArch = () => {
    setOpposingFile(null);
  };

  // Viewer Content Logic
  let content = null;

  if (is3D) {
    const bgGradient = darkBackground 
      ? 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' 
      : 'radial-gradient(circle at center, #f1f5f9 0%, #e2e8f0 100%)';
    
    const opposingFileExt = opposingFile ? opposingFile.fileName.split('.').pop().toLowerCase() : null;
    const isOpposingPLY = opposingFileExt === 'ply';
    
    content = (
      <div style={{ width: '100%', height: '600px', background: bgGradient, borderRadius: '0.5rem', position: 'relative' }}>
        <Canvas shadows={showShadows} dpr={[1, 2]} camera={{ position: [0, 0, 150], fov: 50 }}>
          {/* Wrap Suspense/Model in ErrorBoundary */}
          <ViewerErrorBoundary>
            <Suspense fallback={null}>
              <Stage 
                environment="city" 
                intensity={lightIntensity} 
                adjustCamera={false}
                shadows={showShadows ? "contact" : false}
              >
                <Center>
                  <group>
                    {/* Main Model (Upper arch positioned above) */}
                    <group position={[0, opposingFile ? archSpacing / 2 : 0, 0]}>
                      {isPLY ? (
                        <PLYModel url={file.url} showColor={showColor} opacity={opacity} />
                      ) : (
                        <STLModel url={file.url} opacity={opacity} />
                      )}
                    </group>
                    
                    {/* Opposing Arch (Lower arch positioned below) */}
                    {opposingFile && (
                      <group position={[0, -archSpacing / 2, 0]}>
                        {isOpposingPLY ? (
                          <PLYModel url={opposingFile.url} showColor={showColor} opacity={opacity * 0.8} />
                        ) : (
                          <STLModel url={opposingFile.url} opacity={opacity * 0.8} />
                        )}
                      </group>
                    )}
                  </group>
                </Center>
              </Stage>
            </Suspense>
          </ViewerErrorBoundary>
          
          {/* Gizmo/Axes Helper */}
          {showAxes && (
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
              <GizmoViewcube />
            </GizmoHelper>
          )}
          
          <OrbitControls ref={controlsRef} makeDefault autoRotate={autoRotate} autoRotateSpeed={2} />
        </Canvas>
        
        {/* Tools Panel */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 10
        }}>
          {/* PLY Color Toggle */}
          {isPLY && (
            <button
              onClick={() => setShowColor(!showColor)}
              style={buttonStyle}
              title="Switch between colored scan and monochrome view"
            >
              {showColor ? '🎨 Colored' : '⚪ Mono'}
            </button>
          )}
          
          {/* Opposing Arch Toggle */}
          {available3DFiles.length > 0 && (
            <button
              onClick={() => opposingFile ? handleClearOpposingArch() : setShowFileSelector(true)}
              style={{...buttonStyle, background: opposingFile ? 'rgba(59, 130, 246, 0.8)' : 'rgba(0, 0, 0, 0.7)'}}
              title={opposingFile ? "Remove opposing arch" : "Add opposing arch for bite view"}
            >
              {opposingFile ? '🦷 Bite On' : '🦷 Add Bite'}
            </button>
          )}
          
          {/* Orientation Cube Toggle */}
          <button
            onClick={() => setShowAxes(!showAxes)}
            style={buttonStyle}
            title="Show/hide orientation cube"
          >
            {showAxes ? '🧭 Orient' : '⭘ Orient'}
          </button>
          
          {/* Shadow Toggle */}
          <button
            onClick={() => setShowShadows(!showShadows)}
            style={buttonStyle}
            title="Toggle shadows for better depth perception"
          >
            {showShadows ? '🔆 Shadow' : '⚫ Shadow'}
          </button>
          
          {/* Auto-Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={buttonStyle}
            title="Auto-rotate model"
          >
            {autoRotate ? '⏸ Rotate' : '▶️ Rotate'}
          </button>
          
          {/* Background Toggle */}
          <button
            onClick={() => setDarkBackground(!darkBackground)}
            style={buttonStyle}
            title="Switch background theme"
          >
            {darkBackground ? '☀️ Light' : '🌙 Dark'}
          </button>
          
          {/* Reset Camera */}
          <button
            onClick={handleResetCamera}
            style={buttonStyle}
            title="Reset camera to default view"
          >
            🔄 Reset
          </button>
        </div>
        
        {/* Right Panel - Adjustment Controls */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          backdropFilter: 'blur(4px)',
          color: 'white',
          fontSize: '0.85rem',
          zIndex: 10,
          minWidth: '160px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {/* Opacity Control */}
          <div>
            <div style={{ marginBottom: '0.5rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
              <span>Transparency</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
          
          {/* Lighting Control */}
          <div>
            <div style={{ marginBottom: '0.5rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
              <span>Lighting</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{Math.round(lightIntensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.1"
              value={lightIntensity}
              onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
          
          {/* Arch Spacing Control (only show when opposing arch is loaded) */}
          {opposingFile && (
            <div>
              <div style={{ marginBottom: '0.5rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                <span>Bite Gap</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{archSpacing}mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="2"
                value={archSpacing}
                onChange={(e) => setArchSpacing(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          )}
        </div>
        
        {/* File Selector Overlay */}
        {showFileSelector && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            backdropFilter: 'blur(8px)',
            color: 'white',
            zIndex: 20,
            maxWidth: '400px',
            width: '90%',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Select Opposing Arch
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {available3DFiles.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleSelectOpposingArch(f)}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    color: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(59, 130, 246, 0.3)';
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{f.fileName}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                    {f.category || 'Scan'} • {f.size}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFileSelector(false)}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Cancel
            </button>
          </div>
        )}
        
        {/* Helper overlay */}
        <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', color: darkBackground ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: '0.75rem', pointerEvents: 'none', width:'100%', textAlign:'center' }}>
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

// Button style for 3D tools
const buttonStyle = {
  padding: '0.5rem 0.75rem',
  background: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '0.5rem',
  fontSize: '0.8rem',
  fontWeight: 500,
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
  minWidth: '90px'
};

export default UniversalFileViewer;