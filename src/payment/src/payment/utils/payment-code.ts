export const createPaymentCode = (bookingId: number): string => `TBK-${bookingId}`;

export const extractPaymentCode = (transferContent: string): string | null => {
  if (!transferContent) {
    return null;
  }

  const normalizedContent = transferContent.toUpperCase();
  const matched = normalizedContent.match(/\bTBK-\d+\b/);
  return matched?.[0] || null;
};
