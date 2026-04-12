import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute } from '@components/auth/AdminRoute';
import { AdminPaymentReconcilePage } from '@pages/payments/AdminPaymentReconcilePage';
import { server } from '@/test/msw/server';
import { createTestQueryClient, renderWithRoute } from '@/test/utils';
import { setAuthenticatedUser } from '@/test/frontend.fixtures';
import { Role, WalletTopupRequestStatus } from '@/types/enums';

const makeTopupRequest = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  userId: 42,
  amount: 500000,
  currency: 'VND',
  transferContent: 'TOPUP USER 42',
  providerTxnId: 'VCB-001',
  status: WalletTopupRequestStatus.PENDING,
  rejectionReason: null,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: '2099-03-10T07:00:00.000Z',
  updatedAt: '2099-03-10T07:00:00.000Z',
  ...overrides
});

describe('admin wallet topup inbox page', () => {
  beforeEach(() => {
    setAuthenticatedUser({ role: Role.ADMIN });
  });

  it('blocks non-admin users from route /payments/reconcile', async () => {
    setAuthenticatedUser({ role: Role.USER });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/payments/reconcile']}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/payments/reconcile" element={<AdminPaymentReconcilePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Review wallet top-up requests' })).not.toBeInTheDocument();
  });

  it('loads pending wallet topup requests and approves one request', async () => {
    const user = userEvent.setup();
    let topupRequests = [makeTopupRequest({ id: 11, providerTxnId: 'VCB-011' })];

    server.use(
      http.get('/api/v1/wallet/topup-requests', () => HttpResponse.json(topupRequests)),
      http.patch('/api/v1/wallet/topup-requests/:id/approve', ({ params }) => {
        const id = Number(params.id);
        topupRequests = topupRequests.map((request) =>
          request.id === id
            ? {
                ...request,
                status: WalletTopupRequestStatus.APPROVED,
                reviewedBy: 999,
                reviewedAt: '2099-03-10T07:10:00.000Z'
              }
            : request
        );
        return HttpResponse.json(topupRequests.find((request) => request.id === id));
      })
    );

    renderWithRoute(<AdminPaymentReconcilePage />, {
      route: '/payments/reconcile',
      path: '/payments/reconcile'
    });

    expect(await screen.findByText('#11')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Approved')).toBeInTheDocument();
  });

  it(
    'rejects a pending wallet topup request with a required reason',
    async () => {
    const user = userEvent.setup();
    let topupRequests = [makeTopupRequest({ id: 12, providerTxnId: 'VCB-012' })];

    server.use(
      http.get('/api/v1/wallet/topup-requests', () => HttpResponse.json(topupRequests)),
      http.patch('/api/v1/wallet/topup-requests/:id/reject', async ({ params, request }) => {
        const id = Number(params.id);
        const body = (await request.json()) as { rejectionReason?: string };
        topupRequests = topupRequests.map((item) =>
          item.id === id
            ? {
                ...item,
                status: WalletTopupRequestStatus.REJECTED,
                rejectionReason: body.rejectionReason || 'N/A',
                reviewedBy: 999,
                reviewedAt: '2099-03-10T07:12:00.000Z'
              }
            : item
        );

        return HttpResponse.json(topupRequests.find((item) => item.id === id));
      })
    );

    renderWithRoute(<AdminPaymentReconcilePage />, {
      route: '/payments/reconcile',
      path: '/payments/reconcile'
    });

    expect(await screen.findByText('#12')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    await user.type(screen.getByLabelText('Rejection reason'), 'Transfer note has invalid syntax');
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }));

    expect(await screen.findByText('Rejected')).toBeInTheDocument();
    expect(await screen.findByText('Rejection reason: Transfer note has invalid syntax')).toBeInTheDocument();
    },
    10000
  );
});
