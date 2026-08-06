import React, { useRef, useState } from 'react';
import { UploadCloud, Camera, File, Image as ImageIcon, Loader2, ExternalLink } from 'lucide-react';

export default function FileUpload({ onFileSelect, file, isExtracting }) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  
  const inputRef = useRef(null);
  const cameraRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile) => {
    // Generate preview
    if (selectedFile.type.startsWith('image/') || selectedFile.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null); // non-image/pdf, handled below
    }
    
    onFileSelect(selectedFile);
  };

  if (isExtracting) {
    return (
      <div className="upload-zone" style={{ border: 'none', background: 'rgba(79, 70, 229, 0.1)' }}>
        <Loader2 className="upload-icon animate-spin" size={48} style={{ animation: 'spin 2s linear infinite' }} />
        <h3 className="upload-text">RKD Engine is Analysing and Extracting Data...</h3>
        <p className="upload-subtext">Please wait while we process the document.</p>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (file) {
    return (
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {preview && (
            <a 
              href={preview} 
              target="_blank" 
              rel="noreferrer"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.75rem 1.5rem', 
                background: 'rgba(79, 70, 229, 0.1)', 
                color: 'var(--accent-color)', 
                borderRadius: '50px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                border: '1px solid rgba(79, 70, 229, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(79, 70, 229, 0.2)' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)' }}
            >
              <ExternalLink size={16} />
              View Uploaded Document
            </a>
          )}
          <button 
            type="button" 
            onClick={() => { onFileSelect(null); setPreview(null); }}
            style={{ 
              background: '#fee2e2', 
              color: '#ef4444', 
              border: 'none', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '50px', 
              fontWeight: 600, 
              fontSize: '0.9rem', 
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#fecaca' }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#fee2e2' }}
          >
            Remove / Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.csv,.xlsx,.xls,image/*"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      
      <div 
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <UploadCloud className="upload-icon" size={48} />
        <h3 className="upload-text">Upload Buyer PO</h3>
        <p className="upload-subtext">Drag & drop or click to browse</p>
        <p className="upload-subtext" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Supports PDF, Excel, CSV, Images</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', gap: '1rem' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>OR</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button 
          type="button" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '0.6rem 1.25rem', 
            borderRadius: '50px',
            fontSize: '0.85rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #7b71f9 0%, #6054f0 100%)', 
            color: 'white', 
            border: 'none',
            boxShadow: '0 4px 10px rgba(123, 113, 249, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(123, 113, 249, 0.4)' }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(123, 113, 249, 0.3)' }}
          onClick={(e) => {
            e.preventDefault();
            cameraRef.current?.click();
          }}
        >
          <Camera style={{ marginRight: '6px' }} size={16} /> Capture with Camera
        </button>
      </div>
    </div>
  );
}
