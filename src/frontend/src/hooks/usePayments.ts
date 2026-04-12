import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { paymentApi } from '@api/payment.api';
import {
  ConfirmPaymentRequest,
  CreateWalletTopupRequest,
  ManualReconcilePaymentRequest,
  ManualReconcileResult,
  ManualReconcilePaymentResponse,
  ReviewWalletTopupRequest,
  WalletDto,
  WalletPayBookingRequest,
  WalletTopupRequestDto
} from '@/types/payment.types';
import { normalizeProblemError } from '@utils/helpers';
import { WalletTopupRequestStatus } from '@/types/enums';

export const paymentKeys = {
  detail: (id: number) => ['payments', 'detail', id] as const,
  byBookingId: (bookingId: number) => ['payments', 'booking', bookingId] as const,
  walletMe: ['wallet', 'me'] as const,
  myTopups: ['wallet', 'topups', 'my'] as const,
  adminTopups: (status?: WalletTopupRequestStatus) => ['wallet', 'topups', 'admin', status || 'ALL'] as const
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createWalletPayloadError = (endpoint: string, expectedShape: string): Error =>
  new Error(`Wallet API ${endpoint} returned invalid payload. Expected ${expectedShape}.`);

const isValidWalletTopupStatus = (value: unknown): value is WalletTopupRequestStatus =>
  value === WalletTopupRequestStatus.PENDING ||
  value === WalletTopupRequestStatus.APPROVED ||
  value === WalletTopupRequestStatus.REJECTED;

const assertWalletPayload = (payload: unknown, endpoint: string): WalletDto => {
  if (!isObjectRecord(payload)) {
    throw createWalletPayloadError(endpoint, 'object');
  }

  if (
    !Number.isFinite(Number(payload.userId)) ||
    !Number.isFinite(Number(payload.balance)) ||
    typeof payload.currency !== 'string'
  ) {
    throw createWalletPayloadError(endpoint, 'wallet object with userId, balance, currency');
  }

  return payload as unknown as WalletDto;
};

const assertTopupRequestsPayload = (
  payload: unknown,
  endpoint: string
): WalletTopupRequestDto[] => {
  if (!Array.isArray(payload)) {
    throw createWalletPayloadError(endpoint, 'array');
  }

  const isValidList = payload.every(
    (item) =>
      isObjectRecord(item) &&
      Number.isFinite(Number(item.id)) &&
      Number.isFinite(Number(item.userId)) &&
      Number.isFinite(Number(item.amount)) &&
      typeof item.currency === 'string' &&
      typeof item.transferContent === 'string' &&
      typeof item.providerTxnId === 'string' &&
      isValidWalletTopupStatus(item.status) &&
      'createdAt' in item
  );

  if (!isValidList) {
    throw createWalletPayloadError(endpoint, 'topup request array');
  }

  return payload as unknown as WalletTopupRequestDto[];
};

export const useGetPaymentById = (
  id: number,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false | ((query: any) => number | false | undefined);
  }
) =>
  useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: async () => {
      const response = await paymentApi.getById(id);
      return response.data;
    },
    enabled: (options?.enabled ?? true) && id > 0,
    refetchInterval: options?.refetchInterval
  });

export const useGetPaymentByBookingId = (bookingId: number, enabled = true) =>
  useQuery({
    queryKey: paymentKeys.byBookingId(bookingId),
    queryFn: async () => {
      const response = await paymentApi.getByBookingId(bookingId);
      return response.data;
    },
    enabled: enabled && bookingId > 0
  });

export const useConfirmPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload, idempotencyKey }: { id: number; payload: ConfirmPaymentRequest; idempotencyKey: string }) => {
      const response = await paymentApi.confirm(id, payload, idempotencyKey);
      return response.data;
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(payment.id) });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Thanh toán thất bại');
    }
  });
};

export const useManualReconcilePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ManualReconcilePaymentRequest) => {
      const response = await paymentApi.reconcileManual(payload);
      return response.data;
    },
    onSuccess: (data: ManualReconcilePaymentResponse) => {
      if (data.result === ManualReconcileResult.CREDITED && data.payment) {
        queryClient.invalidateQueries({ queryKey: paymentKeys.detail(data.payment.id) });
        queryClient.invalidateQueries({ queryKey: paymentKeys.byBookingId(data.payment.bookingId) });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
      }
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Đối soát nạp tiền thất bại');
    }
  });
};

export const useGetWalletMe = (enabled = true) =>
  useQuery({
    queryKey: paymentKeys.walletMe,
    queryFn: async () => {
      const response = await paymentApi.getWalletMe();
      return assertWalletPayload(response.data, '/api/v1/wallet/me');
    },
    enabled
  });

export const useCreateWalletTopupRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateWalletTopupRequest) => {
      const response = await paymentApi.createTopupRequest(payload);
      return response.data;
    },
    onSuccess: () => {
      message.success('Top-up request submitted');
      queryClient.invalidateQueries({ queryKey: paymentKeys.myTopups });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Failed to submit top-up request');
    }
  });
};

export const useGetMyWalletTopupRequests = (enabled = true) =>
  useQuery({
    queryKey: paymentKeys.myTopups,
    queryFn: async () => {
      const response = await paymentApi.getMyTopupRequests();
      return assertTopupRequestsPayload(response.data, '/api/v1/wallet/topup-requests/my');
    },
    enabled
  });

export const useGetAdminWalletTopupRequests = (status?: WalletTopupRequestStatus, enabled = true) =>
  useQuery({
    queryKey: paymentKeys.adminTopups(status),
    queryFn: async () => {
      const response = await paymentApi.getTopupRequests(status);
      return assertTopupRequestsPayload(response.data, '/api/v1/wallet/topup-requests');
    },
    enabled
  });

export const useApproveWalletTopupRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (topupRequestId: number) => {
      const response = await paymentApi.approveTopupRequest(topupRequestId);
      return response.data;
    },
    onSuccess: () => {
      message.success('Wallet top-up request approved');
      queryClient.invalidateQueries({ queryKey: ['wallet', 'topups', 'admin'] });
      queryClient.invalidateQueries({ queryKey: paymentKeys.myTopups });
      queryClient.invalidateQueries({ queryKey: paymentKeys.walletMe });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Failed to approve the top-up request');
    }
  });
};

export const useRejectWalletTopupRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: ReviewWalletTopupRequest }) => {
      const response = await paymentApi.rejectTopupRequest(id, payload);
      return response.data;
    },
    onSuccess: () => {
      message.success('Wallet top-up request rejected');
      queryClient.invalidateQueries({ queryKey: ['wallet', 'topups', 'admin'] });
      queryClient.invalidateQueries({ queryKey: paymentKeys.myTopups });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Failed to reject the top-up request');
    }
  });
};

export const usePayBookingWithWallet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: WalletPayBookingRequest) => {
      const response = await paymentApi.payBookingWithWallet(payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(data.payment.id) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.byBookingId(data.payment.bookingId) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.walletMe });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Thanh toán ví thất bại');
    }
  });
};
