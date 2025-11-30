import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import styles from './SignaturePad.module.css';

const SignaturePad = ({ onSave, onCancel, initialSignature = null }) => {
  const sigCanvasRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(!initialSignature);

  // Load initial signature if provided
  React.useEffect(() => {
    if (initialSignature && sigCanvasRef.current) {
      sigCanvasRef.current.fromDataURL(initialSignature);
      setIsEmpty(false);
    }
  }, [initialSignature]);

  const handleClear = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setIsEmpty(true);
    }
  };

  const handleSave = () => {
    if (sigCanvasRef.current && !isEmpty) {
      const dataURL = sigCanvasRef.current.toDataURL('image/png');
      onSave(dataURL);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  return (
    <div className={styles.signaturePadContainer}>
      <div className={styles.signatureHeader}>
        <h3>Customer Signature</h3>
        <p>Please sign below to confirm delivery</p>
      </div>

      <div className={styles.canvasWrapper}>
        <SignatureCanvas
          ref={sigCanvasRef}
          penColor="black"
          canvasProps={{
            className: styles.signatureCanvas,
            'aria-label': 'Signature canvas - draw your signature here'
          }}
          onBegin={handleBegin}
        />
        <div className={styles.signatureLine}>
          <span>Sign above this line</span>
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button
          type="button"
          className="button secondary"
          onClick={handleClear}
          disabled={isEmpty}
          aria-label="Clear signature"
        >
          Clear
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={onCancel}
          aria-label="Cancel signature"
        >
          Cancel
        </button>
        <button
          type="button"
          className="button primary"
          onClick={handleSave}
          disabled={isEmpty}
          aria-label="Save signature"
        >
          Save Signature
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
