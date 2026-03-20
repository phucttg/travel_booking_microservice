import { createHash } from 'crypto';

export const createRequestHash = (payload: unknown): string =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex');
