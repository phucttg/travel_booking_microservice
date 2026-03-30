import { Card, Col, Row, Space, Typography } from 'antd';
import { RouteBadge } from '@components/common/RouteBadge';
import { StatusPill } from '@components/common/StatusPill';
import { AirportDto } from '@/types/airport.types';
import { FlightDto } from '@/types/flight.types';
import { PassengerDto } from '@/types/passenger.types';
import { SeatDto } from '@/types/seat.types';
import { flightStatusLabels, formatCurrency, formatDateTime, seatClassLabels, seatTypeLabels } from '@utils/format';
import { buildRouteDescriptor, getFlightStatusTone } from '@utils/presentation';

const { Text, Title } = Typography;

type BookingSummaryProps = {
  flight: FlightDto;
  selectedSeat?: Pick<SeatDto, 'seatNumber' | 'seatClass' | 'price' | 'currency'> &
    Partial<Pick<SeatDto, 'seatType'>>;
  passenger?: PassengerDto | null;
  airportsMap: Record<number, AirportDto>;
};

type SummaryItemProps = {
  label: string;
  value: string;
  hint?: string;
};

const SummaryItem = ({ label, value, hint }: SummaryItemProps) => (
  <div
    style={{
      padding: 14,
      borderRadius: 18,
      border: '1px solid rgba(160, 182, 204, 0.2)',
      background: 'rgba(255,255,255,0.74)'
    }}
  >
    <Space direction="vertical" size={4}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Text>
      <Text strong>{value}</Text>
      {hint ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {hint}
        </Text>
      ) : null}
    </Space>
  </div>
);

export const BookingSummary = ({ flight, selectedSeat, passenger, airportsMap }: BookingSummaryProps) => {
  const route = buildRouteDescriptor(
    airportsMap[flight.departureAirportId],
    airportsMap[flight.arriveAirportId],
    flight.departureAirportId,
    flight.arriveAirportId
  );

  return (
    <Card className="app-surface" style={{ borderRadius: 24 }}>
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <Space direction="vertical" size={8}>
          <Text className="page-eyebrow">Booking summary</Text>
          <Title level={4} style={{ margin: 0 }}>
            {flight.flightNumber}
          </Title>
          <RouteBadge
            fromCode={route.departure.code}
            toCode={route.arrival.code}
            fromName={route.departure.name}
            toName={route.arrival.name}
          />
          <StatusPill label={flightStatusLabels[flight.flightStatus]} tone={getFlightStatusTone(flight.flightStatus)} />
        </Space>

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <SummaryItem label="Flight date" value={formatDateTime(flight.flightDate, 'DD/MM/YYYY')} />
          </Col>
          <Col xs={24} sm={12}>
            <SummaryItem
              label={selectedSeat ? 'Selected fare' : 'Base fare'}
              value={formatCurrency(selectedSeat?.price || flight.price, selectedSeat?.currency || 'VND')}
              hint={
                selectedSeat
                  ? 'Exact seat price shown before checkout lock.'
                  : 'Final total locks after seat assignment.'
              }
            />
          </Col>
          <Col xs={24} sm={12}>
            <SummaryItem
              label="Seat"
              value={
                selectedSeat
                  ? `${selectedSeat.seatNumber} · ${seatClassLabels[selectedSeat.seatClass]}${selectedSeat.seatType ? ` / ${seatTypeLabels[selectedSeat.seatType]}` : ''}`
                  : 'Auto-assign Economy'
              }
              hint={
                selectedSeat
                  ? selectedSeat.seatType
                    ? undefined
                    : 'Seat restored from booking snapshot.'
                  : 'Business and First Class require explicit selection.'
              }
            />
          </Col>
          <Col xs={24} sm={12}>
            <SummaryItem
              label="Passenger"
              value={passenger ? `${passenger.name} · ${passenger.passportNumber}` : 'Loading passenger profile'}
            />
          </Col>
        </Row>
      </Space>
    </Card>
  );
};
