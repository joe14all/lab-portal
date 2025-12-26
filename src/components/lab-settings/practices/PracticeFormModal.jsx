import React, { useState, useMemo } from 'react';
import Modal from '../../common/Modal';
import { useCrm } from '../../../contexts/CrmContext';
import { 
  IconUser, 
  IconSearch,
  IconPlus,
  IconInvoice,
  IconSettings,
  IconCheck,
  IconTruck,
  IconChevronRight
} from '../../../layouts/components/LabIcons';
import styles from './PracticeFormModal.module.css';

const PracticeFormModal = ({ isOpen, practice, onClose }) => {
  const { priceLists = [], doctors = [], addClinic, updateClinic, linkDoctorToClinic, unlinkDoctorFromClinic } = useCrm();
  const [activeTab, setActiveTab] = useState('general');
  const [doctorView, setDoctorView] = useState('list');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [errors, setErrors] = useState({});
  
  // State initialized once to prevent cascading renders (ESLint fix)
  const [formData, setFormData] = useState({
    // General Information
    name: practice?.name || '',
    accountNumber: practice?.accountNumber || '',
    
    // Contact Information
    primaryContactName: practice?.contacts?.primary?.name || '',
    primaryContactPhone: practice?.contacts?.primary?.phone || '',
    primaryContactEmail: practice?.contacts?.primary?.email || '',
    billingContactName: practice?.contacts?.billing?.name || '',
    billingContactEmail: practice?.contacts?.billing?.email || '',
    
    // Shipping Address
    shippingLine1: practice?.addresses?.shipping?.line1 || '',
    shippingLine2: practice?.addresses?.shipping?.line2 || '',
    shippingSuite: practice?.addresses?.shipping?.suite || '',
    shippingCity: practice?.addresses?.shipping?.city || '',
    shippingState: practice?.addresses?.shipping?.state || '',
    shippingZip: practice?.addresses?.shipping?.zip || '',
    shippingCountry: practice?.addresses?.shipping?.country || 'US',
    
    // Billing Address
    billingLine1: practice?.addresses?.billing?.line1 || '',
    billingLine2: practice?.addresses?.billing?.line2 || '',
    billingSuite: practice?.addresses?.billing?.suite || '',
    billingCity: practice?.addresses?.billing?.city || '',
    billingState: practice?.addresses?.billing?.state || '',
    billingZip: practice?.addresses?.billing?.zip || '',
    billingCountry: practice?.addresses?.billing?.country || 'US',
    useSameAddress: practice ? 
      JSON.stringify(practice.addresses?.shipping) === JSON.stringify(practice.addresses?.billing) : 
      true,
    
    // Financial
    activePriceListId: practice?.priceListId || practice?.activePriceListId || 'pl-standard-2025',
    billingCycle: practice?.preferences?.billingCycle || 'monthly',
    autoPay: practice?.preferences?.autoPay ?? false,
    
    // Preferences
    shippingProvider: practice?.preferences?.shippingProvider || 'UPS',
    invoiceDelivery: practice?.preferences?.invoiceDelivery || 'Email',
    
    // Integration
    portalEnabled: practice?.portalEnabled ?? true,
    ehrSystem: practice?.integration?.ehrSystem || '',
    syncEnabled: practice?.integration?.syncEnabled ?? false,
    
    // Notes
    notes: practice?.notes || '',
    
    // Status
    status: practice?.status || 'Active'
  });

  // Multi-link logic: Doctors who belong to this clinic
  const linkedDoctors = useMemo(() => {
    if (!practice) return [];
    return doctors.filter(d => 
      d.clinicIds?.includes(practice.id) || d.clinicId === practice.id
    );
  }, [practice, doctors]);

  // Directory logic: Find other doctors NOT in this clinic
  const searchableDoctors = useMemo(() => {
    return doctors.filter(d => {
      const isAlreadyLinked = d.clinicIds?.includes(practice?.id) || d.clinicId === practice?.id;
      const match = (d.firstName + ' ' + d.lastName).toLowerCase().includes(doctorSearch.toLowerCase());
      return !isAlreadyLinked && match;
    });
  }, [doctors, doctorSearch, practice]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Practice name is required';
    }

    if (!formData.primaryContactEmail.trim()) {
      newErrors.primaryContactEmail = 'Primary contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryContactEmail)) {
      newErrors.primaryContactEmail = 'Invalid email format';
    }

    if (formData.primaryContactPhone && !/^[\d\s\-\+\(\)]+$/.test(formData.primaryContactPhone)) {
      newErrors.primaryContactPhone = 'Invalid phone number format';
    }

    if (formData.billingContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.billingContactEmail)) {
      newErrors.billingContactEmail = 'Invalid email format';
    }

    // Shipping address validation
    if (!formData.shippingLine1.trim()) {
      newErrors.shippingLine1 = 'Shipping address is required';
    }

    if (!formData.shippingCity.trim()) {
      newErrors.shippingCity = 'City is required';
    }

    if (!formData.shippingState.trim()) {
      newErrors.shippingState = 'State is required';
    }

    if (!formData.shippingZip.trim()) {
      newErrors.shippingZip = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.shippingZip)) {
      newErrors.shippingZip = 'Invalid ZIP format (use 12345 or 12345-6789)';
    }

    // Billing address validation (if different from shipping)
    if (!formData.useSameAddress) {
      if (!formData.billingLine1.trim()) {
        newErrors.billingLine1 = 'Billing address is required';
      }
      if (!formData.billingCity.trim()) {
        newErrors.billingCity = 'City is required';
      }
      if (!formData.billingState.trim()) {
        newErrors.billingState = 'State is required';
      }
      if (!formData.billingZip.trim()) {
        newErrors.billingZip = 'ZIP code is required';
      } else if (!/^\d{5}(-\d{4})?$/.test(formData.billingZip)) {
        newErrors.billingZip = 'Invalid ZIP format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLink = (doctorId) => {
    if (!practice?.id) return;
    linkDoctorToClinic(doctorId, practice.id);
    setDoctorView('list');
    setDoctorSearch('');
  };

  const handleUnlink = (doctorId) => {
    if (!practice?.id) return;
    unlinkDoctorFromClinic(doctorId, practice.id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const shippingAddress = {
      line1: formData.shippingLine1,
      line2: formData.shippingLine2 || undefined,
      suite: formData.shippingSuite || undefined,
      city: formData.shippingCity,
      state: formData.shippingState,
      zip: formData.shippingZip,
      country: formData.shippingCountry
    };

    const billingAddress = formData.useSameAddress ? shippingAddress : {
      line1: formData.billingLine1,
      line2: formData.billingLine2 || undefined,
      suite: formData.billingSuite || undefined,
      city: formData.billingCity,
      state: formData.billingState,
      zip: formData.billingZip,
      country: formData.billingCountry
    };

    const data = {
      name: formData.name,
      accountNumber: formData.accountNumber || `ACC-${Date.now()}`,
      status: formData.status,
      priceListId: formData.activePriceListId,
      contacts: {
        primary: {
          name: formData.primaryContactName,
          phone: formData.primaryContactPhone,
          email: formData.primaryContactEmail
        },
        billing: {
          name: formData.billingContactName || formData.primaryContactName,
          email: formData.billingContactEmail || formData.primaryContactEmail
        }
      },
      addresses: {
        shipping: shippingAddress,
        billing: billingAddress
      },
      preferences: {
        shippingProvider: formData.shippingProvider,
        invoiceDelivery: formData.invoiceDelivery,
        billingCycle: formData.billingCycle,
        autoPay: formData.autoPay
      },
      integration: {
        ehrSystem: formData.ehrSystem,
        syncEnabled: formData.syncEnabled
      },
      portalEnabled: formData.portalEnabled,
      notes: formData.notes
    };

    practice ? updateClinic(practice.id, data) : addClinic(data);
    onClose();
  };

  const modalFooter = (
    <div className={styles.footerHub}>
      <div className={styles.footerLeft}>
        {practice && <span className={styles.idBadge}>UUID: {practice.id}</span>}
      </div>
      <div className={styles.footerRight}>
        <button type="button" onClick={onClose} className={styles.btnSecondary}>Discard</button>
        <button type="submit" form="practice-hub-form" className={styles.btnPrimary}>
          {practice ? 'Save Profile' : 'Register Practice'}
        </button>
      </div>
    </div>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={practice ? `Hub: ${practice.name}` : 'New Practice Profile'} 
      width="1020px" 
      footer={modalFooter}
    >
      <div className={styles.hubContainer}>
        {/* Navigation Sidebar */}
        <aside className={styles.sidebar}>
          <button className={`${styles.navItem} ${activeTab === 'general' ? styles.active : ''}`} onClick={() => setActiveTab('general')}>
            <IconUser className={styles.navIcon} /> 
            <span className={styles.navLabel}>General</span>
          </button>
          
          <button className={`${styles.navItem} ${activeTab === 'account' ? styles.active : ''}`} onClick={() => setActiveTab('account')}>
            <IconInvoice className={styles.navIcon} /> 
            <span className={styles.navLabel}>Financials</span>
          </button>

          <button className={`${styles.navItem} ${activeTab === 'doctors' ? styles.active : ''}`} onClick={() => setActiveTab('doctors')} disabled={!practice}>
            <IconPlus className={styles.navIcon} /> 
            <span className={styles.navLabel}>Staff</span>
            {linkedDoctors.length > 0 && <span className={styles.countBadge}>{linkedDoctors.length}</span>}
          </button>

          <button className={`${styles.navItem} ${activeTab === 'config' ? styles.active : ''}`} onClick={() => setActiveTab('config')}>
            <IconSettings className={styles.navIcon} /> 
            <span className={styles.navLabel}>Integrations</span>
          </button>
        </aside>

        {/* Content Workspace */}
        <main className={styles.workspace}>
          <form id="practice-hub-form" onSubmit={handleSubmit} className={styles.paneTransition}>
            
            {activeTab === 'general' && (
              <div className={styles.section}>
                <div className={styles.card}>
                  <h4 className={styles.cardHeader}>Practice Information</h4>
                  <div className={styles.formGrid}>
                    <div className={styles.spanFull}>
                      <label className={styles.fieldLabel}>Practice / Clinic Name *</label>
                      <input 
                        className={`${styles.textInput} ${errors.name ? styles.inputError : ''}`}
                        required 
                        value={formData.name} 
                        onChange={e => handleFieldChange('name', e.target.value)} 
                        placeholder="Full legal name..." 
                      />
                      {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Account Number</label>
                      <input 
                        className={styles.textInput}
                        value={formData.accountNumber} 
                        onChange={e => handleFieldChange('accountNumber', e.target.value)} 
                        placeholder="Auto-generated if empty" 
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Status</label>
                      <select 
                        className={styles.selectInput} 
                        value={formData.status} 
                        onChange={e => handleFieldChange('status', e.target.value)}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardHeader}>Primary Contact</h4>
                  <div className={styles.formGrid}>
                    <div className={styles.spanFull}>
                      <label className={styles.fieldLabel}>Contact Person</label>
                      <input 
                        className={styles.textInput}
                        value={formData.primaryContactName} 
                        onChange={e => handleFieldChange('primaryContactName', e.target.value)} 
                        placeholder="Office manager or primary contact" 
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Email *</label>
                      <input 
                        className={`${styles.textInput} ${errors.primaryContactEmail ? styles.inputError : ''}`}
                        type="email" 
                        value={formData.primaryContactEmail} 
                        onChange={e => handleFieldChange('primaryContactEmail', e.target.value)} 
                        placeholder="contact@practice.com" 
                      />
                      {errors.primaryContactEmail && <span className={styles.errorText}>{errors.primaryContactEmail}</span>}
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Phone</label>
                      <input 
                        className={`${styles.textInput} ${errors.primaryContactPhone ? styles.inputError : ''}`}
                        type="tel" 
                        value={formData.primaryContactPhone} 
                        onChange={e => handleFieldChange('primaryContactPhone', e.target.value)} 
                        placeholder="(555) 000-0000" 
                      />
                      {errors.primaryContactPhone && <span className={styles.errorText}>{errors.primaryContactPhone}</span>}
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardHeader}>Shipping Address</h4>
                  <div className={styles.formGrid}>
                    <div className={styles.spanFull}>
                      <label className={styles.fieldLabel}>Street Address *</label>
                      <input 
                        className={`${styles.textInput} ${errors.shippingLine1 ? styles.inputError : ''}`}
                        value={formData.shippingLine1} 
                        onChange={e => handleFieldChange('shippingLine1', e.target.value)} 
                        placeholder="123 Main Street" 
                      />
                      {errors.shippingLine1 && <span className={styles.errorText}>{errors.shippingLine1}</span>}
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Address Line 2</label>
                      <input 
                        className={styles.textInput}
                        value={formData.shippingLine2} 
                        onChange={e => handleFieldChange('shippingLine2', e.target.value)} 
                        placeholder="Apartment, suite, etc." 
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Suite/Unit</label>
                      <input 
                        className={styles.textInput}
                        value={formData.shippingSuite} 
                        onChange={e => handleFieldChange('shippingSuite', e.target.value)} 
                        placeholder="Suite 100" 
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>City *</label>
                      <input 
                        className={`${styles.textInput} ${errors.shippingCity ? styles.inputError : ''}`}
                        value={formData.shippingCity} 
                        onChange={e => handleFieldChange('shippingCity', e.target.value)} 
                        placeholder="City name" 
                      />
                      {errors.shippingCity && <span className={styles.errorText}>{errors.shippingCity}</span>}
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>State *</label>
                      <input 
                        className={`${styles.textInput} ${errors.shippingState ? styles.inputError : ''}`}
                        value={formData.shippingState} 
                        onChange={e => handleFieldChange('shippingState', e.target.value)} 
                        placeholder="NY" 
                        maxLength="2"
                      />
                      {errors.shippingState && <span className={styles.errorText}>{errors.shippingState}</span>}
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>ZIP Code *</label>
                      <input 
                        className={`${styles.textInput} ${errors.shippingZip ? styles.inputError : ''}`}
                        value={formData.shippingZip} 
                        onChange={e => handleFieldChange('shippingZip', e.target.value)} 
                        placeholder="12345" 
                      />
                      {errors.shippingZip && <span className={styles.errorText}>{errors.shippingZip}</span>}
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardHeader}>Billing Address</h4>
                  <label className={styles.inlineCheckbox}>
                    <input 
                      type="checkbox" 
                      checked={formData.useSameAddress} 
                      onChange={e => handleFieldChange('useSameAddress', e.target.checked)} 
                    />
                    <span>Same as shipping address</span>
                  </label>
                  {!formData.useSameAddress && (
                    <div className={styles.formGrid} style={{marginTop: '1.5rem'}}>
                      <div className={styles.spanFull}>
                        <label className={styles.fieldLabel}>Street Address *</label>
                        <input 
                          className={`${styles.textInput} ${errors.billingLine1 ? styles.inputError : ''}`}
                          value={formData.billingLine1} 
                          onChange={e => handleFieldChange('billingLine1', e.target.value)} 
                          placeholder="123 Main Street" 
                        />
                        {errors.billingLine1 && <span className={styles.errorText}>{errors.billingLine1}</span>}
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Address Line 2</label>
                        <input 
                          className={styles.textInput}
                          value={formData.billingLine2} 
                          onChange={e => handleFieldChange('billingLine2', e.target.value)} 
                          placeholder="PO Box, etc." 
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Suite/Unit</label>
                        <input 
                          className={styles.textInput}
                          value={formData.billingSuite} 
                          onChange={e => handleFieldChange('billingSuite', e.target.value)} 
                          placeholder="Suite 100" 
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>City *</label>
                        <input 
                          className={`${styles.textInput} ${errors.billingCity ? styles.inputError : ''}`}
                          value={formData.billingCity} 
                          onChange={e => handleFieldChange('billingCity', e.target.value)} 
                          placeholder="City name" 
                        />
                        {errors.billingCity && <span className={styles.errorText}>{errors.billingCity}</span>}
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>State *</label>
                        <input 
                          className={`${styles.textInput} ${errors.billingState ? styles.inputError : ''}`}
                          value={formData.billingState} 
                          onChange={e => handleFieldChange('billingState', e.target.value)} 
                          placeholder="NY" 
                          maxLength="2"
                        />
                        {errors.billingState && <span className={styles.errorText}>{errors.billingState}</span>}
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>ZIP Code *</label>
                        <input 
                          className={`${styles.textInput} ${errors.billingZip ? styles.inputError : ''}`}
                          value={formData.billingZip} 
                          onChange={e => handleFieldChange('billingZip', e.target.value)} 
                          placeholder="12345" 
                        />
                        {errors.billingZip && <span className={styles.errorText}>{errors.billingZip}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className={styles.section}>
                <div className={styles.card}>
                  <h4 className={styles.cardHeader}>Pricing & Billing</h4>
                  <div className={styles.formGrid}>
                    <div>
                      <label className={styles.fieldLabel}>Price List Tier</label>
                      <select 
                        className={styles.selectInput} 
                        value={formData.activePriceListId} 
                        onChange={e => handleFieldChange('activePriceListId', e.target.value)}
                      >
                        <option value="pl-standard-2025">Standard Lab Rates</option>
                        {priceLists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Billing Cycle</label>
                      <select 
                        className={styles.selectInput} 
                        value={formData.billingCycle} 
                        onChange={e => handleFieldChange('billingCycle', e.target.value)}
                      >
                        <option value="monthly">Monthly Settlement</option>
                        <option value="per-case">Invoice per Case</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Invoice Delivery</label>
                      <select 
                        className={styles.selectInput} 
                        value={formData.invoiceDelivery} 
                        onChange={e => handleFieldChange('invoiceDelivery', e.target.value)}
                      >
                        <option value="Email">Email</option>
                        <option value="Portal">Portal Only</option>
                        <option value="Both">Email & Portal</option>
                      </select>
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Auto-Pay Status</label>
                      <select 
                        className={styles.selectInput} 
                        value={formData.autoPay ? 'enabled' : 'disabled'} 
                        onChange={e => handleFieldChange('autoPay', e.target.value === 'enabled')}
                      >
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardHeader}>Billing Contact</h4>
                  <div className={styles.formGrid}>
                    <div>
                      <label className={styles.fieldLabel}>Billing Contact Name</label>
                      <input 
                        className={styles.textInput}
                        value={formData.billingContactName} 
                        onChange={e => handleFieldChange('billingContactName', e.target.value)} 
                        placeholder="Accounts payable contact" 
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Billing Email</label>
                      <input 
                        className={`${styles.textInput} ${errors.billingContactEmail ? styles.inputError : ''}`}
                        type="email" 
                        value={formData.billingContactEmail} 
                        onChange={e => handleFieldChange('billingContactEmail', e.target.value)} 
                        placeholder="billing@practice.com" 
                      />
                      {errors.billingContactEmail && <span className={styles.errorText}>{errors.billingContactEmail}</span>}
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardHeader}>Shipping Preferences</h4>
                  <div className={styles.formGrid}>
                    <div>
                      <label className={styles.fieldLabel}>Preferred Carrier</label>
                      <select 
                        className={styles.selectInput} 
                        value={formData.shippingProvider} 
                        onChange={e => handleFieldChange('shippingProvider', e.target.value)}
                      >
                        <option value="UPS">UPS</option>
                        <option value="FedEx">FedEx</option>
                        <option value="USPS">USPS</option>
                        <option value="Courier">Lab Courier</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardHeader}>Internal Notes</h4>
                  <textarea 
                    className={styles.textArea} 
                    value={formData.notes} 
                    onChange={e => handleFieldChange('notes', e.target.value)} 
                    rows="6" 
                    placeholder="Credit terms, special instructions, relationship notes, etc..." 
                  />
                </div>
              </div>
            )}

            {activeTab === 'doctors' && (
              <div className={styles.section}>
                <header className={styles.tabHeader}>
                  <div>
                    <h3 className={styles.tabTitle}>Clinical Staff</h3>
                    <p className={styles.tabSubtitle}>Doctors authorized for this practice location</p>
                  </div>
                  <div className={styles.headerButtons}>
                    <button type="button" className={styles.btnOutlineSmall} onClick={() => setDoctorView('link')}>Link Existing</button>
                    <button type="button" className={styles.btnPrimarySmall} onClick={() => setDoctorView('add')}>+ Register New</button>
                  </div>
                </header>

                {doctorView === 'list' ? (
                  <div className={styles.doctorGrid}>
                    {linkedDoctors.map(doc => (
                      <div key={doc.id} className={styles.doctorCard}>
                        <div className={styles.initialCircle}>{doc.firstName[0]}</div>
                        <div className={styles.doctorMeta}>
                          <strong>Dr. {doc.firstName} {doc.lastName}</strong>
                          <span>{doc.specialty || 'General Practitioner'}</span>
                        </div>
                        <button type="button" className={styles.btnTextDanger} onClick={() => handleUnlink(doc.id)}>Unlink</button>
                      </div>
                    ))}
                    {linkedDoctors.length === 0 && <div className={styles.emptyCard}>No practitioners have been linked to this practice hub.</div>}
                  </div>
                ) : (
                  <div className={styles.workflow}>
                    <button type="button" className={styles.btnBack} onClick={() => setDoctorView('list')}>← Return to Staff List</button>
                    <div className={styles.searchBar}>
                      <IconSearch className={styles.searchIcon} width="18" />
                      <input className={styles.directoryInput} placeholder="Search doctors by name or email..." value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)} />
                    </div>
                    <div className={styles.directoryList}>
                      {searchableDoctors.map(doc => (
                        <div key={doc.id} className={styles.directoryRow}>
                          <div className={styles.dirInfo}>
                            <strong>Dr. {doc.firstName} {doc.lastName}</strong>
                            <span>{doc.email}</span>
                          </div>
                          <button type="button" className={styles.btnActionLink} onClick={() => handleLink(doc.id)}>
                            Link to Clinic
                          </button>
                        </div>
                      ))}
                      {searchableDoctors.length === 0 && <div className={styles.emptyCard}>No available practitioners found in the system directory.</div>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'config' && (
              <div className={styles.section}>
                <div className={styles.card}>
                  <h4 className={styles.cardHeader}>Doctor Portal Access</h4>
                  <div className={styles.toggleField}>
                    <div className={styles.toggleText}>
                      <strong>Enable Portal Access</strong>
                      <p>Allow linked doctors to track cases and view invoices online.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className={styles.switch} 
                      checked={formData.portalEnabled} 
                      onChange={e => handleFieldChange('portalEnabled', e.target.checked)} 
                    />
                  </div>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardHeader}>EHR / Practice Management Integration</h4>
                  <div className={styles.formGrid}>
                    <div>
                      <label className={styles.fieldLabel}>EHR System</label>
                      <select 
                        className={styles.selectInput} 
                        value={formData.ehrSystem} 
                        onChange={e => handleFieldChange('ehrSystem', e.target.value)}
                      >
                        <option value="">No Integration</option>
                        <option value="DentrixAscend_V2">Dentrix Ascend</option>
                        <option value="OpenDental">Open Dental</option>
                        <option value="Eaglesoft">Eaglesoft</option>
                        <option value="Curve">Curve Dental</option>
                        <option value="PracticeWorks">Practice Works</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Sync Status</label>
                      <select 
                        className={styles.selectInput} 
                        value={formData.syncEnabled ? 'enabled' : 'disabled'} 
                        onChange={e => handleFieldChange('syncEnabled', e.target.value === 'enabled')}
                        disabled={!formData.ehrSystem}
                      >
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>
                  {formData.ehrSystem && (
                    <div style={{marginTop: '1rem', padding: '1rem', background: 'var(--neutral-50)', borderRadius: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                      <strong>Integration Active:</strong> Case data will sync with {formData.ehrSystem}
                    </div>
                  )}
                </div>
              </div>
            )}

          </form>
        </main>
      </div>
    </Modal>
  );
};

export default PracticeFormModal;