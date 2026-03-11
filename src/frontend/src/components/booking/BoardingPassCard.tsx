import { Typography } from 'antd';
import { formatCurrency } from '@utils/format';
import { formatDateLabel, formatTimeLabel, getAirlineName } from '@utils/presentation';

const { Text, Title } = Typography;

export type BoardingPassCardProps = {
  bookingId: number;
  flightNumber: string;
  passengerName: string;
  seatNumber: string;
  departureCode: string;
  departureName: string;
  departureTime?: string | Date;
  arrivalCode: string;
  arrivalName: string;
  arrivalTime?: string | Date;
  flightDate: string | Date;
  price: number;
};

export const BoardingPassCard = ({
  bookingId,
  flightNumber,
  passengerName,
  seatNumber,
  departureCode,
  departureName,
  departureTime,
  arrivalCode,
  arrivalName,
  arrivalTime,
  flightDate,
  price
}: BoardingPassCardProps) => {
  return (
    <div className="boarding-pass app-surface">
      <div className="boarding-pass__header">
        <div>
          <Text className="page-eyebrow">Boarding Pass</Text>
          <Title level={4} style={{ margin: 0 }}>
            {`BK-${bookingId}`}
          </Title>
        </div>
        <Text strong>{getAirlineName(flightNumber)}</Text>
      </div>

      <div className="boarding-pass__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Text strong>{passengerName}</Text>
          <Text style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{flightNumber}</Text>
        </div>

        <div className="boarding-pass__route">
          <div>
            <Text className="boarding-pass__airport-code">{departureCode}</Text>
            <Text type="secondary">{departureName}</Text>
            <Text className="boarding-pass__airport-time">{formatTimeLabel(departureTime)}</Text>
          </div>
          <div className="boarding-pass__route-line">✈</div>
          <div style={{ textAlign: 'right' }}>
            <Text className="boarding-pass__airport-code">{arrivalCode}</Text>
            <Text type="secondary">{arrivalName}</Text>
            <Text className="boarding-pass__airport-time">{formatTimeLabel(arrivalTime)}</Text>
          </div>
        </div>

        <div className="boarding-pass__info-grid">
          <div className="boarding-pass__info-item">
            <label>Date</label>
            <span className="boarding-pass__info-value">{formatDateLabel(flightDate, 'DD MMM YYYY')}</span>
          </div>
          <div className="boarding-pass__info-item">
            <label>Seat</label>
            <span className="boarding-pass__info-value">{seatNumber}</span>
          </div>
          <div className="boarding-pass__info-item">
            <label>Fare</label>
            <span className="boarding-pass__info-value">{formatCurrency(price)}</span>
          </div>
        </div>
      </div>

      <div className="boarding-pass__barcode">▌▌▌▌ ▌▌ ▌▌▌ ▌▌▌▌ ▌▌ ▌▌▌</div>
    </div>
  );
};
