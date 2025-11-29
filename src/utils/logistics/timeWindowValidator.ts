/**
 * Time Window Validation Utilities
 * 
 * Validates pickup/delivery time windows against clinic operating hours
 * Based on LOGISTICS_DOMAIN_ANALYSIS.MD Section 3.4.1
 */

import type { TimeWindow, OperatingHours } from '../../types/logistics';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  suggestion?: string;
}

/**
 * Validate that a time window falls within clinic operating hours
 */
export function validateTimeWindow(
  windowStart: string,
  windowEnd: string,
  operatingHours: OperatingHours
): ValidationResult {
  const start = new Date(windowStart);
  const end = new Date(windowEnd);

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = start.getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[dayOfWeek];

  const hoursForDay = operatingHours.schedule[dayName];

  if (!hoursForDay || hoursForDay.length === 0) {
    return {
      valid: false,
      reason: `Clinic closed on ${dayName}`,
    };
  }

  // Extract time components
  const startHour = start.getHours();
  const startMin = start.getMinutes();
  const endHour = end.getHours();
  const endMin = end.getMinutes();

  // Check each operating hour range for the day
  for (const range of hoursForDay) {
    const [openTime, closeTime] = range.split('-');
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    if (startMinutes >= openMinutes && endMinutes <= closeMinutes) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    reason: `Window ${formatTime(startHour, startMin)}-${formatTime(endHour, endMin)} outside operating hours`,
    suggestion: hoursForDay[0], // Suggest first available slot
  };
}

/**
 * Check if two time windows overlap
 */
export function doTimeWindowsOverlap(window1: TimeWindow, window2: TimeWindow): boolean {
  const start1 = new Date(window1.start);
  const end1 = new Date(window1.end);
  const start2 = new Date(window2.start);
  const end2 = new Date(window2.end);

  return start1 < end2 && start2 < end1;
}

/**
 * Get all time windows for a given date that fall within operating hours
 */
export function getAvailableTimeWindows(
  date: Date,
  operatingHours: OperatingHours,
  windowDurationMin: number = 120 // 2-hour default windows
): TimeWindow[] {
  const dayOfWeek = date.getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[dayOfWeek];

  const hoursForDay = operatingHours.schedule[dayName];
  if (!hoursForDay || hoursForDay.length === 0) {
    return [];
  }

  const windows: TimeWindow[] = [];

  for (const range of hoursForDay) {
    const [openTime, closeTime] = range.split('-');
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);

    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    // Generate windows within this range
    let currentMinutes = openMinutes;
    while (currentMinutes + windowDurationMin <= closeMinutes) {
      const startDate = new Date(date);
      startDate.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + windowDurationMin);

      windows.push({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      currentMinutes += windowDurationMin;
    }
  }

  return windows;
}

/**
 * Check if a given time falls within operating hours
 */
export function isWithinOperatingHours(
  timestamp: string,
  operatingHours: OperatingHours
): boolean {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[dayOfWeek];

  const hoursForDay = operatingHours.schedule[dayName];
  if (!hoursForDay || hoursForDay.length === 0) {
    return false;
  }

  const hour = date.getHours();
  const min = date.getMinutes();
  const totalMinutes = hour * 60 + min;

  for (const range of hoursForDay) {
    const [openTime, closeTime] = range.split('-');
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);

    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    if (totalMinutes >= openMinutes && totalMinutes <= closeMinutes) {
      return true;
    }
  }

  return false;
}

/**
 * Format time for display
 */
function formatTime(hour: number, min: number): string {
  const h = hour.toString().padStart(2, '0');
  const m = min.toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Calculate the duration of a time window in minutes
 */
export function getTimeWindowDuration(window: TimeWindow): number {
  const start = new Date(window.start);
  const end = new Date(window.end);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Check if a time window is in the past
 */
export function isTimeWindowExpired(window: TimeWindow): boolean {
  const now = new Date();
  const end = new Date(window.end);
  return end < now;
}

/**
 * Get the next available time window for a given clinic
 */
export function getNextAvailableWindow(
  operatingHours: OperatingHours,
  windowDurationMin: number = 120,
  daysAhead: number = 7
): TimeWindow | null {
  const now = new Date();
  
  for (let i = 0; i < daysAhead; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + i);
    checkDate.setHours(0, 0, 0, 0);

    const windows = getAvailableTimeWindows(checkDate, operatingHours, windowDurationMin);
    
    for (const window of windows) {
      if (!isTimeWindowExpired(window)) {
        return window;
      }
    }
  }

  return null;
}
