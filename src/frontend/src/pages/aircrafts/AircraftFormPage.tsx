import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, Input, InputNumber, Space } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { FormActionsBar } from '@components/common/FormActionsBar';
import { FormSection } from '@components/common/FormSection';
import { PageHeader } from '@components/common/PageHeader';
import { SectionCard } from '@components/common/SectionCard';
import { useCreateAircraft } from '@hooks/useAircrafts';
import { aircraftFormSchema } from '@utils/validation';

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

export const AircraftFormPage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateAircraft();

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
      name: '',
      model: '',
      manufacturingYear: new Date().getFullYear()
    }
  });

  const onSubmit = async (values: AircraftFormValues) => {
    await createMutation.mutateAsync(values);
    navigate('/aircrafts');
  };

  return (
    <>
      <PageHeader
        eyebrow="Fleet setup"
        title="Tạo máy bay"
        subtitle="Aircraft form gom nhóm identity và manufacturing data theo cách gần với inventory management hơn."
        onBack={() => navigate('/aircrafts')}
      />

      <SectionCard title="Aircraft profile" subtitle="Fleet registry fields used by flight setup">
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <FormSection title="Identity" description="Name and model are surfaced in flight detail and fleet registry views.">
            <Form.Item label="Tên" validateStatus={errors.name ? 'error' : undefined} help={errors.name?.message}>
              <Controller name="name" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
            <Form.Item label="Model" validateStatus={errors.model ? 'error' : undefined} help={errors.model?.message}>
              <Controller name="model" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
          </FormSection>

          <FormSection title="Manufacturing" description="Manufacturing year is kept as structured numeric data.">
            <Form.Item
              label="Năm sản xuất"
              validateStatus={errors.manufacturingYear ? 'error' : undefined}
              help={errors.manufacturingYear?.message}
            >
              <Controller
                name="manufacturingYear"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1900}
                    max={new Date().getFullYear()}
                    value={field.value}
                    onChange={(value) => field.onChange(Number(value || 0))}
                  />
                )}
              />
            </Form.Item>
          </FormSection>

          <FormActionsBar>
            <Space>
              <Button onClick={() => navigate('/aircrafts')}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Tạo mới
              </Button>
            </Space>
          </FormActionsBar>
        </Form>
      </SectionCard>
    </>
  );
};
