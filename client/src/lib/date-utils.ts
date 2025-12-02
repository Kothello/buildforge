/**
 * Calculate the number of full days between a date and now
 * @param date - The date to calculate from (string or Date)
 * @returns Number of full days, or null if date is invalid
 */
export function getDayDiff(date?: string | Date | null): number | null {
  if (!date) return null;
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffMs = today.getTime() - targetDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
