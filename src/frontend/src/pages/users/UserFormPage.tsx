import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, Input, InputNumber, Select, Space } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FormActionsBar } from '@components/common/FormActionsBar';
import { FormSection } from '@components/common/FormSection';
import { PageHeader } from '@components/common/PageHeader';
import { SectionCard } from '@components/common/SectionCard';
import { useCreateUser, useGetUserById, useUpdateUser } from '@hooks/useUsers';
import { CreateUserRequest, UpdateUserRequest } from '@/types/user.types';
import { PassengerType, Role } from '@/types/enums';
import { parseRouteId } from '@utils/helpers';
import { createUserFormSchema, updateUserFormSchema } from '@utils/validation';

type UserFormValues = Omit<CreateUserRequest, 'password'> & {
  password?: string;
};

export const UserFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const userId = parseRouteId(id);
  const isEdit = location.pathname.endsWith('/edit');

  const userQuery = useGetUserById(userId);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const schema = useMemo(() => (isEdit ? updateUserFormSchema : createUserFormSchema), [isEdit]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: Role.USER,
      passportNumber: '',
      age: 18,
      passengerType: PassengerType.UNKNOWN
    }
  });

  useEffect(() => {
    if (!isEdit || !userQuery.data) return;

    reset({
      name: userQuery.data.name,
      email: userQuery.data.email,
      password: '',
      role: userQuery.data.role,
      passportNumber: userQuery.data.passportNumber,
      age: userQuery.data.age,
      passengerType: userQuery.data.passengerType
    });
  }, [isEdit, userQuery.data, reset]);

  const onSubmit = async (values: UserFormValues) => {
    if (isEdit) {
      const payload: UpdateUserRequest = {
        ...values,
        password: values.password || undefined
      };
      await updateMutation.mutateAsync({ id: userId, payload });
    } else {
      await createMutation.mutateAsync(values as CreateUserRequest);
    }
    navigate('/users');
  };

  return (
    <>
      <PageHeader
        eyebrow="Identity form"
        title={isEdit ? 'Chỉnh sửa người dùng' : 'Tạo người dùng'}
        subtitle="Validation và payload giữ nguyên; chỉ cải thiện grouping và sticky actions để form rõ luồng hơn."
        onBack={() => navigate('/users')}
      />

      <SectionCard title="User profile" subtitle="Access control and passenger-linked identity data">
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <FormSection title="Identity" description="Business fields shown most prominently in directory and detail pages.">
            <Form.Item label="Họ tên" validateStatus={errors.name ? 'error' : undefined} help={errors.name?.message}>
              <Controller name="name" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>

            <Form.Item label="Email" validateStatus={errors.email ? 'error' : undefined} help={errors.email?.message}>
              <Controller name="email" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>

            <Form.Item
              label="Passport"
              validateStatus={errors.passportNumber ? 'error' : undefined}
              help={errors.passportNumber?.message}
            >
              <Controller name="passportNumber" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>

            <Form.Item label="Tuổi" validateStatus={errors.age ? 'error' : undefined} help={errors.age?.message}>
              <Controller
                name="age"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    value={field.value}
                    onChange={(value) => field.onChange(Number(value || 0))}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Loại hành khách"
              validateStatus={errors.passengerType ? 'error' : undefined}
              help={errors.passengerType?.message}
            >
              <Controller
                name="passengerType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { label: 'Unknown', value: PassengerType.UNKNOWN },
                      { label: 'Male', value: PassengerType.MALE },
                      { label: 'Female', value: PassengerType.FEMALE },
                      { label: 'Baby', value: PassengerType.BABY }
                    ]}
                  />
                )}
              />
            </Form.Item>
          </FormSection>

          <FormSection
            title="Access"
            description={isEdit ? 'Role stays editable. Leave password empty to keep the current hash.' : 'Set the initial role and password.'}
          >
            <Form.Item
              label="Mật khẩu"
              validateStatus={errors.password ? 'error' : undefined}
              help={errors.password?.message || (isEdit ? 'Để trống nếu không đổi mật khẩu' : undefined)}
            >
              <Controller
                name="password"
                control={control}
                render={({ field }) => <Input.Password {...field} autoComplete="new-password" />}
              />
            </Form.Item>

            <Form.Item label="Vai trò" validateStatus={errors.role ? 'error' : undefined} help={errors.role?.message}>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { label: 'User', value: Role.USER },
                      { label: 'Admin', value: Role.ADMIN }
                    ]}
                  />
                )}
              />
            </Form.Item>
          </FormSection>

          <FormActionsBar>
            <Space>
              <Button onClick={() => navigate('/users')}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending || userQuery.isLoading}
              >
                {isEdit ? 'Lưu thay đổi' : 'Tạo mới'}
              </Button>
            </Space>
          </FormActionsBar>
        </Form>
      </SectionCard>
    </>
  );
};
