const VIETNAM_TIMEZONE_OFFSET_MINUTES = 7 * 60;
const VIETNAM_TIMEZONE_OFFSET_MS = VIETNAM_TIMEZONE_OFFSET_MINUTES * 60 * 1000;

export const deriveFlightDateFromDeparture = (departureDate: Date): Date => {
  // Business day is aligned to Asia/Ho_Chi_Minh (UTC+7).
  const shiftedToBusinessTimezone = new Date(departureDate.getTime() + VIETNAM_TIMEZONE_OFFSET_MS);

  const year = shiftedToBusinessTimezone.getUTCFullYear();
  const month = shiftedToBusinessTimezone.getUTCMonth();
  const day = shiftedToBusinessTimezone.getUTCDate();

  const businessMidnightInUtc = Date.UTC(year, month, day) - VIETNAM_TIMEZONE_OFFSET_MS;

  return new Date(businessMidnightInUtc);
};
