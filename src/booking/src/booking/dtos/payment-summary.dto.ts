export enum PaymentStatus {
  PENDING = 0,
  PROCESSING = 1,
  SUCCEEDED = 2,
  FAILED = 3,
  EXPIRED = 4
}

export enum RefundStatus {
  NONE = 0,
  PENDING = 1,
  SUCCEEDED = 2,
  FAILED = 3
}

export enum FakePaymentScenario {
  SUCCESS = 'SUCCESS',
  DECLINE = 'DECLINE',
  TIMEOUT = 'TIMEOUT'
}

export class PaymentAttemptDto {
  id: number;
  paymentId: number;
  scenario: FakePaymentScenario;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt?: Date | null;
}

export class RefundDto {
  id: number;
  paymentId: number;
  amount: number;
  currency: string;
  refundStatus: RefundStatus;
  createdAt: Date;
  updatedAt?: Date | null;
  completedAt?: Date | null;
}

export class PaymentSummaryDto {
  id: number;
  bookingId: number;
  userId: number;
  amount: number;
  currency: string;
  paymentCode?: string;
  paymentStatus: PaymentStatus;
  refundStatus: RefundStatus;
  expiresAt: Date;
  completedAt?: Date | null;
  refundedAt?: Date | null;
  providerTxnId?: string | null;
  reconciledAt?: Date | null;
  reconciledBy?: number | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

export class PaymentTransferInstructionDto {
  bankName: string;
  accountName: string;
  accountNumber: string;
  amount: number;
  currency: string;
  content: string;
  expiresAt: Date;
}

export class PaymentDto extends PaymentSummaryDto {
  attempts?: PaymentAttemptDto[];
  refunds?: RefundDto[];
  transferInstruction?: PaymentTransferInstructionDto | null;
}
