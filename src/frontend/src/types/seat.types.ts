import { SeatClass, SeatType } from '@/types/enums';

export interface SeatDto {
  id: number;
  seatNumber: string;
  seatClass: SeatClass;
  seatType: SeatType;
  flightId: number;
  price: number;
  currency: string;
  isReserved: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface CreateSeatRequest {
  seatNumber: string;
  seatClass: SeatClass;
  seatType: SeatType;
  flightId: number;
}

export interface ReserveSeatRequest {
  seatNumber?: string;
  flightId: number;
}

export type SeatInventoryReconcileStatus = 'FIXED' | 'SKIPPED' | 'FAILED';

export interface ReconcileSeatInventoryItem {
  flightId: number;
  flightNumber: string;
  aircraftId: number;
  aircraftModel: string;
  expectedCount: number;
  beforeCount: number;
  createdCount: number;
  afterCount: number;
  missingCount: number;
  status: SeatInventoryReconcileStatus;
  message?: string;
}

export interface ReconcileSeatInventoryResponse {
  processed: number;
  fixed: number;
  skipped: number;
  failed: number;
  result: ReconcileSeatInventoryItem[];
}

export interface ReconcileSeatInventoryRequest {
  flightId?: number;
}
