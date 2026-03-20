import {
  WalletDto,
  WalletLedgerEntryDto,
  WalletTopupRequestDto
} from 'building-blocks/contracts/payment.contract';
import { Wallet } from '@/payment/entities/wallet.entity';
import { WalletLedger } from '@/payment/entities/wallet-ledger.entity';
import { WalletTopupRequest } from '@/payment/entities/wallet-topup-request.entity';

export const toWalletDto = (wallet?: Wallet | null, userId?: number): WalletDto => {
  if (!wallet) {
    return new WalletDto({
      userId: Number(userId || 0),
      balance: 0,
      currency: 'VND',
      createdAt: null,
      updatedAt: null
    });
  }

  return new WalletDto({
    userId: wallet.userId,
    balance: Number(wallet.balance || 0),
    currency: wallet.currency || 'VND',
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt
  });
};

export const toWalletTopupRequestDto = (request?: WalletTopupRequest | null): WalletTopupRequestDto | null => {
  if (!request) {
    return null;
  }

  return new WalletTopupRequestDto({
    id: request.id,
    userId: request.userId,
    amount: Number(request.amount || 0),
    currency: request.currency || 'VND',
    transferContent: request.transferContent,
    providerTxnId: request.providerTxnId,
    status: request.status,
    rejectionReason: request.rejectionReason,
    reviewedBy: request.reviewedBy,
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  });
};

export const toWalletLedgerEntryDto = (entry?: WalletLedger | null): WalletLedgerEntryDto | null => {
  if (!entry) {
    return null;
  }

  return new WalletLedgerEntryDto({
    id: entry.id,
    userId: entry.userId,
    type: entry.type,
    amount: Number(entry.amount || 0),
    currency: entry.currency || 'VND',
    balanceBefore: Number(entry.balanceBefore || 0),
    balanceAfter: Number(entry.balanceAfter || 0),
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  });
};
