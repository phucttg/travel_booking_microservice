import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { WalletPage } from '@pages/payments/WalletPage';
import { server } from '@/test/msw/server';
import { renderWithRoute } from '@/test/utils';
import { setAuthenticatedUser } from '@/test/frontend.fixtures';
import { WalletTopupRequestStatus } from '@/types/enums';

describe('wallet page', () => {
  beforeEach(() => {
    setAuthenticatedUser();
  });

  it(
    'shows zero wallet balance and creates a topup request',
    async () => {
    const user = userEvent.setup();
    let topupRequests = [] as Array<Record<string, unknown>>;

    server.use(
      http.get('/api/v1/wallet/me', () =>
        HttpResponse.json({
          userId: 42,
          balance: 0,
          currency: 'VND',
          createdAt: null,
          updatedAt: null
        })
      ),
      http.get('/api/v1/wallet/topup-requests/my', () => HttpResponse.json(topupRequests)),
      http.post('/api/v1/wallet/topup-requests', async ({ request }) => {
        const payload = (await request.json()) as {
          amount: number;
          transferContent: string;
          providerTxnId: string;
        };
        const created = {
          id: 1,
          userId: 42,
          amount: payload.amount,
          currency: 'VND',
          transferContent: payload.transferContent,
          providerTxnId: payload.providerTxnId,
          status: WalletTopupRequestStatus.PENDING,
          rejectionReason: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: '2099-03-10T07:00:00.000Z',
          updatedAt: '2099-03-10T07:00:00.000Z'
        };
        topupRequests = [created];
        return HttpResponse.json(created);
      })
    );

    renderWithRoute(<WalletPage />, { route: '/wallet', path: '/wallet' });

    expect(await screen.findByText('0 ₫')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('e.g. 500000'), '500000');
    await user.type(screen.getByLabelText('Bank transaction ID (providerTxnId)'), 'VCB-500');
    await user.type(screen.getByLabelText('Transfer note'), 'TOPUP USER 42');
    await user.click(screen.getByRole('button', { name: 'Submit top-up request' }));

    expect(await screen.findByText('#1')).toBeInTheDocument();
    expect(await screen.findByText('Pending')).toBeInTheDocument();
    },
    10000
  );

  it('shows rejection reason in my topup request history', async () => {
    server.use(
      http.get('/api/v1/wallet/me', () =>
        HttpResponse.json({
          userId: 42,
          balance: 100000,
          currency: 'VND',
          createdAt: '2099-03-10T07:00:00.000Z',
          updatedAt: '2099-03-10T07:00:00.000Z'
        })
      ),
      http.get('/api/v1/wallet/topup-requests/my', () =>
        HttpResponse.json([
          {
            id: 2,
            userId: 42,
            amount: 500000,
            currency: 'VND',
            transferContent: 'TOPUP USER 42',
            providerTxnId: 'VCB-501',
            status: WalletTopupRequestStatus.REJECTED,
            rejectionReason: 'Nội dung chuyển khoản không hợp lệ',
            reviewedBy: 1,
            reviewedAt: '2099-03-10T07:05:00.000Z',
            createdAt: '2099-03-10T07:00:00.000Z',
            updatedAt: '2099-03-10T07:05:00.000Z'
          }
        ])
      )
    );

    renderWithRoute(<WalletPage />, { route: '/wallet', path: '/wallet' });

    expect(await screen.findByText('Nội dung chuyển khoản không hợp lệ')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('shows friendly error when wallet endpoints return invalid payload shapes', async () => {
    server.use(
      http.get('/api/v1/wallet/me', () =>
        HttpResponse.text('<!doctype html><html><body>fallback</body></html>', {
          headers: { 'Content-Type': 'text/html' }
        })
      ),
      http.get('/api/v1/wallet/topup-requests/my', () =>
        HttpResponse.json({
          invalid: true
        })
      )
    );

    renderWithRoute(<WalletPage />, { route: '/wallet', path: '/wallet' });

    expect(await screen.findByText('Unable to load wallet data')).toBeInTheDocument();
    expect(await screen.findByText('My Wallet')).toBeInTheDocument();
    expect(screen.getByText('Pending requests: 0/3')).toBeInTheDocument();
  });
});
