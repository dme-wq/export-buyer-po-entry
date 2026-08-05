import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, Search, Send, Clock, FileText } from 'lucide-react';
import FileUpload from './FileUpload';

const mockDropdownData = {
  retailers: ['Dot Com', 'JC Penny', 'TJX', '1888 Mills', 'Homegoods', 'Warehouse', 'HalfPrice'],
  countries: ['United States', 'Ukraine', 'Italy', 'Germany', 'Australia']
};

export default function Form({ authenticatedEmail, onLogout }) {
  const [formData, setFormData] = useState({
    timestamp: '',
    email: authenticatedEmail || '',
    buyerName: '',
    poDate: '',
    poNumber: '',
    retailerName: '',
    retailerCountry: '',
    exFactoryDate: '',
    deliveryAddress: '',
    onboardVesselDate: ''
  });

  const [file, setFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Update timestamp every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: dd-MMM-yyyy hh:mm:ss
      const formatted = now.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }).replace(/ /g, '-') + ' ' + now.toLocaleTimeString('en-GB');
      
      setFormData(prev => ({ ...prev, timestamp: formatted }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update form data if authenticatedEmail changes (failsafe)
  useEffect(() => {
    if (authenticatedEmail) {
      setFormData(prev => ({ ...prev, email: authenticatedEmail }));
    }
  }, [authenticatedEmail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (uploadedFile) => {
    setFile(uploadedFile);
    setIsExtracting(true);
    
    if (!uploadedFile) {
      setIsExtracting(false);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(uploadedFile);
    reader.onload = async () => {
      // Extract base64 part
      const base64String = reader.result.split(',')[1];
      const mimeType = uploadedFile.type;

      try {
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileData: base64String,
            mimeType: mimeType
          })
        });

        if (!response.ok) {
          console.error("Failed to extract data");
          alert("OCR Extraction failed. Please fill manually.");
          setIsExtracting(false);
          return;
        }

        const data = await response.json();
        
        setFormData(prev => ({
          ...prev,
          buyerName: data.buyerName || prev.buyerName,
          poDate: data.poDate || prev.poDate,
          poNumber: data.poNumber || prev.poNumber,
          exFactoryDate: data.exFactoryDate || prev.exFactoryDate,
          deliveryAddress: data.deliveryAddress || prev.deliveryAddress,
          onboardVesselDate: data.onboardVesselDate || prev.onboardVesselDate
        }));

      } catch (error) {
        console.error("OCR API error:", error);
        alert("OCR API Error. Please fill manually.");
      } finally {
        setIsExtracting(false);
      }
    };
    
    reader.onerror = error => {
      console.error("Error reading file:", error);
      setIsExtracting(false);
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting Form Data:', formData);
    console.log('Attached File:', file);
    // In a real app, this would be a fetch POST to Google Apps Script endpoint
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="animate-slide-up text-center py-10">
        <CheckCircle color="var(--success-color)" size={64} className="mx-auto mb-4" />
        <h2>Form Submitted Successfully!</h2>
        <p>Your PO data has been recorded in the FMS.</p>
        <button 
          className="btn btn-primary mt-6"
          onClick={() => {
            setIsSubmitted(false);
            setFile(null);
            setFormData(prev => ({
              ...prev,
              buyerName: '', poDate: '', poNumber: '', retailerName: '',
              retailerCountry: '', exFactoryDate: '', deliveryAddress: '', onboardVesselDate: ''
            }));
          }}
        >
          Submit Another PO
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="animate-slide-up delay-2">
      
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem 1rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Clock size={18} />
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formData.timestamp}</span>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle size={14} /> {formData.email}
            </span>
            <button 
              type="button" 
              onClick={onLogout}
              style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.75rem', fontWeight: 600 }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <FileUpload onFileSelect={handleFileUpload} file={file} isExtracting={isExtracting} />

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FileText size={20} color="var(--accent-color)" /> PO Details
      </h3>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Buyer Name</label>
          <input 
            type="text" 
            name="buyerName" 
            className="form-input" 
            value={formData.buyerName} 
            onChange={handleChange} 
            placeholder="Auto-extracted or manual entry"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">PO Date</label>
          <input 
            type="date" 
            name="poDate" 
            className="form-input" 
            value={formData.poDate} 
            onChange={handleChange} 
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Buyer PO Number</label>
          <input 
            type="text" 
            name="poNumber" 
            className="form-input" 
            value={formData.poNumber} 
            onChange={handleChange} 
            placeholder="Auto-extracted or manual entry"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Delivery Address</label>
          <input 
            type="text" 
            name="deliveryAddress" 
            className="form-input" 
            value={formData.deliveryAddress} 
            onChange={handleChange} 
            placeholder="Auto-extracted or manual entry"
            required
          />
        </div>
      </div>

      <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Retailer & Shipping</h3>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Retailer Name</label>
          <select 
            name="retailerName" 
            className="form-input" 
            value={formData.retailerName} 
            onChange={handleChange}
            required
          >
            <option value="" disabled>Select a retailer</option>
            {mockDropdownData.retailers.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Retailer Country</label>
          <select 
            name="retailerCountry" 
            className="form-input" 
            value={formData.retailerCountry} 
            onChange={handleChange}
            required
          >
            <option value="" disabled>Select a country</option>
            {mockDropdownData.countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Ex-Factory Date</label>
          <input 
            type="date" 
            name="exFactoryDate" 
            className="form-input" 
            value={formData.exFactoryDate} 
            onChange={handleChange} 
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Onboard Vessel Date</label>
          <input 
            type="date" 
            name="onboardVesselDate" 
            className="form-input" 
            value={formData.onboardVesselDate} 
            onChange={handleChange} 
            required
          />
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary">
          <Send className="btn-icon" size={18} /> Submit to FMS
        </button>
      </div>
      
    </form>
  );
}
