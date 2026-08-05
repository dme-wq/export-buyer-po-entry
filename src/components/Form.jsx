import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, Search, Send, Clock, FileText, User, Calendar, FileDigit, MapPin, Building, Globe, Truck, Ship, Box, DollarSign } from 'lucide-react';
import FileUpload from './FileUpload';
import { Toaster, toast } from 'react-hot-toast';
import { extractPODataWithGemini } from '../utils/gemini';

export default function Form({ authenticatedEmail, onLogout }) {
  const [dropdownData, setDropdownData] = useState({ retailers: [], countries: [], buyers: [] });
  const [isBuyerNameInvalid, setIsBuyerNameInvalid] = useState(false);
  const [fileNumber, setFileNumber] = useState('');

  const [formData, setFormData] = useState({
    timestamp: '',
    email: authenticatedEmail || '',
    buyerName: '',
    poDate: '',
    poNumber: '',
    poAmount: '',
    retailerName: '',
    retailerCountry: '',
    exFactoryDate: '',
    deliveryAddress: '',
    onboardVesselDate: ''
  });

  const [file, setFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch dynamic dropdowns
  useEffect(() => {
    const fetchDropdowns = async () => {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
      if (!scriptUrl) return;
      try {
        const response = await fetch(scriptUrl);
        const result = await response.json();
        if (result.status === 'success') {
          setDropdownData({
             retailers: result.data.retailers || [],
             countries: result.data.countries || [],
             buyers: result.data.buyers || []
          });
        }
      } catch (err) {
        console.error("Error fetching dropdowns:", err);
      }
    };
    fetchDropdowns();
  }, []);

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

  // Append Short Name to PO Number and populate Virtual Column
  useEffect(() => {
    if (formData.buyerName && dropdownData.buyers.length > 0) {
      const matchedBuyer = dropdownData.buyers.find(b => b.buyerName === formData.buyerName);
      if (matchedBuyer) {
        setFileNumber(matchedBuyer.fileNumber);
        
        // Append short name to poNumber if both exist
        if (formData.poNumber && matchedBuyer.shortName) {
           const suffix = '_' + matchedBuyer.shortName;
           if (!formData.poNumber.endsWith(suffix)) {
             setFormData(prev => ({ ...prev, poNumber: prev.poNumber + suffix }));
           }
        }
      } else {
        setFileNumber('');
      }
    }
  }, [formData.buyerName, formData.poNumber, dropdownData.buyers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'buyerName') {
      setIsBuyerNameInvalid(false);
    }
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
        const data = await extractPODataWithGemini(base64String, mimeType);
        
        const extractedBuyer = data.buyerName || '';
        let invalidBuyer = false;
        
        if (extractedBuyer && dropdownData.buyers.length > 0) {
          if (!dropdownData.buyers.some(b => b.buyerName === extractedBuyer)) {
            invalidBuyer = true;
          }
        }
        setIsBuyerNameInvalid(invalidBuyer);

        setFormData(prev => ({
          ...prev,
          buyerName: extractedBuyer || prev.buyerName,
          poDate: data.poDate || prev.poDate,
          poNumber: data.poNumber || prev.poNumber,
          poAmount: data.poAmount || prev.poAmount,
          exFactoryDate: data.exFactoryDate || prev.exFactoryDate,
          deliveryAddress: data.deliveryAddress || prev.deliveryAddress,
          onboardVesselDate: data.onboardVesselDate || prev.onboardVesselDate,
          retailerName: data.retailerName || prev.retailerName,
          retailerCountry: data.retailerCountry || prev.retailerCountry
        }));

        toast.success("PO Data extracted successfully!");
      } catch (error) {
        console.error("OCR API error:", error);
        toast.error("Extraction failed. Please fill manually.");
      } finally {
        setIsExtracting(false);
      }
    };
    
    reader.onerror = error => {
      console.error("Error reading file:", error);
      setIsExtracting(false);
    };
  };

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]); // Only get the base64 part
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      toast.error("Google Apps Script URL is not configured. Please set VITE_GOOGLE_SCRIPT_URL.");
      return;
    }

    setIsSubmitting(true);
    
    let fileBase64 = '';
    let fileName = '';
    let mimeType = '';
    
    if (file) {
      try {
        fileBase64 = await getBase64(file);
        fileName = file.name;
        mimeType = file.type;
      } catch (err) {
        console.error("Error reading file:", err);
      }
    }

    const payload = {
      ...formData,
      fileContent: fileBase64,
      fileName: fileName,
      mimeType: mimeType
    };

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        // 'no-cors' is often needed for simple Apps Script POSTs from browsers, 
        // but 'cors' is better if doOptions is configured correctly.
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        toast.success("PO Submitted to FMS Successfully!");
        setIsSubmitted(true);
      } else {
        throw new Error(result.message || "Failed to submit");
      }
    } catch (error) {
      console.error("Submission Error:", error);
      toast.error("Failed to save to Google Sheets. Please check configuration.");
    } finally {
      setIsSubmitting(false);
    }
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
              buyerName: '', poDate: '', poNumber: '', poAmount: '', retailerName: '',
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
    <>
    <Toaster position="top-center" reverseOrder={false} />
    
    {/* Compact Top Right Profile Badge */}
    <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', fontSize: '0.7rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          <Clock size={12} /> {formData.timestamp}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success-color)', fontWeight: 600 }}>
            <CheckCircle size={12} /> {formData.email} 
            <button type="button" onClick={onLogout} style={{color: 'var(--error-color)', border: 'none', background: 'none', marginLeft: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: '2px 4px', borderRadius: '4px'}}>Sign Out</button>
        </div>
    </div>

    <form onSubmit={handleSubmit} className="animate-slide-up delay-2">

      <FileUpload onFileSelect={handleFileUpload} file={file} isExtracting={isExtracting} />

      <h3 style={{ marginTop: '2rem', marginBottom: '1.5rem', borderBottom: '2px solid #f3f4f6', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <FileText size={20} color="var(--accent-color)" /> PO Details
      </h3>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <User size={14} color="var(--accent-color)"/> Buyer Name
          </label>
          <select 
            name="buyerName" 
            className="form-input" 
            value={formData.buyerName} 
            onChange={handleChange}
            style={isBuyerNameInvalid ? { backgroundColor: 'darkred', color: 'white', borderColor: 'darkred' } : {}}
            required
          >
            <option value="" disabled>Select Buyer Name</option>
            {dropdownData.buyers.map(b => (
               <option key={b.buyerName} value={b.buyerName}>{b.buyerName}</option>
            ))}
            {isBuyerNameInvalid && formData.buyerName && (
               <option value={formData.buyerName} disabled>{formData.buyerName} (Not in list)</option>
            )}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <FileText size={14} color="var(--accent-color)"/> File Number (Virtual)
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={fileNumber} 
            placeholder="Auto-populated"
            readOnly
            style={{ backgroundColor: '#e2e8f0', cursor: 'default' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Calendar size={14} color="var(--accent-color)"/> PO Date
          </label>
          <input 
            type="date" 
            name="poDate" 
            className="form-input" 
            value={formData.poDate} 
            onChange={handleChange} 
            onClick={(e) => e.target.showPicker && e.target.showPicker()}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <FileDigit size={14} color="var(--accent-color)"/> Buyer PO Number
          </label>
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
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <DollarSign size={14} color="var(--accent-color)"/> PO Amount
          </label>
          <input 
            type="text" 
            name="poAmount" 
            className="form-input" 
            value={formData.poAmount} 
            onChange={handleChange} 
            placeholder="Total Amount"
            required
          />
        </div>

        <div className="form-group full-width">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <MapPin size={14} color="var(--accent-color)"/> Delivery Address
          </label>
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

      <h3 style={{ marginTop: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #f3f4f6', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Box size={20} color="var(--accent-color)" /> Retailer & Shipping
      </h3>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Building size={14} color="var(--accent-color)"/> Retailer Name
          </label>
          <select 
            name="retailerName" 
            className="form-input" 
            value={formData.retailerName} 
            onChange={handleChange}
            required
          >
            <option value="" disabled>Select a retailer</option>
            {dropdownData.retailers.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Globe size={14} color="var(--accent-color)"/> Retailer Country
          </label>
          <select 
            name="retailerCountry" 
            className="form-input" 
            value={formData.retailerCountry} 
            onChange={handleChange}
            required
          >
            <option value="" disabled>Select a country</option>
            {dropdownData.countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Truck size={14} color="var(--accent-color)"/> Ex-Factory Date
          </label>
          <input 
            type="date" 
            name="exFactoryDate" 
            className="form-input" 
            value={formData.exFactoryDate} 
            onChange={handleChange} 
            onClick={(e) => e.target.showPicker && e.target.showPicker()}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Ship size={14} color="var(--accent-color)"/> Onboard Vessel Date
          </label>
          <input 
            type="date" 
            name="onboardVesselDate" 
            className="form-input" 
            value={formData.onboardVesselDate} 
            onChange={handleChange} 
            onClick={(e) => e.target.showPicker && e.target.showPicker()}
            required
          />
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
             <><Loader2 className="btn-icon animate-spin" size={18} /> Submitting...</>
          ) : (
             <><Send className="btn-icon" size={18} /> Submit</>
          )}
        </button>
      </div>
      
    </form>
    </>
  );
}
