/**
 * Guest limits. A signed-out visitor sees past days freely; today and the future are
 * limited (strip after 3 markets, scorers/yellows, event detail, day stats).
 * Day keys are YYYY-MM-DD, so string comparison orders them.
 */
export function isLockedDay(dateKey: string, today: string): boolean {
  return dateKey >= today;
}

/** How many markets a guest sees on a locked card before the lock. */
export const GUEST_FREE_MARKETS = 3;
