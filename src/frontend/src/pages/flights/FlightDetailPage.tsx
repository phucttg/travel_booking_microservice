import { Button, Col, Descriptions, Row, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EntityHero } from '@components/common/EntityHero';
import { MetricCard } from '@components/common/MetricCard';
import { PageHeader } from '@components/common/PageHeader';
import { PageSkeleton } from '@components/common/PageSkeleton';
import { RouteBadge } from '@components/common/RouteBadge';
import { SeatMapVisual } from '@components/common/SeatMapVisual';
import { SectionCard } from '@components/common/SectionCard';
import { StatusPill } from '@components/common/StatusPill';
import { useGetAircrafts } from '@hooks/useAircrafts';
import { useGetAirports } from '@hooks/useAirports';
import { useGetFlightById } from '@hooks/useFlights';
import { useGetAvailableSeats } from '@hooks/useSeats';
import { useAuthStore } from '@stores/auth.store';
import { AirportDto } from '@/types/airport.types';
import { SeatClass, SeatType } from '@/types/enums';
import { SeatDto } from '@/types/seat.types';
import {
  flightStatusLabels,
  formatCurrency,
  formatDuration,
  formatDateTime,
  seatClassLabels,
  seatTypeLabels
} from '@utils/format';
import {
  buildRouteDescriptor,
  formatDateLabel,
  formatScheduleStrip,
  getFlightStatusTone,
  isFlightBookable,
  summarizeSeats
} from '@utils/presentation';
import { parseRouteId } from '@utils/helpers';

const { Text } = Typography;

