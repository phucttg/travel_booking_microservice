import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { UserFormPage } from '@pages/users/UserFormPage';
import { server } from '@/test/msw/server';
import { renderWithRoute } from '@/test/utils';
import { makeUser, setAuthenticatedUser } from '@/test/frontend.fixtures';
import { PassengerType, Role } from '@/types/enums';

const getFormItem = (label: string) => screen.getByText(label).closest('.ant-form-item') as HTMLElement;

const getTextInput = (label: string) => getFormItem(label).querySelector('input') as HTMLInputElement;

describe('user form behavior', () => {
  beforeEach(() => {
    setAuthenticatedUser({ role: Role.ADMIN });
  });

  it('requires password on the create form', async () => {
    const user = userEvent.setup();
    const createPayloads: unknown[] = [];

    server.use(
      http.post('/api/v1/user/create', async ({ request }) => {
        createPayloads.push(await request.json());
        return HttpResponse.json(makeUser());
      })
    );

    renderWithRoute(<UserFormPage />, { route: '/users/create', path: '/users/create' });

    await user.type(getTextInput('Họ tên'), 'Test User');
    await user.type(getTextInput('Email'), 'test@example.com');
    await user.type(getTextInput('Passport'), 'C1234567');
    await user.click(screen.getByRole('button', { name: 'Tạo mới' }));

    expect(await screen.findByText('Mật khẩu tối thiểu 8 ký tự')).toBeInTheDocument();
    expect(createPayloads).toEqual([]);
  });

  it('keeps password optional on edit and submits age/passengerType correctly', async () => {
    const user = userEvent.setup();
    const editedUser = makeUser({
      id: 5,
      email: 'baby@example.com',
      name: 'Baby User',
      age: 5,
      passengerType: PassengerType.BABY,
      role: Role.USER
    });
    const updatePayloads: unknown[] = [];

    server.use(
      http.get('/api/v1/user/get-by-id', () => HttpResponse.json(editedUser)),
      http.put('/api/v1/user/update/:id', async ({ request }) => {
        updatePayloads.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderWithRoute(<UserFormPage />, { route: '/users/5/edit', path: '/users/:id/edit' });

    expect(await screen.findByDisplayValue('baby@example.com')).toBeInTheDocument();
    expect(within(getFormItem('Loại hành khách')).getByText('Baby')).toBeInTheDocument();
    expect(within(getFormItem('Tuổi')).getByRole('spinbutton')).toHaveValue('5');
    expect(getTextInput('Mật khẩu')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(updatePayloads).toEqual([
        {
          name: 'Baby User',
          email: 'baby@example.com',
          role: Role.USER,
          passportNumber: 'B1234567',
          age: 5,
          passengerType: PassengerType.BABY
        }
      ]);
    });

    expect((updatePayloads[0] as Record<string, unknown>).password).toBeUndefined();
  });
});
