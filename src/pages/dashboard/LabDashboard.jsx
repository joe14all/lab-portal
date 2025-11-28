import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLab, useFinance, useLogistics, useAuth } from '../../contexts';
import { 
  IconCase, 
  IconInvoice, 
  IconTruck, 
  IconMicroscope, 
  IconClock, 
  IconAlert,
  IconCheck,
  IconDrill,
  IconUser
} from '../../layouts/components/LabIcons';
import styles from './LabDashboard.module.css';

const LabDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cases, batches, loading: labLoading } = useLab();
  const { invoices, loading: finLoading } = useFinance();
  const { pickups, loading: logLoading } = useLogistics();

  const loading = labLoading || finLoading || logLoading;

  // --- KPI CALCULATIONS ---
  const stats = useMemo(() => {
    if (loading) return {};

    // 1. Active Cases
    const activeCases = cases.filter(c => 
      c.status !== 'stage-shipped' && 
      c.status !== 'stage-delivered' && 
      c.status !== 'stage-cancelled'
    );

    // 2. Revenue (This Month)
    const currentMonth = new Date().getMonth();
    const monthlyRevenue = invoices
      .filter(inv => new Date(inv.issueDate).getMonth() === currentMonth)
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    // 3. Production Load (Active Batches)
    const activeBatches = batches.filter(b => b.status === 'InProgress');

    // 4. Pending Pickups
    const pendingPickups = pickups.filter(p => p.status === 'Pending');

    return {
      activeCasesCount: activeCases.length,
      monthlyRevenue,
      activeBatchesCount: activeBatches.length,
      pendingPickupsCount: pendingPickups.length
    };
  }, [cases, invoices, batches, pickups, loading]);

  // --- "DUE SOON" LIST ---
  const urgentCases = useMemo(() => {
    if (!cases) return [];
    
    const today = new Date();
    const threeDaysOut = new Date();
    threeDaysOut.setDate(today.getDate() + 3);

    return cases
      .filter(c => {
        const due = new Date(c.dates.due);
        return due >= today && due <= threeDaysOut && c.status !== 'stage-shipped';
      })
      .sort((a, b) => new Date(a.dates.due) - new Date(b.dates.due))
      .slice(0, 5); // Top 5
  }, [cases]);

  // --- RECENT ACTIVITY (Mocked from Context Data) ---
  const recentActivity = useMemo(() => {
    // In a real app, this would come from the auditLogs or a dedicated feed endpoint
    // Here we simulate it by combining recent cases and pickups
    const newCases = cases.slice(0, 2).map(c => ({
      id: `act-${c.id}`,
      type: 'case',
      message: `New Case #${c.caseNumber} received from ${c.doctorName}`,
      time: c.dates.received
    }));

    const newPickups = pickups.slice(0, 2).map(p => ({
      id: `act-${p.id}`,
      type: 'pickup',
      message: `Pickup requested by ${p.clinicId}`,
      time: p.requestTime
    }));

    return [...newCases, ...newPickups].sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [cases, pickups]);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;
  }

  // --- HELPER: FORMAT CURRENCY ---
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className={styles.container}>
      
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.welcome}>
          <h1>Welcome back, {user?.profile?.firstName || 'User'}</h1>
          <p>Here's what's happening in the lab today.</p>
        </div>
        <div className={styles.dateBadge}>
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className={styles.statsGrid}>
        
        {/* Cases */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            Active Cases <IconCase width="20" className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>{stats.activeCasesCount}</div>
          <div className={styles.statTrend}>
            <span className={styles.trendNeutral}>In workflow</span>
          </div>
        </div>

        {/* Revenue */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            Revenue (MTD) <IconInvoice width="20" className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>{formatMoney(stats.monthlyRevenue)}</div>
          <div className={styles.statTrend}>
            <span className={styles.trendUp}>+12%</span> vs last month
          </div>
        </div>

        {/* Production */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            Production <IconMicroscope width="20" className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>{stats.activeBatchesCount}</div>
          <div className={styles.statTrend}>
            <span className={styles.trendNeutral}>Batches running</span>
          </div>
        </div>

        {/* Logistics */}
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            Logistics <IconTruck width="20" className={styles.statIcon} />
          </div>
          <div className={styles.statValue}>{stats.pendingPickupsCount}</div>
          <div className={`${styles.statTrend} ${stats.pendingPickupsCount > 0 ? styles.trendDown : styles.trendNeutral}`}>
            Pending Pickups
          </div>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className={styles.mainGrid}>
        
        {/* LEFT COL: URGENT WORK */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <IconAlert width="18" style={{ color: 'var(--warning-500)' }} /> 
              Due Soon (Next 3 Days)
            </h3>
            <Link to="/cases" className={styles.viewAllBtn}>View All Cases</Link>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Case #</th>
                  <th>Patient / Doctor</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {urgentCases.length > 0 ? (
                  urgentCases.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.caseNumber}</td>
                      <td className={styles.patientCell}>
                        <strong>{c.patient.name}</strong>
                        <span>{c.doctorName}</span>
                      </td>
                      <td>
                        <span className={styles.statusBadge} style={{ backgroundColor: 'var(--neutral-100)', color: 'var(--neutral-700)' }}>
                          {c.status.replace('stage-', '')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--error-500)', fontWeight: 600 }}>
                        {new Date(c.dates.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No urgent cases due shortly. Good job!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COL: ACTIVITY & ACTIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Quick Actions */}
          <div className={styles.sectionCard} style={{ flex: 0 }}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Quick Actions</h3>
            </div>
            <div className={styles.actionGrid}>
              <button className={styles.quickBtn} onClick={() => navigate('/cases')}>
                <IconCase width="24" />
                <span>New Case</span>
              </button>
              <button className={styles.quickBtn} onClick={() => navigate('/production')}>
                <IconDrill width="24" />
                <span>Production</span>
              </button>
              <button className={styles.quickBtn} onClick={() => navigate('/logistics')}>
                <IconTruck width="24" />
                <span>Logistics</span>
              </button>
              <button className={styles.quickBtn} onClick={() => navigate('/finance')}>
                <IconInvoice width="24" />
                <span>Invoices</span>
              </button>
            </div>
          </div>

          {/* Recent Feed */}
          <div className={styles.sectionCard} style={{ flex: 1 }}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <IconClock width="18" /> Recent Activity
              </h3>
            </div>
            <ul className={styles.feedList}>
              {recentActivity.map(act => (
                <li key={act.id} className={styles.feedItem}>
                  <div className={styles.feedIcon}>
                    {act.type === 'case' ? <IconCase width="16" /> : <IconTruck width="16" />}
                  </div>
                  <div className={styles.feedContent}>
                    <p>{act.message}</p>
                    <span className={styles.feedTime}>
                      {new Date(act.time).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
              {recentActivity.length === 0 && (
                <li style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No recent activity found.
                </li>
              )}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LabDashboard;