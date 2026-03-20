import { FakePaymentScenario, PaymentStatus, RefundStatus, WalletTopupRequestStatus } from '@/types/enums';

export interface PaymentAttemptDto {
  id: number;
  paymentId: number;
  scenario: FakePaymentScenario;
  paymentStatus: PaymentStatus;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
}

export interface RefundDto {
  id: number;
  paymentId: number;
  amount: number;
  currency: string;
  refundStatus: RefundStatus;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  completedAt?: string | Date | null;
}

export interface PaymentTransferInstructionDto {
  bankName: string;
  accountName: string;
  accountNumber: string;
  amount: number;
  currency: string;
  content: string;
  expiresAt: string | Date;
}

export interface PaymentSummaryDto {
  id: number;
  bookingId: number;
  userId: number;
  amount: number;
  currency: string;
  paymentCode?: string;
  paymentStatus: PaymentStatus;
  refundStatus: RefundStatus;
  expiresAt: string | Date;
  completedAt?: string | Date | null;
  refundedAt?: string | Date | null;
  providerTxnId?: string | null;
  reconciledAt?: string | Date | null;
  reconciledBy?: number | null;
  transferInstruction?: PaymentTransferInstructionDto | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
}

export interface PaymentDto extends PaymentSummaryDto {
  attempts?: PaymentAttemptDto[];
  refunds?: RefundDto[];
}

export interface ConfirmPaymentRequest {
  scenario: FakePaymentScenario;
}

export enum ManualReconcileResult {
  CREDITED = 'CREDITED',
  REJECTED_NOT_FOUND = 'REJECTED_NOT_FOUND',
  REJECTED_AMOUNT_MISMATCH = 'REJECTED_AMOUNT_MISMATCH',
  REJECTED_EXPIRED = 'REJECTED_EXPIRED',
  ALREADY_CREDITED = 'ALREADY_CREDITED'
}

export interface ManualReconcilePaymentRequest {
  providerTxnId: string;
  transferContent: string;
  transferredAmount: number;
  transferredAt: string | Date;
}

export interface ManualReconcilePaymentResponse {
  result: ManualReconcileResult;
  payment?: PaymentDto | null;
}

export interface WalletDto {
  userId: number;
  balance: number;
  currency: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface WalletTopupRequestDto {
  id: number;
  userId: number;
  amount: number;
  currency: string;
  transferContent: string;
  providerTxnId: string;
  status: WalletTopupRequestStatus;
  rejectionReason?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
}

export interface CreateWalletTopupRequest {
  amount: number;
  transferContent: string;
  providerTxnId: string;
}

export interface ReviewWalletTopupRequest {
  rejectionReason: string;
}

export interface WalletPayBookingRequest {
  paymentId: number;
}

export interface WalletPayBookingResponse {
  payment: PaymentDto;
  wallet: WalletDto;
}
