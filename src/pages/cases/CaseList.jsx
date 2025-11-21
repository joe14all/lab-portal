import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLab, useCrm } from '../../contexts';
import SearchBar from '../../components/common/SearchBar';
import { 
  IconChevronRight, 
  IconBox 
} from '../../layouts/components/LabIcons';
import styles from './CaseList.module.css';

const CaseList = () => {
  const navigate = useNavigate();
  const { cases, stages, loading: labLoading } = useLab();
  const { doctors, clinics, loading: crmLoading } = useCrm();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const isLoading = labLoading || crmLoading;

  const filteredCases = useMemo(() => {
    if (!cases) return [];
    const enriched = cases.map(c => {
      const doc = doctors.find(d => d.id === c.doctorId);
      const clinic = clinics.find(cl => cl.id === c.clinicId);
      const stage = stages.find(s => s.id === c.status);
      return {
        ...c,
        doctorName: doc ? `${doc.firstName} ${doc.lastName}` : 'Unknown Doctor',
        clinicName: clinic ? clinic.name : 'Unknown Clinic',
        stageLabel: stage ? stage.label : c.status,
        stageColor: stage ? stage.color : 'gray'
      };
    });

    return enriched.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        item.caseNumber.toLowerCase().includes(searchLower) ||
        item.patient.name.toLowerCase().includes(searchLower) ||
        item.doctorName.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cases, doctors, clinics, stages, searchQuery, statusFilter]);

  const handleRowClick = (caseId) => {
    navigate(`/cases/${caseId}`);
  };

  if (isLoading) {
    return <div className={styles.pageContainer}><div className={styles.header}><h1>Loading...</h1></div></div>;
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Case Management</h1>
          <p className={styles.subtitle}>
            {filteredCases.length} {filteredCases.length === 1 ? 'case' : 'cases'} found
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className="button primary">+ New Case</button>
        </div>
      </header>

      {/* FILTER BAR */}
      <section className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          {/* Reusable Search Component */}
          <SearchBar 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by case #, patient, or doctor..."
          />
        </div>

        <div className={styles.filterGroup}>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="All">All Statuses</option>
            {stages.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* TABLE */}
      <div className={styles.tableCard}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Patient</th>
                <th>Doctor / Clinic</th>
                <th>Received</th>
                <th>Due Date</th>
                <th>Stage</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.length > 0 ? (
                filteredCases.map(c => (
                  <tr key={c.id} className={styles.tableRow} onClick={() => handleRowClick(c.id)}>
                    <td className={styles.caseId}>{c.caseNumber}</td>
                    <td>
                      <span className={styles.patientName}>{c.patient.name}</span>
                      <span className={styles.patientMeta}>
                        {c.items?.length || 0} Units • {c.items?.[0]?.type || 'Restoration'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{c.doctorName}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.clinicName}</span>
                      </div>
                    </td>
                    <td className={styles.dateText}>{new Date(c.dates.received).toLocaleDateString()}</td>
                    <td className={styles.dateText}>{c.dates.due ? new Date(c.dates.due).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[c.stageColor] || ''}`}>{c.stageLabel}</span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      <IconChevronRight width="18" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className={styles.emptyState}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <IconBox width="48" height="48" style={{ opacity: 0.2 }} />
                      <span>No cases match your filters.</span>
                      <button className="button secondary" onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}>Clear Filters</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CaseList;