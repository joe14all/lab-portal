import React, { useState, useMemo } from 'react';
import { useLab } from '../../contexts';
import { MockService } from '../../_mock/service';
import styles from './DeliveryScheduler.module.css';

const DeliveryScheduler = () => {
  const { cases } = useLab();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCases, setSelectedCases] = useState([]);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [filterClinic, setFilterClinic] = useState('');

  // Get cases that are ready to ship
  const readyToShipCases = useMemo(() => {
    const filtered = cases?.filter(c => c.status === 'stage-shipping') || [];
    if (filterClinic) {
      return filtered.filter(c => c.clinicId === filterClinic);
    }
    return filtered;
  }, [cases, filterClinic]);

  // Get unique clinics from ready cases
  const clinics = useMemo(() => {
    const clinicIds = new Set(readyToShipCases.map(c => c.clinicId));
    return Array.from(clinicIds).sort();
  }, [readyToShipCases]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const scheduledCases = cases?.filter(c => 
        c.dates?.scheduledDelivery === dateStr
      ) || [];
      
      days.push({
        day,
        date: dateStr,
        dateObj: date,
        scheduledCases: scheduledCases.length,
        casesDetails: scheduledCases,
        isPast: date < new Date(new Date().setHours(0, 0, 0, 0)),
        isToday: dateStr === new Date().toISOString().split('T')[0]
      });
    }
    
    return days;
  }, [viewMonth, cases]);

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
  };

  const handleCaseToggle = (caseId) => {
    setSelectedCases(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  const handleScheduleDelivery = async () => {
    if (!selectedDate || selectedCases.length === 0) {
      alert('Please select a date and at least one case');
      return;
    }

    try {
      // Update all selected cases with scheduled delivery date
      for (const caseId of selectedCases) {
        const caseData = cases.find(c => c.id === caseId);
        await MockService.cases.cases.update(caseId, {
          dates: {
            ...caseData.dates,
            scheduledDelivery: selectedDate
          }
        });
      }

      alert(`Successfully scheduled ${selectedCases.length} cases for delivery on ${selectedDate}`);
      setSelectedCases([]);
      setSelectedDate('');
      window.location.reload(); // Refresh to show updates
    } catch (error) {
      console.error('Failed to schedule deliveries:', error);
      alert('Failed to schedule deliveries');
    }
  };

  const handleUnschedule = async (caseId) => {
    if (!confirm('Remove scheduled delivery date for this case?')) return;

    try {
      const caseData = cases.find(c => c.id === caseId);
      await MockService.cases.cases.update(caseId, {
        dates: {
          ...caseData.dates,
          scheduledDelivery: null
        }
      });
      alert('Delivery date removed');
      window.location.reload();
    } catch (error) {
      console.error('Failed to unschedule:', error);
      alert('Failed to unschedule delivery');
    }
  };

  const changeMonth = (direction) => {
    setViewMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setViewMonth(new Date());
  };

  const monthName = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get cases for selected date
  const selectedDateCases = selectedDate 
    ? cases?.filter(c => c.dates?.scheduledDelivery === selectedDate) || []
    : [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Delivery Scheduler</h1>
          <p className={styles.subtitle}>Schedule delivery dates for ready-to-ship cases</p>
        </div>
        <button onClick={goToToday} className={styles.todayBtn}>
          Today
        </button>
      </div>

      <div className={styles.content}>
        {/* Calendar Section */}
        <div className={styles.calendarSection}>
          <div className={styles.calendarHeader}>
            <button onClick={() => changeMonth(-1)} className={styles.navBtn}>‹</button>
            <h2>{monthName}</h2>
            <button onClick={() => changeMonth(1)} className={styles.navBtn}>›</button>
          </div>

          <div className={styles.calendar}>
            <div className={styles.weekDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className={styles.weekDay}>{day}</div>
              ))}
            </div>
            <div className={styles.days}>
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`
                    ${styles.day} 
                    ${!day ? styles.empty : ''}
                    ${day?.isPast ? styles.past : ''}
                    ${day?.isToday ? styles.today : ''}
                    ${day?.date === selectedDate ? styles.selected : ''}
                    ${day?.scheduledCases > 0 ? styles.hasScheduled : ''}
                  `}
                  onClick={() => day && !day.isPast && handleDateSelect(day.date)}
                  title={day?.scheduledCases > 0 ? `${day.scheduledCases} cases scheduled` : ''}
                >
                  {day && (
                    <>
                      <span className={styles.dayNumber}>{day.day}</span>
                      {day.scheduledCases > 0 && (
                        <span className={styles.badge}>{day.scheduledCases}</span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Date Details */}
          {selectedDate && selectedDateCases.length > 0 && (
            <div className={styles.dateDetails}>
              <h3>Scheduled for {selectedDate} ({selectedDateCases.length})</h3>
              <div className={styles.scheduledList}>
                {selectedDateCases.map(c => (
                  <div key={c.id} className={styles.scheduledCase}>
                    <div>
                      <span className={styles.caseNumber}>#{c.caseNumber}</span>
                      <span className={styles.patientName}>{c.patient?.name}</span>
                      <span className={styles.clinicId}>{c.clinicId}</span>
                    </div>
                    <button 
                      onClick={() => handleUnschedule(c.id)}
                      className={styles.unscheduleBtn}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cases List Section */}
        <div className={styles.casesSection}>
          <div className={styles.casesSectionHeader}>
            <h3>Ready to Ship ({readyToShipCases.length})</h3>
            <select 
              value={filterClinic} 
              onChange={(e) => setFilterClinic(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All Clinics</option>
              {clinics.map(clinicId => (
                <option key={clinicId} value={clinicId}>{clinicId}</option>
              ))}
            </select>
          </div>

          <div className={styles.casesList}>
            {readyToShipCases.length === 0 ? (
              <p className={styles.emptyMessage}>
                {filterClinic ? 'No cases for this clinic' : 'No cases ready to ship'}
              </p>
            ) : (
              readyToShipCases.map(c => (
                <label key={c.id} className={styles.caseItem}>
                  <input
                    type="checkbox"
                    checked={selectedCases.includes(c.id)}
                    onChange={() => handleCaseToggle(c.id)}
                  />
                  <div className={styles.caseInfo}>
                    <span className={styles.caseNumber}>#{c.caseNumber}</span>
                    <span className={styles.patientName}>{c.patient?.name}</span>
                    <span className={styles.clinicId}>{c.clinicId}</span>
                    {c.dates?.scheduledDelivery && (
                      <span className={styles.scheduled}>
                        📅 {c.dates.scheduledDelivery}
                      </span>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>

          <div className={styles.actionsFooter}>
            <div className={styles.selectionInfo}>
              {selectedDate && <span>📅 {selectedDate}</span>}
              {selectedCases.length > 0 && <span>✓ {selectedCases.length} selected</span>}
            </div>
            <button 
              onClick={handleScheduleDelivery} 
              className={styles.btnPrimary}
              disabled={!selectedDate || selectedCases.length === 0}
            >
              Schedule Delivery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryScheduler;
