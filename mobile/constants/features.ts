/**
 * Yellow cards ("gialli") are in beta: the model is still training and the BFF route
 * GET /api/v1/events/{id}/bookings does not exist yet. While this is false the cards and the
 * event detail show the "In arrivo" state and make no request. Set EXPO_PUBLIC_BOOKINGS_API=1
 * (or flip the default) once the route is live.
 */
export const BOOKINGS_API_READY = process.env.EXPO_PUBLIC_BOOKINGS_API === '1';
