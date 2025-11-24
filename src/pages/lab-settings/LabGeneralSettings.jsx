import React, { useState } from 'react';
import { useAuth } from '../../contexts';
import styles from "./LabGeneralSettings.module.css"

const LabGeneralSettings = () => {
  const { activeLab } = useAuth();
  // In a real app, you would have an updateLab function
  
  const [formData, setFormData] = useState({
    name: activeLab?.name || '',
    address: activeLab?.address?.line1 || '',
    city: activeLab?.address?.city || '',
    state: activeLab?.address?.state || '',
    zip: activeLab?.address?.zip || '',
    phone: activeLab?.contact?.phone || ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>General Information</h2>
      <div className="card">
        <div className="form-group">
          <label>Lab Name</label>
          <input 
            type="text" name="name" 
            value={formData.name} onChange={handleChange} 
          />
        </div>
        
        <div className="form-group">
          <label>Address Line 1</label>
          <input 
            type="text" name="address" 
            value={formData.address} onChange={handleChange} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>City</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>State</label>
            <input type="text" name="state" value={formData.state} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Zip Code</label>
            <input type="text" name="zip" value={formData.zip} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label>Contact Phone</label>
          <input 
            type="tel" name="phone" 
            value={formData.phone} onChange={handleChange} 
          />
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button className="button primary">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default LabGeneralSettings;