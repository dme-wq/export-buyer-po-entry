import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, CheckCircle, Search, Send, Clock, FileText, User, Calendar, FileDigit, MapPin, Building, Globe, Truck, Ship, Box, DollarSign, Loader2, List, Plus, Edit3 } from 'lucide-react';
import FileUpload from './FileUpload';
import { Toaster, toast } from 'react-hot-toast';
import { extractPODataWithGemini } from '../utils/gemini';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const displayFormatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${months[parseInt(month, 10) - 1]}-${year}`;
  }
  return dateStr;
};

const displayFormatTimestamp = (timestampStr) => {
  if (!timestampStr) return '';
  const d = new Date(timestampStr);
  if (isNaN(d.getTime())) return timestampStr;
  
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const CustomDateInput = ({ name, value, onChange, required, className }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <input
        type={isFocused || !value ? 'date' : 'text'}
        name={name}
        className={className}
        value={isFocused || !value ? value : displayFormatDate(value)}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onClick={(e) => {
          if (e.target.type === 'date' && e.target.showPicker) {
            try { e.target.showPicker(); } catch (err) {}
          }
        }}
        required={required}
        style={{ width: '100%' }}
      />
      {!isFocused && value && (
         <Calendar size={18} color="var(--text-heading)" style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }} />
      )}
    </div>
  );
};

export default function Form({ authenticatedEmail, onLogout }) {
  const [dropdownData, setDropdownData] = useState({ retailers: [], countries: [], buyers: [] });
  const [isBuyerNameInvalid, setIsBuyerNameInvalid] = useState(false);
  const [isRetailerNameInvalid, setIsRetailerNameInvalid] = useState(false);
  const [isRetailerCountryInvalid, setIsRetailerCountryInvalid] = useState(false);
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
    onboardVesselDate: '',
    poLink: ''
  });

  const [file, setFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // New states for Edit Interface
  const [mode, setMode] = useState('create'); // 'create', 'list', 'edit'
  const [userPOs, setUserPOs] = useState([]);
  const [isLoadingPOs, setIsLoadingPOs] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [originalTimestamp, setOriginalTimestamp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPO, setSelectedPO] = useState(null);

  const filteredPOs = userPOs.filter(po => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (po.poNumber || '').toLowerCase().includes(query) ||
      (po.buyerName || '').toLowerCase().includes(query) ||
      (po.retailerName || '').toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (mode === 'list') {
      fetchUserPOs();
    }
  }, [mode]);

  const fetchUserPOs = async () => {
    setIsLoadingPOs(true);
    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
      const response = await fetch(`${scriptUrl}?action=getPOs&email=${encodeURIComponent(authenticatedEmail)}`);
      const result = await response.json();
      if (result.status === 'success') {
        setUserPOs(result.data);
      }
    } catch (err) {
      console.error("Error fetching POs:", err);
      toast.error("Failed to load your POs");
    } finally {
      setIsLoadingPOs(false);
    }
  };

  // Fetch dynamic dropdowns with localStorage caching for instant loading
  useEffect(() => {
    const fetchDropdowns = async () => {
      // 1. Instantly load from cache if available
      const cached = localStorage.getItem('dropdownsCache');
      if (cached) {
        setDropdownData(JSON.parse(cached));
      }

      const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
      if (!scriptUrl) return;
      
      // 2. Fetch fresh data in the background
      try {
        const response = await fetch(scriptUrl);
        const result = await response.json();
        if (result.status === 'success') {
          const freshData = {
             retailers: result.data.retailers || [],
             countries: result.data.countries || [],
             buyers: result.data.buyers || []
          };
          setDropdownData(freshData);
          localStorage.setItem('dropdownsCache', JSON.stringify(freshData));
        }
      } catch (err) {
        console.error("Error fetching dropdowns in background:", err);
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
    if (name === 'retailerName') {
      setIsRetailerNameInvalid(false);
    }
    if (name === 'retailerCountry') {
      setIsRetailerCountryInvalid(false);
    }
  };

  const customSelectStyles = (isMismatch, isEmpty, hasExtractedValue) => ({
    control: (provided, state) => {
      let bg = state.isFocused ? '#fef08a' : '#f8fafc';
      let border = state.isFocused ? '#facc15' : '#cbd5e1';
      let textCol = 'var(--text-heading)';
      let phCol = 'var(--input-placeholder)';
      
      if (isMismatch) {
        bg = 'darkred';
        border = 'darkred';
        textCol = 'white';
        phCol = 'rgba(255,255,255,0.8)';
      } else if (isEmpty && !state.isFocused) {
        if (hasExtractedValue) {
          bg = '#fca5a5';
          border = '#f87171';
        } else {
          bg = '#fefce8';
          border = '#fef08a';
        }
      }
      
      return {
        ...provided,
        background: bg,
        borderColor: border,
        borderRadius: '10px',
        padding: '0',
        minHeight: '36px',
        fontSize: '1rem',
        boxShadow: state.isFocused ? '0 4px 16px rgba(123, 113, 249, 0.15)' : 'none',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
      };
    },
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 12px',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: isMismatch ? 'white' : 'var(--text-heading)',
      fontWeight: 600,
      fontSize: '1rem',
    }),
    placeholder: (provided, state) => ({
      ...provided,
      color: isMismatch ? 'rgba(255, 255, 255, 0.8)' : (isEmpty && !state.isFocused ? 'rgba(0,0,0,0.5)' : 'var(--input-placeholder)'),
      fontSize: '1rem',
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '10px',
      overflow: 'hidden',
      zIndex: 100,
      fontSize: '1rem',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'var(--accent-color)' : (state.isFocused ? '#fefce8' : 'white'),
      color: state.isSelected ? 'white' : 'black',
      cursor: 'pointer',
      padding: '6px 12px', 
    }),
  });

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

        const extractedRetailer = data.retailerName || '';
        let invalidRetailer = false;
        if (extractedRetailer && dropdownData.retailers.length > 0) {
          if (!dropdownData.retailers.includes(extractedRetailer)) {
            invalidRetailer = true;
          }
        }
        setIsRetailerNameInvalid(invalidRetailer);

        const extractedCountry = data.retailerCountry || '';
        let invalidCountry = false;
        if (extractedCountry && dropdownData.countries.length > 0) {
          if (!dropdownData.countries.includes(extractedCountry)) {
            invalidCountry = true;
          }
        }
        setIsRetailerCountryInvalid(invalidCountry);

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

        setHasExtracted(true);
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
      mimeType: mimeType,
      action: mode === 'edit' ? 'update' : 'create',
      rowIndex: editingRowIndex,
      originalTimestamp: originalTimestamp
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
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center' }}>
        <CheckCircle color="var(--success-color)" size={72} style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-heading)', marginBottom: '0.5rem' }}>Form Submitted Successfully!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>Your PO data has been recorded in the FMS.</p>
          <button 
          className="btn btn-primary"
          style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem', borderRadius: '50px', width: 'auto' }}
          onClick={() => {
            setIsSubmitted(false);
            setHasExtracted(false);
            setFile(null);
            setMode(mode === 'edit' ? 'list' : 'create');
            setFormData(prev => ({
              ...prev,
              buyerName: '', poDate: '', poNumber: '', poAmount: '', retailerName: '',
              retailerCountry: '', exFactoryDate: '', deliveryAddress: '', onboardVesselDate: '', poLink: ''
            }));
          }}
        >
          {mode === 'edit' ? 'Back to PO List' : 'Submit Another PO'}
        </button>
      </div>
    );
  }

  const renderAttachment = (link) => {
    if (!link || typeof link !== 'string') return null;
    
    // Check if it's an error message from Apps Script
    if (link.startsWith('Error uploading')) {
      return <div style={{ color: 'var(--error-color)', padding: '1rem', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5' }}>{link}</div>;
    }
    
    // If it doesn't start with http, it's not a valid URL (prevent it from loading the React app as a relative URL)
    if (!link.startsWith('http')) {
      return <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Invalid attachment link.</div>;
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem', background: '#f8fafc' }}>
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '0.75rem 2rem', 
            borderRadius: '50px',
            background: 'linear-gradient(135deg, #7b71f9 0%, #6054f0 100%)',
            color: 'white',
            fontWeight: '600',
            textDecoration: 'none',
            boxShadow: '0 4px 10px rgba(123, 113, 249, 0.3)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          View Document
        </a>
      </div>
    );
  };

  return (
    <>
    <Toaster position="top-center" reverseOrder={false} />

    {/* Floating Toggle Button (Portaled to body to escape CSS transform context) */}
    {createPortal(
      <button
        type="button"
        onClick={() => {
          if (mode === 'list') {
            setMode('create');
            setFormData(prev => ({ ...prev, buyerName: '', poDate: '', poNumber: '', poAmount: '', retailerName: '', retailerCountry: '', exFactoryDate: '', deliveryAddress: '', onboardVesselDate: '', poLink: '' }));
            setHasExtracted(false);
          } else {
            setMode('list');
          }
        }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '50%',
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.6), 0 8px 10px -6px rgba(79, 70, 229, 0.2)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(79, 70, 229, 0.6), 0 10px 10px -5px rgba(79, 70, 229, 0.2)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(79, 70, 229, 0.6), 0 8px 10px -6px rgba(79, 70, 229, 0.2)';
        }}
        title={mode === 'list' ? 'Create New PO' : 'View & Edit My POs'}
      >
        {mode === 'list' ? <Plus size={28} /> : <List size={28} />}
      </button>,
      document.body
    )}

    
    {mode === 'list' ? (
      <div className="animate-slide-up" style={{ padding: '1rem 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ 
            fontSize: '1.8rem', 
            fontWeight: '800', 
            background: 'linear-gradient(90deg, var(--accent-color), #33CCFF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px',
            marginBottom: '0.5rem'
          }}>
            RKD Export Purchase Order Entries
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>Select a previously submitted PO to view or edit</p>
        </div>
        
        {isLoadingPOs ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-color)" />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Search by PO, Buyer, or Retailer..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', width: '100%' }}
                />
              </div>
            </div>
            
            {filteredPOs.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
                No POs found. Click the + button to create one.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {filteredPOs.map((po, index) => (
                  <div 
                    key={index} 
                    className="glass-panel" 
                    onClick={() => setSelectedPO({ ...po, originalIndex: userPOs.findIndex(p => p.rowIndex === po.rowIndex) + 1 })}
                    style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent-color)' }}>{po.poNumber || 'No PO #'}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{displayFormatDate(po.poDate)}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{displayFormatTimestamp(po.timestamp)}</span>
                      </div>
                    </div>
                <div style={{ fontSize: '0.9rem' }}>
                  <strong>Buyer:</strong> {po.buyerName}
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  <strong>Retailer:</strong> {po.retailerName}
                </div>
                {po.poAmount && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--success-color)', fontWeight: 'bold' }}>
                    {po.poAmount}
                  </div>
                )}
                <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Click to view details
                </div>
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </div>
    ) : (
    <form onSubmit={handleSubmit} className={`animate-slide-up delay-2 ${hasExtracted || mode === 'edit' ? 'post-extraction' : 'pre-extraction'}`}>

      <FileUpload onFileSelect={handleFileUpload} file={file} isExtracting={isExtracting} />
      
      {mode === 'edit' && !file && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
          Upload a new document to replace the existing one, or leave it empty to keep the original attachment.
        </div>
      )}

      <h3 style={{ marginTop: '1.5rem', marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', color: 'var(--text-heading)' }}>
        <FileText size={22} color="var(--accent-color)" /> {mode === 'edit' ? 'Edit PO Details' : 'PO Details'}
      </h3>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <User size={14} color="var(--accent-color)"/> Buyer Name
          </label>
          <Select
            name="buyerName"
            value={
              formData.buyerName 
                ? (dropdownData.buyers.some(b => b.buyerName === formData.buyerName)
                    ? { value: formData.buyerName, label: formData.buyerName }
                    : { value: formData.buyerName, label: `${formData.buyerName} (Not in list)` })
                : null
            }
            onChange={(selectedOption) => {
              handleChange({ target: { name: 'buyerName', value: selectedOption ? selectedOption.value : '' } });
            }}
            options={dropdownData.buyers.map(b => ({ value: b.buyerName, label: b.buyerName }))}
            styles={customSelectStyles(isBuyerNameInvalid, !formData.buyerName, hasExtracted)}
            placeholder="Search Buyer Name..."
            isClearable
            isSearchable
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <FileText size={14} color="var(--accent-color)"/> File Number
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={fileNumber} 
            placeholder=""
            readOnly
            style={{ backgroundColor: '#e2e8f0', cursor: 'default' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Calendar size={14} color="var(--accent-color)"/> PO Date
          </label>
          <CustomDateInput 
            name="poDate" 
            className="form-input" 
            value={formData.poDate} 
            onChange={handleChange} 
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
            placeholder=""
            required
          />
        </div>


        <div className="form-group full-width">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <MapPin size={14} color="var(--accent-color)"/> Delivery Address
          </label>
          <textarea 
            name="deliveryAddress" 
            className="form-input" 
            value={formData.deliveryAddress} 
            onChange={handleChange} 
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = (e.target.scrollHeight) + 'px';
            }}
            placeholder=""
            required
            rows={1}
            style={{ resize: 'none', overflow: 'hidden', minHeight: '46px' }}
          />
        </div>
      </div>

      <h3 style={{ marginTop: '2.5rem', marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', color: 'var(--text-heading)' }}>
        <Box size={22} color="var(--accent-color)" /> Retailer & Shipping
      </h3>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Building size={14} color="var(--accent-color)"/> Retailer Name
          </label>
          <CreatableSelect
            name="retailerName"
            value={formData.retailerName ? { value: formData.retailerName, label: formData.retailerName } : null}
            onChange={(selectedOption) => {
              handleChange({ target: { name: 'retailerName', value: selectedOption ? selectedOption.value : '' } });
            }}
            options={dropdownData.retailers.map(r => ({ value: r, label: r }))}
            styles={customSelectStyles(isRetailerNameInvalid, !formData.retailerName, hasExtracted)}
            placeholder="Search or Add New..."
            formatCreateLabel={(inputValue) => `Add new retailer "${inputValue}"`}
            isClearable
            isSearchable
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Globe size={14} color="var(--accent-color)"/> Retailer Country
          </label>
          <CreatableSelect
            name="retailerCountry"
            value={formData.retailerCountry ? { value: formData.retailerCountry, label: formData.retailerCountry } : null}
            onChange={(selectedOption) => {
              handleChange({ target: { name: 'retailerCountry', value: selectedOption ? selectedOption.value : '' } });
            }}
            options={dropdownData.countries.map(c => ({ value: c, label: c }))}
            styles={customSelectStyles(isRetailerCountryInvalid, !formData.retailerCountry, hasExtracted)}
            placeholder="Search or Add New..."
            formatCreateLabel={(inputValue) => `Add new country "${inputValue}"`}
            isClearable
            isSearchable
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Truck size={14} color="var(--accent-color)"/> Ex-Factory Date
          </label>
          <CustomDateInput 
            name="exFactoryDate" 
            className="form-input" 
            value={formData.exFactoryDate} 
            onChange={handleChange} 
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Ship size={14} color="var(--accent-color)"/> Onboard Vessel Date
          </label>
          <CustomDateInput 
            name="onboardVesselDate" 
            className="form-input" 
            value={formData.onboardVesselDate} 
            onChange={handleChange} 
            required
          />
        </div>

        <div className="form-group full-width">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            PO Amount
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
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
             <><Loader2 className="btn-icon animate-spin" size={18} /> Submitting...</>
          ) : (
             <><Send className="btn-icon" size={18} /> Submit</>
          )}
        </button>
      </div>
      
    </form>
    )}

    {/* PO Details Modal */}
    {selectedPO && createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedPO(null)}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setSelectedPO(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button>
          
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-heading)', fontSize: '1.4rem' }}>
            <span style={{ color: 'var(--accent-color)' }}>PO:</span> {selectedPO.poNumber}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Buyer:</strong><br/>{selectedPO.buyerName}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Retailer:</strong><br/>{selectedPO.retailerName}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Country:</strong><br/>{selectedPO.retailerCountry}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Amount:</strong><br/>{selectedPO.poAmount}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>PO Date:</strong><br/>{displayFormatDate(selectedPO.poDate)}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Ex-Factory:</strong><br/>{displayFormatDate(selectedPO.exFactoryDate)}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Onboard Vessel:</strong><br/>{displayFormatDate(selectedPO.onboardVesselDate)}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Delivery Address:</strong><br/>{selectedPO.deliveryAddress}</div>
            <div><strong style={{ color: 'var(--text-secondary)' }}>Submitted On:</strong><br/>{displayFormatTimestamp(selectedPO.timestamp)}</div>
          </div>
          
          {selectedPO.poLink && (
            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Attached Document:</strong>
              <div style={{ marginTop: '0.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
                {renderAttachment(selectedPO.poLink)}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}
              onClick={() => {
                setFormData({
                  timestamp: selectedPO.timestamp,
                  email: selectedPO.email,
                  buyerName: selectedPO.buyerName,
                  poDate: selectedPO.poDate,
                  poNumber: selectedPO.poNumber,
                  poAmount: selectedPO.poAmount,
                  retailerName: selectedPO.retailerName,
                  retailerCountry: selectedPO.retailerCountry,
                  exFactoryDate: selectedPO.exFactoryDate,
                  deliveryAddress: selectedPO.deliveryAddress,
                  onboardVesselDate: selectedPO.onboardVesselDate,
                  poLink: selectedPO.poLink
                });
                setOriginalTimestamp(selectedPO.timestamp);
                setEditingRowIndex(selectedPO.originalIndex);
                setMode('edit');
                setSelectedPO(null);
              }}
            >
              <Edit3 size={18} /> Edit This Entry
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    </>
  );
}
