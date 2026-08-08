import React, { useState, useEffect } from 'react';
import { User, DollarSign, MapPin, Building, Globe, CheckCircle, FileText, Clipboard, ExternalLink } from 'lucide-react';
import Swal from 'sweetalert2';
import Select from 'react-select';
import toast, { Toaster } from 'react-hot-toast';

const customSelectStyles = (isInvalid, isEmpty, hasExtracted = false) => ({
  control: (base, state) => ({
    ...base,
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
    border: '2px solid',
    borderColor: isInvalid 
      ? 'var(--error-color)'
      : state.isFocused
        ? 'var(--accent-color)'
        : (hasExtracted && !isEmpty) 
          ? 'var(--success-color)' 
          : 'var(--border-color)',
    boxShadow: state.isFocused ? '0 0 0 4px rgba(79, 70, 229, 0.1)' : 'none',
    backgroundColor: '#f8fafc',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: isInvalid ? 'var(--error-color)' : 'var(--accent-color)',
      backgroundColor: '#ffffff'
    }
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected 
      ? 'var(--accent-color)' 
      : state.isFocused 
        ? '#f1f5f9' 
        : 'white',
    color: state.isSelected ? 'white' : 'var(--text-heading)',
    cursor: 'pointer',
    padding: '0.75rem 1rem',
    transition: 'all 0.2s ease',
    '&:active': {
      backgroundColor: 'var(--accent-color)',
      color: 'white'
    }
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    zIndex: 9999
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px'
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--text-secondary)',
    fontSize: '0.95rem'
  })
});

const generateCommissionOptions = () => {
  const options = [];
  for (let i = 0; i <= 20; i += 0.5) {
    options.push({ value: `${i}%`, label: `${i}%` });
  }
  return options;
};

const commissionOptions = generateCommissionOptions();