export const FlightDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const flightId = parseRouteId(id);
  const { isAdmin } = useAuthStore();

  const flightQuery = useGetFlightById(flightId);
  const seatsQuery = useGetAvailableSeats(flightId);
  const airportsQuery = useGetAirports();
  const aircraftsQuery = useGetAircrafts();

  const flight = flightQuery.data;

  const airportMap = useMemo(
    () => Object.fromEntries((airportsQuery.data || []).map((item) => [item.id, item])) as Record<number, AirportDto>,
    [airportsQuery.data]
  );

  const aircraftMap = useMemo(
    () => Object.fromEntries((aircraftsQuery.data || []).map((item) => [item.id, item.name])) as Record<number, string>,
    [aircraftsQuery.data]
  );

  const availableSeats = seatsQuery.data || [];
  const seatSummary = summarizeSeats(availableSeats);
  const canBook = isFlightBookable(flight);

  const route = flight
    ? buildRouteDescriptor(
        airportMap[flight.departureAirportId],
        airportMap[flight.arriveAirportId],
        flight.departureAirportId,
        flight.arriveAirportId
      )
    : null;

  const columns: ColumnsType<SeatDto> = [
    {
      title: 'Ghế',
      dataIndex: 'seatNumber',
      key: 'seatNumber',
      render: (value: string) => (
        <Text style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{value}</Text>
      )
    },
    {
      title: 'Hạng',
      dataIndex: 'seatClass',
      key: 'seatClass',
      render: (value: SeatClass) => seatClassLabels[value]
    },
    {
      title: 'Loại',
      dataIndex: 'seatType',
      key: 'seatType',
      render: (value: SeatType) => seatTypeLabels[value]
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <StatusPill label="Available" tone="success" subtle />
    }
  ];

  if ((flightQuery.isLoading || airportsQuery.isLoading || aircraftsQuery.isLoading) && !flight) {
    return <PageSkeleton variant="detail" />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Flight detail"
        title={flight ? `Chuyến bay ${flight.flightNumber}` : 'Chi tiết chuyến bay'}
        subtitle="Hero section cho route, lịch bay và inventory summary. Dữ liệu ghế trống lấy trực tiếp từ seat service hiện tại."
        onBack={() => navigate('/flights')}
        meta={flight ? `${formatDateLabel(flight.flightDate)} · ${formatScheduleStrip(flight.departureDate, flight.arriveDate)}` : undefined}
        extra={
          flight ? (
            <Space wrap>
              <Button
                type="primary"
                size="large"
                disabled={!canBook}
                onClick={() => navigate(`/bookings/create?flightId=${flightId}`)}
              >
                Đặt vé
              </Button>
              {isAdmin() && (
                <Button size="large" onClick={() => navigate(`/flights/${flightId}/seats`)}>
                  Quản lý ghế
                </Button>
              )}
            </Space>
          ) : null
        }
      />

      {flight && route && (
        <EntityHero
          eyebrow="Route briefing"
          title={`${route.compact} · ${flight.flightNumber}`}
          subtitle={`${route.verbose}. Aircraft ${aircraftMap[flight.aircraftId] || `#${flight.aircraftId}`} đang dùng cho hành trình này.`}
          tags={
            <>
              <StatusPill label={flightStatusLabels[flight.flightStatus]} tone={getFlightStatusTone(flight.flightStatus)} />
              <StatusPill label={formatCurrency(flight.price)} tone="accent" />
            </>
          }
          meta={`${formatDateTime(flight.departureDate)} → ${formatDateTime(flight.arriveDate)} · ${formatDuration(flight.durationMinutes)}`}
          extra={
            <Space direction="vertical" size={12}>
              <RouteBadge
                fromCode={route.departure.code}
                toCode={route.arrival.code}
                fromName={route.departure.name}
                toName={route.arrival.name}
              />
            </Space>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={8}>
          <MetricCard
            label="Available seats"
            value={seatSummary.total}
            caption="Live count derived from the current available-seat endpoint."
            accent="#0f6cbd"
          />
        </Col>
        <Col xs={24} md={12} xl={8}>
          <MetricCard
            label="Cabin mix"
            value={`${seatSummary.byClass[String(SeatClass.FIRST_CLASS)] || 0}/${seatSummary.byClass[String(SeatClass.BUSINESS)] || 0}/${seatSummary.byClass[String(SeatClass.ECONOMY)] || 0}`}
            caption="First / Business / Economy"
            accent="#13908c"
          />
        </Col>
        <Col xs={24} md={12} xl={8}>
          <MetricCard
            label="Seat type mix"
            value={`${seatSummary.byType[String(SeatType.WINDOW)] || 0}/${seatSummary.byType[String(SeatType.MIDDLE)] || 0}/${seatSummary.byType[String(SeatType.AISLE)] || 0}`}
            caption="Window / Middle / Aisle"
            accent="#d97706"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <SectionCard title="Flight brief" subtitle="Schedule, fare and aircraft context">
            {flight && (
              <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="Flight number">{flight.flightNumber}</Descriptions.Item>
                <Descriptions.Item label="Route">{route?.verbose}</Descriptions.Item>
                <Descriptions.Item label="Flight date">{formatDateTime(flight.flightDate, 'DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="Schedule">
                  {formatDateTime(flight.departureDate)} - {formatDateTime(flight.arriveDate)}
                </Descriptions.Item>
                <Descriptions.Item label="Duration">{formatDuration(flight.durationMinutes)}</Descriptions.Item>
                <Descriptions.Item label="Fare">{formatCurrency(flight.price)}</Descriptions.Item>
                <Descriptions.Item label="Aircraft">
                  {aircraftMap[flight.aircraftId] || `#${flight.aircraftId}`}
                </Descriptions.Item>
              </Descriptions>
            )}
          </SectionCard>
        </Col>

        <Col xs={24} xl={14}>
          <SectionCard
            title="Availability summary"
            subtitle="Grouped by seat class from the current available seats feed"
          >
            <Space wrap size={[10, 10]}>
              {Object.values(SeatClass)
                .filter((value) => typeof value === 'number')
                .map((value) => (
                  <StatusPill
                    key={value}
                    label={`${seatClassLabels[value as SeatClass]} · ${seatSummary.byClass[String(value)] || 0}`}
                    tone={value === SeatClass.FIRST_CLASS ? 'accent' : value === SeatClass.BUSINESS ? 'info' : value === SeatClass.ECONOMY ? 'success' : 'neutral'}
                  />
                ))}
            </Space>
          </SectionCard>
        </Col>
      </Row>

      <SectionCard title="Ghế trống" subtitle="Table is kept as the secondary operational view">
        <Table<SeatDto>
          rowKey="id"
          columns={columns}
          dataSource={availableSeats}
          pagination={false}
          locale={{ emptyText: 'Không có ghế trống' }}
          scroll={{ x: 720 }}
        />
      </SectionCard>

      <SectionCard title="Seat map" subtitle="Visual cabin layout">
        <SeatMapVisual seats={availableSeats} />
      </SectionCard>
    </>
  );
};
