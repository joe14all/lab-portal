import React, { Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Loader, Center } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import Modal from '../../common/Modal';
import { IconDrill } from '../../../layouts/components/LabIcons';
import styles from './STLViewer.module.css';

// 1. Model Component: Handles the async loading of the STL
const Model = ({ url }) => {
  // This hook suspends the component until the STL is loaded
  const geometry = useLoader(STLLoader, url);
  
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial 
        color="#e2e8f0" 
        roughness={0.5} 
        metalness={0.1} 
      />
    </mesh>
  );
};

const STLViewer = ({ file, isOpen, onClose }) => {
  // ESLint Fix: Hooks must always run. We perform the null check inside the return 
  // or rely on the parent/Modal to control rendering.
  
  // If not open, we still return null, but we ensure no hooks were called conditionally *before* this point.
  // Since this component uses sub-components (Canvas) for state, we can safely return null here 
  // because we aren't using useState/useEffect at this top level anymore.
  if (!isOpen || !file) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`3D Viewer: ${file.fileName}`}
        width="900px"
        icon={<IconDrill width="20" height="20" />}
        footer={
          <div className={styles.footer}>
            <div className={styles.meta}>
              <strong>{file.fileType}</strong> • {file.size}
            </div>
            <div className={styles.actions}>
              <button className="button secondary" onClick={onClose}>
                Close
              </button>
              <button 
                className="button primary" 
                onClick={() => window.open(file.url, '_blank')}
              >
                Download File
              </button>
            </div>
          </div>
        }
      >
        <div className={styles.viewerContainer}>
          {/* 3D SCENE */}
          <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 150], fov: 50 }}>
            <Suspense fallback={null}>
              <Stage environment="city" intensity={0.5} adjustCamera>
                <Center>
                  <Model url={file.url} />
                </Center>
              </Stage>
            </Suspense>
            <OrbitControls makeDefault />
          </Canvas>

          {/* Hint Overlay */}
          <div className={styles.controlsOverlay}>
            <span>Left Click: Rotate</span>
            <span>•</span>
            <span>Right Click: Pan</span>
            <span>•</span>
            <span>Scroll: Zoom</span>
          </div>
        </div>
      </Modal>
      
      {/* DREI LOADER: Shows a progress bar overlay */}
      <Loader />
    </>
  );
};

export default STLViewer;