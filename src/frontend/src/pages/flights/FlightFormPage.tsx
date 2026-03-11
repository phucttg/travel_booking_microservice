import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { FormActionsBar } from '@components/common/FormActionsBar';
import { FormSection } from '@components/common/FormSection';
import { PageHeader } from '@components/common/PageHeader';
import { SectionCard } from '@components/common/SectionCard';
import { useGetAircrafts } from '@hooks/useAircrafts';
import { useGetAirports } from '@hooks/useAirports';
import { useCreateFlight } from '@hooks/useFlights';
import { FlightStatus } from '@/types/enums';
import { flightStatusLabels, formatDuration } from '@utils/format';

const dayjsSchema = z.custom<Dayjs>((value) => dayjs.isDayjs(value), {
  message: 'Ngày không hợp lệ'
});

const normalizeToMinute = (value: Dayjs) => value.second(0).millisecond(0);

const flightFormSchema = z
  .object({
    flightNumber: z.string().min(1, 'Bắt buộc'),
    price: z.number().positive('Giá phải lớn hơn 0'),
    flightStatus: z.nativeEnum(FlightStatus),
    flightDate: dayjsSchema,
    departureDate: dayjsSchema,
    arriveDate: dayjsSchema,
    departureAirportId: z.number().min(1),
    arriveAirportId: z.number().min(1),
    aircraftId: z.number().min(1),
    durationMinutes: z.number().min(1)
  })
  .refine((data) => data.arriveDate.valueOf() > data.departureDate.valueOf(), {
    message: 'Giờ đến phải sau giờ khởi hành',
    path: ['arriveDate']
  })
  .refine((data) => data.arriveAirportId !== data.departureAirportId, {
    message: 'Sân bay đến phải khác sân bay đi',
    path: ['arriveAirportId']
  });

type FlightFormValues = z.infer<typeof flightFormSchema>;

