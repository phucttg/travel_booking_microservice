import apiClient from '@api/axios-instance';
import {
  ConfirmPaymentRequest,
  CreateWalletTopupRequest,
  ManualReconcilePaymentRequest,
  ManualReconcilePaymentResponse,
  PaymentDto,
  ReviewWalletTopupRequest,
  WalletDto,
  WalletPayBookingRequest,
  WalletPayBookingResponse,
  WalletTopupRequestDto
} from '@/types/payment.types';
import { WalletTopupRequestStatus } from '@/types/enums';

export const paymentApi = {
  getById: (id: number) => apiClient.get<PaymentDto>('/api/v1/payment/get-by-id', { params: { id } }),
  getByBookingId: (bookingId: number) =>
    apiClient.get<PaymentDto>('/api/v1/payment/get-by-booking-id', { params: { bookingId } }),
  confirm: (id: number, data: ConfirmPaymentRequest, idempotencyKey: string) =>
    apiClient.patch<PaymentDto>(`/api/v1/payment/confirm/${id}`, data, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    }),
  reconcileManual: (data: ManualReconcilePaymentRequest) =>
    apiClient.post<ManualReconcilePaymentResponse>('/api/v1/payment/reconcile-manual', data),
  getWalletMe: () => apiClient.get<WalletDto>('/api/v1/wallet/me'),
  createTopupRequest: (data: CreateWalletTopupRequest) =>
    apiClient.post<WalletTopupRequestDto>('/api/v1/wallet/topup-requests', data),
  getMyTopupRequests: () => apiClient.get<WalletTopupRequestDto[]>('/api/v1/wallet/topup-requests/my'),
  getTopupRequests: (status?: WalletTopupRequestStatus) =>
    apiClient.get<WalletTopupRequestDto[]>('/api/v1/wallet/topup-requests', {
      params: status ? { status } : undefined
    }),
  approveTopupRequest: (id: number) =>
    apiClient.patch<WalletTopupRequestDto>(`/api/v1/wallet/topup-requests/${id}/approve`),
  rejectTopupRequest: (id: number, data: ReviewWalletTopupRequest) =>
    apiClient.patch<WalletTopupRequestDto>(`/api/v1/wallet/topup-requests/${id}/reject`, data),
  payBookingWithWallet: (data: WalletPayBookingRequest) =>
    apiClient.post<WalletPayBookingResponse>('/api/v1/wallet/pay-booking', data)
};
