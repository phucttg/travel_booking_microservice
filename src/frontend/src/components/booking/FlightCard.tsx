import { ReactNode } from 'react';
import { CalendarOutlined, DatabaseOutlined } from '@ant-design/icons';
import { Plane } from 'lucide-react';
import { Button, Card, Space, Typography } from 'antd';
import { RouteBadge } from '@components/common/RouteBadge';
import { StatusPill } from '@components/common/StatusPill';
import { AirportDto } from '@/types/airport.types';
import { FlightDto } from '@/types/flight.types';
import { flightStatusLabels, formatCurrency, formatDuration } from '@utils/format';
import {
  buildRouteDescriptor,
  formatDateLabel,
  formatTimeLabel,
  getAirlineColor,
  getAirlineName,
  getFlightStatusTone
} from '@utils/presentation';

const { Text } = Typography;

type FlightCardProps = {
  flight: FlightDto;
  airportsMap: Record<number, AirportDto>;
  availableSeatCount?: number;
  aircraftName?: string;
  onSelect?: (flight: FlightDto) => void;
  actionLabel?: string;
  actionSlot?: ReactNode;
};

export const FlightCard = ({
  flight,
  airportsMap,
  availableSeatCount,
  aircraftName,
  onSelect,
  actionLabel = 'Chọn chuyến này',
  actionSlot
}: FlightCardProps) => {
  const route = buildRouteDescriptor(
    airportsMap[flight.departureAirportId],
    airportsMap[flight.arriveAirportId],
    flight.departureAirportId,
    flight.arriveAirportId
  );

  return (
    <Card
      className="app-surface"
      style={{
        borderRadius: 24,
        borderLeft: `4px solid ${getAirlineColor(flight.flightNumber)}`
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <Space direction="vertical" size={6}>
            <Text style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 16 }}>
              {flight.flightNumber}
            </Text>
            <Text type="secondary">{getAirlineName(flight.flightNumber)}</Text>
          </Space>

          <StatusPill label={flightStatusLabels[flight.flightStatus]} tone={getFlightStatusTone(flight.flightStatus)} />
        </div>

        <div className="flight-route-visual">
          <div className="departure">
            <Text className="time">{formatTimeLabel(flight.departureDate)}</Text>
            <Text className="code">{route.departure.code}</Text>
            <Text className="name">{route.departure.name}</Text>
          </div>

          <div className="route-line">
            <span className="plane-icon">
              <Plane size={18} />
            </span>
            <Text className="duration">{formatDuration(flight.durationMinutes)}</Text>
            <Text type="secondary">Direct</Text>
          </div>

          <div className="arrival">
            <Text className="time">{formatTimeLabel(flight.arriveDate)}</Text>
            <Text className="code">{route.arrival.code}</Text>
            <Text className="name">{route.arrival.name}</Text>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12
          }}
        >
          <div style={{ padding: 12, borderRadius: 14, background: 'rgba(15, 108, 189, 0.06)' }}>
            <Text type="secondary">
              <CalendarOutlined /> Date
            </Text>
            <div>
              <Text strong>{formatDateLabel(flight.flightDate)}</Text>
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 14, background: 'rgba(19, 144, 140, 0.06)' }}>
            <Text type="secondary">
              <Plane size={14} style={{ display: 'inline-block', verticalAlign: 'text-bottom', marginRight: 4 }} />
              Aircraft
            </Text>
            <div>
              <Text strong>{aircraftName || `#${flight.aircraftId}`}</Text>
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 14, background: 'rgba(100, 116, 139, 0.06)' }}>
            <Text type="secondary">
              <DatabaseOutlined /> Seats
            </Text>
            <div>
              <Text strong>{typeof availableSeatCount === 'number' ? `${availableSeatCount} available` : 'Live inventory'}</Text>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Space direction="vertical" size={6}>
            <Text type="secondary">{`${formatTimeLabel(flight.departureDate)} - ${formatTimeLabel(flight.arriveDate)}`}</Text>
            <RouteBadge
              compact
              fromCode={route.departure.code}
              toCode={route.arrival.code}
              fromName={route.departure.name}
              toName={route.arrival.name}
            />
          </Space>

          <Space direction="vertical" size={8} align="end">
            <Text style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(flight.price)}</Text>
            {actionSlot ||
              (onSelect ? (
                <Button type="primary" size="large" onClick={() => onSelect(flight)}>
                  {actionLabel}
                </Button>
              ) : null)}
          </Space>
        </div>
      </div>
    </Card>
  );
};
