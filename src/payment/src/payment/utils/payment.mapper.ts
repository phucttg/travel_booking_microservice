import {
  PaymentDto,
  PaymentSummaryDto,
  PaymentTransferInstructionDto
} from 'building-blocks/contracts/payment.contract';
import { PaymentAttempt } from '@/payment/entities/payment-attempt.entity';
import { PaymentIntent } from '@/payment/entities/payment-intent.entity';
import { Refund } from '@/payment/entities/refund.entity';

const sortByIdDesc = <T extends { id: number }>(values: T[] = []) => [...values].sort((a, b) => b.id - a.id);

const toTransferInstruction = (payment: PaymentIntent): PaymentTransferInstructionDto | null => {
  if (!payment.paymentCode) {
    return null;
  }

  return new PaymentTransferInstructionDto({
    bankName: process.env.PAYMENT_RECEIVER_BANK_NAME || 'Vietcombank',
    accountName: process.env.PAYMENT_RECEIVER_ACCOUNT_NAME || 'Travel Booking Company',
    accountNumber: process.env.PAYMENT_RECEIVER_ACCOUNT_NUMBER || '0000000000',
    amount: payment.amount,
    currency: payment.currency,
    content: payment.paymentCode,
    expiresAt: payment.expiresAt
  });
};

export const toPaymentSummaryDto = (payment?: PaymentIntent | null): PaymentSummaryDto | null => {
  if (!payment) {
    return null;
  }

  return new PaymentSummaryDto({
    id: payment.id,
    bookingId: payment.bookingId,
    userId: payment.userId,
    amount: payment.amount,
    currency: payment.currency,
    paymentCode: payment.paymentCode,
    paymentStatus: payment.paymentStatus,
    refundStatus: payment.refundStatus,
    expiresAt: payment.expiresAt,
    completedAt: payment.completedAt,
    refundedAt: payment.refundedAt,
    providerTxnId: payment.providerTxnId,
    reconciledAt: payment.reconciledAt,
    reconciledBy: payment.reconciledBy,
    transferInstruction: toTransferInstruction(payment),
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  });
};

export const toPaymentDto = (payment?: PaymentIntent | null): PaymentDto | null => {
  if (!payment) {
    return null;
  }

  return new PaymentDto({
    ...toPaymentSummaryDto(payment),
    attempts: sortByIdDesc<PaymentAttempt>(payment.attempts || []).map((attempt) => ({
      id: attempt.id,
      paymentId: attempt.paymentId,
      scenario: attempt.scenario,
      paymentStatus: attempt.paymentStatus,
      createdAt: attempt.createdAt,
      updatedAt: attempt.updatedAt
    })),
    refunds: sortByIdDesc<Refund>(payment.refunds || []).map((refund) => ({
      id: refund.id,
      paymentId: refund.paymentId,
      amount: refund.amount,
      currency: refund.currency,
      refundStatus: refund.refundStatus,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
      completedAt: refund.completedAt
    }))
  });
};
