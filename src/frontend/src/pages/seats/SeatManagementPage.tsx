import { PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Form, Input, Modal, Row, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MetricCard } from '@components/common/MetricCard';
import { PageHeader } from '@components/common/PageHeader';
import { SeatMapVisual } from '@components/common/SeatMapVisual';
import { SectionCard } from '@components/common/SectionCard';
import { StatusPill } from '@components/common/StatusPill';
import { useGetAircrafts } from '@hooks/useAircrafts';
import { useGetFlightById } from '@hooks/useFlights';
import { useCreateSeat, useGetSeatsByFlight, useReconcileMissingSeats } from '@hooks/useSeats';
import { SeatClass, SeatType } from '@/types/enums';
import { CreateSeatRequest, SeatDto } from '@/types/seat.types';
import { formatDateTime, seatClassLabels, seatTypeLabels } from '@utils/format';
import { getSeatClassTone, getSeatTypeTone } from '@utils/presentation';
import { parseRouteId } from '@utils/helpers';
import { getExpectedSeatCountByAircraftModel } from '@utils/seatLayout';

const { Text } = Typography;

type SeatFormState = {
  seatNumber: string;
  seatClass: SeatClass;
  seatType: SeatType;
};

export const SeatManagementPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const flightId = parseRouteId(id);

  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<SeatFormState>({
    seatNumber: '',
    seatClass: SeatClass.ECONOMY,
    seatType: SeatType.MIDDLE
  });

  const flightQuery = useGetFlightById(flightId);
  const aircraftsQuery = useGetAircrafts();
  const seatsQuery = useGetSeatsByFlight(flightId);
  const createSeatMutation = useCreateSeat();
  const reconcileMissingSeatsMutation = useReconcileMissingSeats();

  const seats = useMemo(() => seatsQuery.data ?? [], [seatsQuery.data]);

  const stats = useMemo(() => {
    const total = seats.length;
    const reserved = seats.filter((seat) => seat.isReserved).length;
    const available = total - reserved;
    return { total, available };
  }, [seats]);

  const aircraftModel = useMemo(() => {
    const aircraftId = flightQuery.data?.aircraftId;
    if (!aircraftId || !aircraftsQuery.data) {
      return undefined;
    }

    return aircraftsQuery.data.find((aircraft) => aircraft.id === aircraftId)?.model;
  }, [aircraftsQuery.data, flightQuery.data?.aircraftId]);

  const expectedSeats = useMemo(() => getExpectedSeatCountByAircraftModel(aircraftModel), [aircraftModel]);
  const missingSeats = Math.max(0, expectedSeats - stats.total);

  const columns: ColumnsType<SeatDto> = [
    {
      title: 'Seat',
      dataIndex: 'seatNumber',
      key: 'seatNumber',
      render: (value: string) => <Text style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{value}</Text>
    },
    {
      title: 'Class',
      dataIndex: 'seatClass',
      key: 'seatClass',
      render: (value: SeatClass) => <StatusPill label={seatClassLabels[value]} tone={getSeatClassTone(value)} subtle />
    },
    {
      title: 'Type',
      dataIndex: 'seatType',
      key: 'seatType',
      render: (value: SeatType) => <StatusPill label={seatTypeLabels[value]} tone={getSeatTypeTone(value)} subtle />
    },
    {
      title: 'Reserved',
      dataIndex: 'isReserved',
      key: 'isReserved',
      render: (value: boolean) =>
        value ? <StatusPill label="Reserved" tone="danger" subtle /> : <StatusPill label="Available" tone="success" subtle />
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string | Date) => formatDateTime(value, 'DD/MM/YY')
    }
  ];

  const handleCreate = async () => {
    const payload: CreateSeatRequest = {
      seatNumber: formState.seatNumber.trim(),
      seatClass: formState.seatClass,
      seatType: formState.seatType,
      flightId
    };

    if (!payload.seatNumber) {
      return;
    }

    await createSeatMutation.mutateAsync(payload);
    setOpen(false);
    setFormState({
      seatNumber: '',
      seatClass: SeatClass.ECONOMY,
      seatType: SeatType.MIDDLE
    });
  };

  const handleReconcile = async () => {
    try {
      await reconcileMissingSeatsMutation.mutateAsync({ flightId });
    } catch {
      // Error toast is handled in mutation onError.
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Seat ops"
        title={`Quản lý ghế - ${flightQuery.data?.flightNumber || `Flight #${flightId}`}`}
        subtitle="Seat inventory view thống nhất với flight detail: summary cards phía trên, table ops phía dưới."
        onBack={() => navigate(`/flights/${flightId}`)}
        extra={
          <Space>
            <Button
              icon={<SyncOutlined />}
              size="large"
              onClick={handleReconcile}
              loading={reconcileMissingSeatsMutation.isPending}
            >
              Khởi tạo ghế tự động
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setOpen(true)}>
              Thêm ghế
            </Button>
          </Space>
        }
      />

      {missingSeats > 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Flight đang thiếu ${missingSeats} ghế so với cấu hình chuẩn (${stats.total}/${expectedSeats}).`}
          description="Nhấn 'Khởi tạo ghế tự động' để backfill toàn bộ ghế thiếu cho flight này."
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <MetricCard
            label="Current seats"
            value={stats.total}
            caption="Ghế hiện có trong hệ thống cho chuyến bay này."
            accent="#0f6cbd"
          />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard
            label="Expected seats"
            value={expectedSeats}
            caption="Số ghế chuẩn theo model máy bay hiện tại."
            accent="#4052c9"
          />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="Missing" value={missingSeats} caption="Số ghế còn thiếu cần được backfill." accent="#cf3f4f" />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard label="Available" value={stats.available} caption="Seats still open for reservation." accent="#13908c" />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <SectionCard title="Cabin layout" subtitle="Visual overview from full seat inventory">
            <SeatMapVisual
              seats={seats}
              reservedSeats={seats.filter((seat) => seat.isReserved).map((seat) => seat.seatNumber)}
            />
          </SectionCard>
        </Col>
        <Col xs={24} lg={14}>
          <SectionCard title="Seat table" subtitle="Operational seat registry for the selected flight">
            <Table<SeatDto>
              rowKey="id"
              loading={seatsQuery.isFetching || flightQuery.isFetching}
              columns={columns}
              dataSource={seats}
              pagination={false}
              scroll={{ x: 760 }}
            />
          </SectionCard>
        </Col>
      </Row>

      <Modal
        title="Thêm ghế"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleCreate}
        okText="Tạo ghế"
        cancelText="Hủy"
        confirmLoading={createSeatMutation.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="Seat Number" required>
            <Input
              value={formState.seatNumber}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  seatNumber: event.target.value.toUpperCase()
                }))
              }
            />
          </Form.Item>

          <Form.Item label="Seat Class" required>
            <Select
              value={formState.seatClass}
              options={[
                { label: 'First Class', value: SeatClass.FIRST_CLASS },
                { label: 'Business', value: SeatClass.BUSINESS },
                { label: 'Economy', value: SeatClass.ECONOMY }
              ]}
              onChange={(value) => setFormState((prev) => ({ ...prev, seatClass: value }))}
            />
          </Form.Item>

          <Form.Item label="Seat Type" required>
            <Select
              value={formState.seatType}
              options={[
                { label: 'Window', value: SeatType.WINDOW },
                { label: 'Middle', value: SeatType.MIDDLE },
                { label: 'Aisle', value: SeatType.AISLE }
              ]}
              onChange={(value) => setFormState((prev) => ({ ...prev, seatType: value }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
