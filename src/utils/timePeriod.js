/**
 * Shift Time Period Utility
 *
 * Maps a given Date to one of four named time periods based on local hour.
 *
 * Periods:
 *   Morning   → 00:00 – 11:59
 *   Afternoon → 12:00 – 16:59
 *   Evening   → 17:00 – 19:59
 *   Night     → 20:00 – 23:59
 */

export const TIME_PERIODS = {
  MORNING: { id: "morning", label: "Morning" },
  AFTERNOON: { id: "afternoon", label: "Afternoon" },
  EVENING: { id: "evening", label: "Evening" },
  NIGHT: { id: "night", label: "Night" },
};

/**
 * Returns the time period object for a given Date instance.
 * Uses local (server) time hours.
 *
 * @param {Date} date
 * @returns {{ id: string, label: string }}
 */
export const getTimePeriod = (date) => {
  const hour = date.getHours();

  if (hour < 12) return TIME_PERIODS.MORNING;
  if (hour < 17) return TIME_PERIODS.AFTERNOON;
  if (hour < 20) return TIME_PERIODS.EVENING;
  return TIME_PERIODS.NIGHT;
};

/**
 * Capitalises the first letter of a period id string back to its label.
 * e.g. "morning" → "Morning"
 *
 * @param {string} periodId
 * @returns {string}
 */
export const periodIdToLabel = (periodId) => {
  if (!periodId) return "";
  return periodId.charAt(0).toUpperCase() + periodId.slice(1).toLowerCase();
};