export const FlightFormPage = () => {
  const navigate = useNavigate();
  const airportsQuery = useGetAirports();
  const aircraftsQuery = useGetAircrafts();
  const createMutation = useCreateFlight();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<FlightFormValues>({
    resolver: zodResolver(flightFormSchema),
    mode: 'onChange',
    defaultValues: {
      flightNumber: '',
      price: 0,
      flightStatus: FlightStatus.SCHEDULED,
      flightDate: dayjs().startOf('day'),
      departureDate: dayjs().startOf('minute'),
      arriveDate: dayjs().startOf('minute').add(1, 'hour'),
      departureAirportId: 0,
      arriveAirportId: 0,
      aircraftId: 0,
      durationMinutes: 60
    }
  });

  const departureDate = watch('departureDate');
  const arriveDate = watch('arriveDate');
  const departureAirportId = watch('departureAirportId');
  const flightDate = watch('flightDate');
  const durationMinutes = watch('durationMinutes');

  useEffect(() => {
    if (!dayjs.isDayjs(departureDate) || !dayjs.isDayjs(arriveDate)) return;

    const normalizedDeparture = normalizeToMinute(departureDate);
    const normalizedArrive = normalizeToMinute(arriveDate);
    const derivedFlightDate = normalizedDeparture.startOf('day');
    const duration = Math.max(1, Math.round((normalizedArrive.valueOf() - normalizedDeparture.valueOf()) / 60000));

    if (!dayjs.isDayjs(flightDate) || !flightDate.isSame(derivedFlightDate)) {
      setValue('flightDate', derivedFlightDate, { shouldValidate: true });
    }

    if (durationMinutes !== duration) {
      setValue('durationMinutes', duration, { shouldValidate: true });
    }
  }, [arriveDate, departureDate, durationMinutes, flightDate, setValue]);

  const airportOptions = useMemo(
    () =>
      (airportsQuery.data || []).map((airport) => ({
        label: `${airport.code} - ${airport.name}`,
        value: airport.id
      })),
    [airportsQuery.data]
  );

  const arriveAirportOptions = useMemo(
    () => airportOptions.filter((airport) => airport.value !== departureAirportId),
    [airportOptions, departureAirportId]
  );

  const aircraftOptions = useMemo(
    () =>
      (aircraftsQuery.data || []).map((aircraft) => ({
        label: `${aircraft.name} (${aircraft.model})`,
        value: aircraft.id
      })),
    [aircraftsQuery.data]
  );

  const statusOptions = useMemo(
    () =>
      Object.values(FlightStatus)
        .filter((value) => typeof value === 'number')
        .filter((status) => status !== FlightStatus.UNKNOWN)
        .map((status) => ({
          label: flightStatusLabels[status as FlightStatus],
          value: status as FlightStatus
        })),
    []
  );

  const schedulePreview = useMemo(() => {
    if (!dayjs.isDayjs(departureDate) || !dayjs.isDayjs(arriveDate)) {
      return null;
    }

    const normalizedDeparture = normalizeToMinute(departureDate);
    const normalizedArrive = normalizeToMinute(arriveDate);
    const normalizedDuration = Math.max(
      1,
      Math.round((normalizedArrive.valueOf() - normalizedDeparture.valueOf()) / 60000)
    );
    const dayOffset = normalizedArrive.startOf('day').diff(normalizedDeparture.startOf('day'), 'day');

    return {
      flightDateLabel: normalizedDeparture.startOf('day').format('DD/MM/YYYY'),
      departureLabel: normalizedDeparture.format('DD/MM/YYYY HH:mm'),
      arriveLabel: normalizedArrive.format('DD/MM/YYYY HH:mm'),
      durationLabel: formatDuration(normalizedDuration),
      dayOffset
    };
  }, [arriveDate, departureDate]);

  const onSubmit = async (values: FlightFormValues) => {
    const normalizedDeparture = normalizeToMinute(values.departureDate);
    const normalizedArrive = normalizeToMinute(values.arriveDate);
    const computedDurationMinutes = Math.max(
      1,
      Math.round((normalizedArrive.valueOf() - normalizedDeparture.valueOf()) / 60000)
    );

    try {
      await createMutation.mutateAsync({
        flightNumber: values.flightNumber,
        price: values.price,
        flightStatus: values.flightStatus,
        // Keep sending flightDate for backward compatibility; backend canonicalizes it from departureDate.
        flightDate: normalizedDeparture.startOf('day').toDate(),
        departureDate: normalizedDeparture.toDate(),
        departureAirportId: values.departureAirportId,
        aircraftId: values.aircraftId,
        arriveDate: normalizedArrive.toDate(),
        arriveAirportId: values.arriveAirportId,
        durationMinutes: computedDurationMinutes
      });
    } catch {
      // Error toast is handled centrally in mutation onError; suppress unhandled promise noise in console.
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Flight setup"
        title="Tạo chuyến bay"
        subtitle="Flight form chia theo commercial setup, schedule và routing để entry flow rõ ràng hơn mà không đổi validation logic."
        onBack={() => navigate('/flights')}
      />

      <SectionCard title="Flight configuration" subtitle="Commercial, operational and routing fields" bodyPadding={24}>
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <FormSection title="Commercial setup" description="Flight number, fare and visible status used across list/detail and booking flow.">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Số hiệu"
                  validateStatus={errors.flightNumber ? 'error' : undefined}
                  help={errors.flightNumber?.message}
                >
                  <Controller
                    name="flightNumber"
                    control={control}
                    render={({ field }) => <Input {...field} placeholder="VN-1234" />}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Giá vé" validateStatus={errors.price ? 'error' : undefined} help={errors.price?.message}>
                  <Controller
                    name="price"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        addonBefore="$"
                        value={field.value}
                        onChange={(value) => field.onChange(Number(value || 0))}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Trạng thái"
              validateStatus={errors.flightStatus ? 'error' : undefined}
              help={errors.flightStatus?.message}
            >
              <Controller
                name="flightStatus"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} options={statusOptions} onChange={field.onChange} />
                )}
              />
            </Form.Item>
          </FormSection>

          <FormSection title="Schedule" description="Duration is still auto-derived from departure and arrival datetime fields.">
            <Alert
              showIcon
              type="info"
              message="Giờ Việt Nam (UTC+7)"
              description="Ngày bay được tự suy ra từ giờ khởi hành để tránh lệch timezone giữa frontend và backend."
              style={{ marginBottom: 16 }}
            />

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Ngày bay"
                  validateStatus={errors.flightDate ? 'error' : undefined}
                  help={errors.flightDate?.message || 'Tự động suy ra từ giờ khởi hành'}
                >
                  <Controller
                    name="flightDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker style={{ width: '100%' }} value={field.value} disabled />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Giờ khởi hành"
                  validateStatus={errors.departureDate ? 'error' : undefined}
                  help={errors.departureDate?.message}
                >
                  <Controller
                    name="departureDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        showTime={{ format: 'HH:mm' }}
                        format="YYYY-MM-DD HH:mm"
                        style={{ width: '100%' }}
                        value={field.value}
                        onChange={(value) => field.onChange(value ? normalizeToMinute(value) : value)}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Giờ đến"
                  validateStatus={errors.arriveDate ? 'error' : undefined}
                  help={errors.arriveDate?.message}
                >
                  <Controller
                    name="arriveDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        showTime={{ format: 'HH:mm' }}
                        format="YYYY-MM-DD HH:mm"
                        style={{ width: '100%' }}
                        value={field.value}
                        onChange={(value) => field.onChange(value ? normalizeToMinute(value) : value)}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>

            {schedulePreview ? (
              <div className="flight-schedule-preview">
                <div className="flight-schedule-preview__header">
                  <strong>Lịch trình dự kiến</strong>
                  {schedulePreview.dayOffset > 0 ? (
                    <Tag color="gold">Qua ngày (+{schedulePreview.dayOffset})</Tag>
                  ) : (
                    <Tag color="blue">Cùng ngày</Tag>
                  )}
                </div>
                <div className="flight-schedule-preview__grid">
                  <div className="flight-schedule-preview__item">
                    <span>Ngày bay</span>
                    <strong>{schedulePreview.flightDateLabel}</strong>
                  </div>
                  <div className="flight-schedule-preview__item">
                    <span>Khởi hành</span>
                    <strong>{schedulePreview.departureLabel}</strong>
                  </div>
                  <div className="flight-schedule-preview__item">
                    <span>Đến nơi</span>
                    <strong>{schedulePreview.arriveLabel}</strong>
                  </div>
                  <div className="flight-schedule-preview__item">
                    <span>Thời gian bay</span>
                    <strong>{schedulePreview.durationLabel}</strong>
                  </div>
                </div>
              </div>
            ) : null}

            <Form.Item
              label="Thời gian bay (phút)"
              validateStatus={errors.durationMinutes ? 'error' : undefined}
              help={errors.durationMinutes?.message || 'Tự động cập nhật theo giờ đi / đến, không nhập tay'}
            >
              <Controller
                name="durationMinutes"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    value={field.value}
                    readOnly
                    controls={false}
                  />
                )}
              />
            </Form.Item>
          </FormSection>

          <FormSection title="Routing and aircraft" description="Routing constraints remain unchanged: arrival airport must differ from departure airport.">
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Sân bay đi"
                  validateStatus={errors.departureAirportId ? 'error' : undefined}
                  help={errors.departureAirportId?.message}
                >
                  <Controller
                    name="departureAirportId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value > 0 ? field.value : undefined}
                        options={airportOptions}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Sân bay đến"
                  validateStatus={errors.arriveAirportId ? 'error' : undefined}
                  help={errors.arriveAirportId?.message}
                >
                  <Controller
                    name="arriveAirportId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value > 0 ? field.value : undefined}
                        options={arriveAirportOptions}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Máy bay"
                  validateStatus={errors.aircraftId ? 'error' : undefined}
                  help={errors.aircraftId?.message}
                >
                  <Controller
                    name="aircraftId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value > 0 ? field.value : undefined}
                        options={aircraftOptions}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
          </FormSection>

          <FormActionsBar>
            <Space>
              <Button onClick={() => navigate('/flights')}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} disabled={!isValid}>
                Tạo mới
              </Button>
            </Space>
          </FormActionsBar>
        </Form>
      </SectionCard>
    </>
  );
};
