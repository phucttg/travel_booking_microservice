export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'SkyBooking - Vietnam Domestic Flights';

export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 60000;

export const PAGINATION_DEFAULT = {
  page: 1,
  pageSize: 10,
  order: 'ASC' as const,
  orderBy: 'id'
};

export const QUERY_STALE_TIME_MS = 5 * 60 * 1000;
