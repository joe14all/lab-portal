import React, { useState} from 'react';
import { useAuth, useToast } from '../../contexts';
import styles from "./LabGeneralSettings.module.css";

const LAB_TYPES = [
  "Full Service",
  "Orthodontic",
  "Removable Only",
  "Crown & Bridge",
  "Milling Center",
  "Implant Specialist"
];

const LabGeneralSettings = () => {
  const { activeLab } = useAuth();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState(() => {
    if (activeLab) {
      // Ensure type is always an array for the multi-select
      let initialTypes = [];
      if (Array.isArray(activeLab.type)) {
        initialTypes = activeLab.type;
      } else if (activeLab.type) {
        initialTypes = [activeLab.type];
      }

      return {
        name: activeLab.name || '',
        type: initialTypes,
        address: activeLab.address?.line1 || '',
        city: activeLab.address?.city || '',
        state: activeLab.address?.state || '',
        zip: activeLab.address?.zip || '',
        phone: activeLab.contact?.phone || '',
        email: activeLab.contact?.email || ''
      };
    }
    
    return {
      name: '',
      type: [], // Array for multi-select
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: ''
    };
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, selectedOptions } = e.target;
    
    if (type === 'select-multiple') {
      // Handle Multi-Select
      const values = Array.from(selectedOptions, option => option.value);
      setFormData({ ...formData, [name]: values });
    } else {
      // Handle Standard Inputs
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API Call
    console.log("Saving Lab Data:", formData);
    
    setTimeout(() => {
      setIsSaving(false);
      addToast("Lab settings saved successfully", "success");
    }, 800);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>General Information</h2>
        <p>Update your laboratory's public profile and contact details.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSave}>
          
          {/* SECTION 1: IDENTITY */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Identity</h3>
            <div className={styles.grid2}>
              <div className="form-group">
                <label>Lab Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="e.g. JS Dental Lab"
                />
              </div>
              <div className="form-group">
                <label>Lab Type(s)</label>
                <div className={styles.selectWrapper}>
                  <select 
                    name="type" 
                    multiple
                    value={formData.type} 
                    onChange={handleChange}
                    className={styles.multiSelect}
                  >
                    {LAB_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <small className={styles.helperText}>Hold Ctrl (Cmd) to select multiple</small>
                </div>
              </div>
            </div>
          </div>

          <hr className={styles.divider} />

          {/* SECTION 2: LOCATION */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Location</h3>
            <div className="form-group">
              <label>Street Address</label>
              <input 
                type="text" 
                name="address" 
                value={formData.address} 
                onChange={handleChange} 
                placeholder="123 Main St, Suite 100"
              />
            </div>

            <div className={styles.grid3}>
              <div className="form-group">
                <label>City</label>
                <input 
                  type="text" 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input 
                  type="text" 
                  name="state" 
                  value={formData.state} 
                  onChange={handleChange} 
                />
              </div>
              <div className="form-group">
                <label>Zip Code</label>
                <input 
                  type="text" 
                  name="zip" 
                  value={formData.zip} 
                  onChange={handleChange} 
                />
              </div>
            </div>
          </div>

          <hr className={styles.divider} />

          {/* SECTION 3: CONTACT */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Contact Info</h3>
            <div className={styles.grid2}>
              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="contact@lab.com"
                />
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className={styles.actions}>
            <button 
              type="submit" 
              className="button primary" 
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default LabGeneralSettings;