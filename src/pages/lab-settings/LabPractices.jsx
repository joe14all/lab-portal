import React, { useState, useMemo } from 'react';
import { useCrm } from '../../contexts/CrmContext';
import SearchBar from '../../components/common/SearchBar';
import PracticeFormModal from '../../components/lab-settings/practices/PracticeFormModal';
import { IconPlus, IconBuilding, IconPhone, IconMail, IconUsers, IconCheck } from '../../layouts/components/LabIcons';
import styles from './LabPractices.module.css';

const LabPractices = () => {
  const { clinics = [], doctors = [] } = useCrm();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPractice, setSelectedPractice] = useState(null);

  const filteredClinics = useMemo(() => {
    return clinics.filter(clinic => {
      const searchLower = searchTerm.toLowerCase();
      return (
        clinic.name?.toLowerCase().includes(searchLower) ||
        clinic.accountNumber?.toLowerCase().includes(searchLower) ||
        clinic.addresses?.shipping?.city?.toLowerCase().includes(searchLower) ||
        clinic.addresses?.shipping?.state?.toLowerCase().includes(searchLower) ||
        clinic.contacts?.primary?.email?.toLowerCase().includes(searchLower) ||
        clinic.contacts?.primary?.phone?.toLowerCase().includes(searchLower)
      );
    });
  }, [clinics, searchTerm]);

  const handleEdit = (clinic) => {
    setSelectedPractice(clinic);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedPractice(null);
    setIsModalOpen(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <IconBuilding className={styles.titleIcon} />
            <div>
              <h1 className={styles.pageTitle}>Practice Management</h1>
              <p className={styles.pageSubtitle}>Manage clinic profiles, staff, and billing preferences</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <SearchBar 
            placeholder="Search by name, address, or contact..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className={styles.btnPrimary} onClick={handleAddNew}>
          <IconPlus width={16} height={16} />
          <span>Add Practice</span>
        </button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Practice Details</th>
                <th>Location</th>
                <th>Primary Contact</th>
                <th>Financial</th>
                <th>Staff</th>
                <th>Status</th>
                <th className={styles.alignRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClinics.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <IconBuilding className={styles.emptyIcon} />
                      <p className={styles.emptyTitle}>
                        {searchTerm ? 'No practices found' : 'No practices yet'}
                      </p>
                      <p className={styles.emptyText}>
                        {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first practice'}
                      </p>
                      {!searchTerm && (
                        <button className={styles.btnPrimary} onClick={handleAddNew}>
                          <IconPlus width={16} height={16} />
                          <span>Add First Practice</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClinics.map((clinic) => {
                  const staffCount = doctors.filter(d => d.clinicId === clinic.id || d.clinicIds?.includes(clinic.id)).length;
                  const primaryContact = clinic.contacts?.primary;
                  const shippingAddress = clinic.addresses?.shipping;
                  const priceList = clinic.priceListId || clinic.activePriceListId || 'Standard';
                  
                  return (
                    <tr key={clinic.id} className={styles.tableRow}>
                      <td>
                        <div className={styles.practiceCell}>
                          <div className={styles.practiceAvatar}>
                            <IconBuilding width={18} height={18} />
                          </div>
                          <div className={styles.practiceInfo}>
                            <span className={styles.practiceName}>{clinic.name}</span>
                            <span className={styles.practiceAddress}>
                              {clinic.accountNumber || `ACC-${clinic.id?.slice(-4)}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.locationCell}>
                          {shippingAddress ? (
                            <>
                              <span className={styles.locationPrimary}>
                                {shippingAddress.city}, {shippingAddress.state}
                              </span>
                              <span className={styles.locationSecondary}>
                                {shippingAddress.line1}
                                {shippingAddress.suite && `, ${shippingAddress.suite}`}
                              </span>
                            </>
                          ) : (
                            <span className={styles.noData}>No address</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={styles.contactCell}>
                          {primaryContact?.phone && (
                            <div className={styles.contactItem}>
                              <IconPhone width={14} height={14} className={styles.contactIcon} />
                              <span>{primaryContact.phone}</span>
                            </div>
                          )}
                          {primaryContact?.email && (
                            <div className={styles.contactItem}>
                              <IconMail width={14} height={14} className={styles.contactIcon} />
                              <span>{primaryContact.email}</span>
                            </div>
                          )}
                          {!primaryContact?.phone && !primaryContact?.email && (
                            <span className={styles.noData}>No contact info</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={styles.financialCell}>
                          <span className={styles.priceListBadge}>
                            {priceList === 'pl-standard-2025' ? 'Standard' : priceList}
                          </span>
                          <span className={styles.billingCycle}>
                            {clinic.preferences?.billingCycle === 'per-case' ? 'Per Case' : 
                             clinic.preferences?.billingCycle === 'weekly' ? 'Weekly' : 'Monthly'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.staffBadge}>
                          <IconUsers width={14} height={14} />
                          <span>{staffCount}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status${clinic.status || 'Active'}`]}`}>
                          <IconCheck width={14} height={14} />
                          {clinic.status || 'Active'}
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        <button className={styles.btnAction} onClick={() => handleEdit(clinic)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <PracticeFormModal 
          key={selectedPractice?.id || 'new'} 
          isOpen={isModalOpen}
          practice={selectedPractice}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default LabPractices;