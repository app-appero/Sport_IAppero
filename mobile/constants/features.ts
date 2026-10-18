/**
 * Yellow cards ("gialli"): the BFF route GET /api/v1/events/{id}/bookings is live, so the cards and the
 * event detail load the real data. Set EXPO_PUBLIC_BOOKINGS_API=0 to switch the feature off again (the
 * yellow column is hidden and the app makes no request).
 */
export const BOOKINGS_API_READY = process.env.EXPO_PUBLIC_BOOKINGS_API !== '0';
