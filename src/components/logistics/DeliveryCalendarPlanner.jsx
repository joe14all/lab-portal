import React, { useState, useMemo } from 'react';
import { useLab } from '../../contexts';
import { MockService } from '../../_mock/service';
import styles from './DeliveryCalendarPlanner.module.css';

const DeliveryCalendarPlanner = ({ onClose, onScheduled }) => {
  const { cases } = useLab();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCases, setSelectedCases] = useState([]);
  const [viewMonth, setViewMonth] = useState(new Date());

  // Get cases that are ready to ship
  const readyToShipCases = useMemo(() => {
    return cases?.filter(c => c.status === 'stage-shipping') || [];
  }, [cases]);

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
        isPast: date < new Date(new Date().setHours(0, 0, 0, 0))
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

      onScheduled?.();
      alert(`Successfully scheduled ${selectedCases.length} cases for delivery on ${selectedDate}`);
      setSelectedCases([]);
      setSelectedDate('');
    } catch (error) {
      console.error('Failed to schedule deliveries:', error);
      alert('Failed to schedule deliveries');
    }
  };

  const changeMonth = (direction) => {
    setViewMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const monthName = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h2>Delivery Calendar Planner</h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        <div className={styles.body}>
          {/* Calendar */}
          <div className={styles.calendarSection}>
            <div className={styles.calendarHeader}>
              <button onClick={() => changeMonth(-1)} className={styles.navBtn}>‹</button>
              <h3>{monthName}</h3>
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
                      ${day?.date === selectedDate ? styles.selected : ''}
                    `}
                    onClick={() => day && !day.isPast && handleDateSelect(day.date)}
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
          </div>

          {/* Cases List */}
          <div className={styles.casesSection}>
            <h3>Ready to Ship Cases ({readyToShipCases.length})</h3>
            <div className={styles.casesList}>
              {readyToShipCases.length === 0 ? (
                <p className={styles.emptyMessage}>No cases ready to ship</p>
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
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.selectionInfo}>
            {selectedDate && <span>📅 {selectedDate}</span>}
            {selectedCases.length > 0 && <span>✓ {selectedCases.length} cases selected</span>}
          </div>
          <div className={styles.actions}>
            <button onClick={onClose} className={styles.btnSecondary}>Cancel</button>
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

export default DeliveryCalendarPlanner;