export default function BuyerForm({ authenticatedEmail }) {
  const [formData, setFormData] = useState({
    buyerSource: '',
    commission1: '0%',
    buyerSubSource: '',
    commission2: '0%',
    buyerName: '',
    buyerCountry: '',
    billingAddress: '',
    paymentTerms1: '',
    paymentTerms2: '',
    buyerShortName: ''
  });

  const [dropdownData, setDropdownData] = useState({
    buyerSources: [],
    buyerSubSources: [],
    countries: [],
    paymentTerms1: [],
    paymentTerms2: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Current time formatting
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }).replace(/ /g, '-') + ' ' + now.toLocaleTimeString('en-GB');
      setCurrentTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDropdowns = async () => {
      const cacheKey = 'buyerDropdownDataCache';
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        setDropdownData(JSON.parse(cached));
      } else {
        setIsLoading(true);
      }

      try {
        const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
        if (!scriptUrl) return;
        
        const response = await fetch(`${scriptUrl}?action=getDropdowns`);
        const result = await response.json();
        
        if (result.status === 'success') {
          const newData = {
            buyerSources: result.data.buyerSources || [],
            buyerSubSources: result.data.buyerSubSources || [],
            countries: result.data.countries || [],
            paymentTerms1: result.data.paymentTerms1 || [],
            paymentTerms2: result.data.paymentTerms2 || []
          };
          setDropdownData(newData);
          localStorage.setItem(cacheKey, JSON.stringify(newData));
        }
      } catch (error) {
        console.error('Error fetching dropdowns:', error);
        toast.error('Failed to load dropdown options.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDropdowns();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, selectedOption) => {
    setFormData(prev => ({ ...prev, [name]: selectedOption ? selectedOption.value : '' }));
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success('Link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const showErrorAlert = (title, text) => {
      Swal.fire({
        icon: 'error',
        title: title,
        text: text,
        confirmButtonColor: 'var(--accent-color)',
        customClass: { popup: 'animated tada' },
        background: '#ffffff',
        color: 'var(--text-heading)',
        borderRadius: '16px'
      });
    };

    if (!formData.buyerName.trim()) {
      showErrorAlert('Required Field', 'Please enter Buyer Name');
      return;
    }

    setIsSubmitting(true);

    try {
      const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
      
      const payload = {
        formType: 'addBuyer',
        emailAddress: authenticatedEmail,
        ...formData
      };

      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setIsSubmitted(true);
        // Clear caches so dropdowns in main form are forced to update
        localStorage.removeItem('buyerDropdownDataCache');
        localStorage.removeItem('dropdownsCache');
        // Trigger cross-tab event for main form to refresh
        localStorage.setItem('buyerAddedTrigger', Date.now().toString());
        // Dispatch custom event just in case it's on same tab
        window.dispatchEvent(new Event('buyerAdded'));
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      showErrorAlert('Submission Failed', error.message || 'Something went wrong while saving the buyer details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      buyerSource: '',
      commission1: '0%',
      buyerSubSource: '',
      commission2: '0%',
      buyerName: '',
      buyerCountry: '',
      billingAddress: '',
      paymentTerms1: '',
      paymentTerms2: '',
      buyerShortName: ''
    });
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center' }}>
        <CheckCircle color="var(--success-color)" size={72} style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--text-heading)', marginBottom: '0.5rem', fontSize: '1.75rem' }}>Buyer Added Successfully!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          The new buyer details have been saved to the database and will now reflect in the PO Entry form dropdowns.
        </p>
        <button 
          onClick={resetForm}
          className="btn-primary" 
          style={{ padding: '0.75rem 2rem' }}
        >
          Add Another Buyer
        </button>
      </div>
    );
  }

  return (
    <div className="form-container">
      <Toaster position="top-right" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Add New Buyer</h2>
        <button type="button" onClick={copyShareLink} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          <ExternalLink size={16} /> Share Link
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
        
        {/* Timestamp - Auto generated readOnly */}
        <div className="form-group">
          <label className="form-label">
            Timestamp
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={currentTime} 
            disabled
            style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
          />
        </div>

        {/* Email Address - Auto fetched readOnly */}
        <div className="form-group">
          <label className="form-label">
            Email Address
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={authenticatedEmail} 
            disabled
            style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Buyer Source</label>
            <Select
              name="buyerSource"
              value={formData.buyerSource ? { value: formData.buyerSource, label: formData.buyerSource } : null}
              onChange={(selected) => handleSelectChange('buyerSource', selected)}
              options={dropdownData.buyerSources.map(s => ({ value: s, label: s }))}
              styles={customSelectStyles(false, !formData.buyerSource)}
              placeholder="Select Source..."
              isClearable
              isSearchable
              isLoading={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Commission %</label>
            <Select
              name="commission1"
              value={{ value: formData.commission1, label: formData.commission1 }}
              onChange={(selected) => handleSelectChange('commission1', selected)}
              options={commissionOptions}
              styles={customSelectStyles(false, !formData.commission1)}
              placeholder="0%"
              isSearchable={false}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Buyer Sub Source</label>
            <Select
              name="buyerSubSource"
              value={formData.buyerSubSource ? { value: formData.buyerSubSource, label: formData.buyerSubSource } : null}
              onChange={(selected) => handleSelectChange('buyerSubSource', selected)}
              options={dropdownData.buyerSubSources.map(s => ({ value: s, label: s }))}
              styles={customSelectStyles(false, !formData.buyerSubSource)}
              placeholder="Select Sub Source..."
              isClearable
              isSearchable
              isLoading={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Commission %</label>
            <Select
              name="commission2"
              value={{ value: formData.commission2, label: formData.commission2 }}
              onChange={(selected) => handleSelectChange('commission2', selected)}
              options={commissionOptions}
              styles={customSelectStyles(false, !formData.commission2)}
              placeholder="0%"
              isSearchable={false}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <User size={14} color="var(--accent-color)"/> Buyer Name
          </label>
          <input 
            type="text" 
            name="buyerName"
            className="form-input" 
            value={formData.buyerName} 
            onChange={handleChange}
            placeholder="Enter full buyer name"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Globe size={14} color="var(--accent-color)"/> Buyer Country
          </label>
          <Select
            name="buyerCountry"
            value={formData.buyerCountry ? { value: formData.buyerCountry, label: formData.buyerCountry } : null}
            onChange={(selected) => handleSelectChange('buyerCountry', selected)}
            options={dropdownData.countries.map(c => ({ value: c, label: c }))}
            styles={customSelectStyles(false, !formData.buyerCountry)}
            placeholder="Select Country..."
            isClearable
            isSearchable
            isLoading={isLoading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <MapPin size={14} color="var(--accent-color)"/> Billing Address
          </label>
          <textarea 
            name="billingAddress"
            className="form-input" 
            value={formData.billingAddress} 
            onChange={handleChange}
            placeholder="Enter complete billing address"
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <FileText size={14} color="var(--accent-color)"/> Payment Terms 1
            </label>
            <Select
              name="paymentTerms1"
              value={formData.paymentTerms1 ? { value: formData.paymentTerms1, label: formData.paymentTerms1 } : null}
              onChange={(selected) => handleSelectChange('paymentTerms1', selected)}
              options={dropdownData.paymentTerms1.map(t => ({ value: t, label: t }))}
              styles={customSelectStyles(false, !formData.paymentTerms1)}
              placeholder="Select Terms..."
              isClearable
              isSearchable
              isLoading={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <FileText size={14} color="var(--accent-color)"/> Payment Terms 2
            </label>
            <Select
              name="paymentTerms2"
              value={formData.paymentTerms2 ? { value: formData.paymentTerms2, label: formData.paymentTerms2 } : null}
              onChange={(selected) => handleSelectChange('paymentTerms2', selected)}
              options={dropdownData.paymentTerms2.map(t => ({ value: t, label: t }))}
              styles={customSelectStyles(false, !formData.paymentTerms2)}
              placeholder="Select Terms..."
              isClearable
              isSearchable
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <Clipboard size={14} color="var(--accent-color)"/> Buyer Short Name
          </label>
          <input 
            type="text" 
            name="buyerShortName"
            className="form-input" 
            value={formData.buyerShortName} 
            onChange={handleChange}
            placeholder="Enter short name (e.g. HN)"
          />
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button 
            type="submit" 
            className="btn-primary w-full"
            disabled={isSubmitting}
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              padding: '1rem',
              fontSize: '1.1rem'
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.0711 4.92893L16.2426 7.75736M7.75736 16.2426L4.92893 19.0711M19.0711 19.0711L16.2426 16.2426M7.75736 7.75736L4.92893 4.92893" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saving Buyer Details...
              </span>
            ) : (
              'Add Buyer'
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
