import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, Input, Space } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { FormActionsBar } from '@components/common/FormActionsBar';
import { FormSection } from '@components/common/FormSection';
import { PageHeader } from '@components/common/PageHeader';
import { SectionCard } from '@components/common/SectionCard';
import { useCreateAirport } from '@hooks/useAirports';
import { airportFormSchema } from '@utils/validation';

type AirportFormValues = z.infer<typeof airportFormSchema>;

export const AirportFormPage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateAirport();

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<AirportFormValues>({
    resolver: zodResolver(airportFormSchema),
    defaultValues: {
      code: '',
      name: '',
      address: ''
    }
  });

  const onSubmit = async (values: AirportFormValues) => {
    await createMutation.mutateAsync(values);
    navigate('/airports');
  };

  return (
    <>
      <PageHeader
        eyebrow="Airport setup"
        title="Create airport"
        subtitle="The form is split into business sections so the airport code, name, and address are easier to review."
        onBack={() => navigate('/airports')}
      />

      <SectionCard title="Airport basics" subtitle="Registry fields used by the flight service">
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <FormSection title="Registry identity" description="Airport code will be normalized to uppercase for route displays.">
            <Form.Item label="Airport code" validateStatus={errors.code ? 'error' : undefined} help={errors.code?.message}>
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <Input {...field} onChange={(event) => field.onChange(event.target.value.toUpperCase())} />
                )}
              />
            </Form.Item>
            <Form.Item label="Airport name" validateStatus={errors.name ? 'error' : undefined} help={errors.name?.message}>
              <Controller name="name" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
          </FormSection>

          <FormSection title="Location" description="Address is shown as supporting context in list and detail views.">
            <Form.Item
              label="Address"
              validateStatus={errors.address ? 'error' : undefined}
              help={errors.address?.message}
            >
              <Controller name="address" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
          </FormSection>

          <FormActionsBar>
            <Space>
              <Button onClick={() => navigate('/airports')}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Create airport
              </Button>
            </Space>
          </FormActionsBar>
        </Form>
      </SectionCard>
    </>
  );
};
