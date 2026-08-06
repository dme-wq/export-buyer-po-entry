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
        <h3 className="upload-text">Extracting PO Data (OCR)...</h3>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)' }}>
            <File size={20} />
            <span style={{ fontWeight: 600 }}>{file.name}</span>
          </div>
          <button 
            type="button" 
            onClick={() => { onFileSelect(null); setPreview(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Remove / Change
          </button>
        </div>
        
        {preview && (
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
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
          </div>
        )}
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

      <button 
        type="button" 
        className="btn" 
        style={{ width: '100%', background: '#f8fafc', color: 'var(--text-heading)', border: '2px dashed #d1d5db' }}
        onClick={(e) => {
          e.preventDefault();
          cameraRef.current?.click();
        }}
      >
        <Camera className="btn-icon" size={18} /> Capture with Camera
      </button>
    </div>
  );
}
