import { Button, Col, Descriptions, Row, Space } from 'antd';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BoardingPassCard } from '@components/booking/BoardingPassCard';
import { EntityHero } from '@components/common/EntityHero';
import { PageHeader } from '@components/common/PageHeader';
import { PageSkeleton } from '@components/common/PageSkeleton';
import { RouteBadge } from '@components/common/RouteBadge';
import { SectionCard } from '@components/common/SectionCard';
import { StatusPill } from '@components/common/StatusPill';
import { useGetAircrafts } from '@hooks/useAircrafts';
import { useGetAirports } from '@hooks/useAirports';
import { useCancelBooking, useGetBookingById } from '@hooks/useBookings';
import { useGetFlightById } from '@hooks/useFlights';
import { AirportDto } from '@/types/airport.types';
import { BookingStatus } from '@/types/enums';
import { bookingStatusLabels, formatCurrency, formatDateTime } from '@utils/format';
import { buildRouteDescriptor, canCancelBooking, getBookingStatusTone } from '@utils/presentation';
import { parseRouteId } from '@utils/helpers';

export const BookingDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const bookingId = parseRouteId(id);

  const bookingQuery = useGetBookingById(bookingId);
  const airportsQuery = useGetAirports();
  const aircraftsQuery = useGetAircrafts();
  const cancelBookingMutation = useCancelBooking();

  const booking = bookingQuery.data;
  const flightQuery = useGetFlightById(booking?.flightId || 0);

  const airportMap = useMemo(
    () => Object.fromEntries((airportsQuery.data || []).map((airport) => [airport.id, airport])) as Record<number, AirportDto>,
    [airportsQuery.data]
  );

  const aircraftMap = useMemo(
    () => Object.fromEntries((aircraftsQuery.data || []).map((aircraft) => [aircraft.id, aircraft.name])) as Record<number, string>,
    [aircraftsQuery.data]
  );

  const route = booking
    ? buildRouteDescriptor(
        airportMap[booking.departureAirportId],
        airportMap[booking.arriveAirportId],
        booking.departureAirportId,
        booking.arriveAirportId
      )
    : null;
  const bookingRelatedFlight = flightQuery.data;
  const cancellable =
    booking?.bookingStatus === BookingStatus.CONFIRMED &&
    Boolean(bookingRelatedFlight) &&
    canCancelBooking(booking, bookingRelatedFlight);

  if ((bookingQuery.isLoading || airportsQuery.isLoading || aircraftsQuery.isLoading) && !booking) {
    return <PageSkeleton variant="detail" />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Booking detail"
        title={`Chi tiết Booking #${bookingId}`}
        subtitle="Entity-style booking view với route, fare, passenger và audit timestamps rõ hơn."
        onBack={() => navigate('/bookings')}
        extra={
          booking ? (
            <Space>
              {cancellable && (
                <Button
                  danger
                  size="large"
                  loading={cancelBookingMutation.isPending}
                  onClick={async () => {
                    await cancelBookingMutation.mutateAsync(booking.id);
                  }}
                >
                  Hủy booking
                </Button>
              )}
            </Space>
          ) : null
        }
      />

      {booking && route && (
        <EntityHero
          eyebrow="Booking receipt"
          title={`BK-${booking.id} · ${booking.flightNumber}`}
          subtitle={`${route.verbose}. Passenger ${booking.passengerName} currently mapped to seat ${booking.seatNumber}.`}
          tags={
            <>
              <StatusPill label={bookingStatusLabels[booking.bookingStatus]} tone={getBookingStatusTone(booking.bookingStatus)} />
              <StatusPill label={formatCurrency(booking.price)} tone="accent" />
            </>
          }
          meta={`Booked ${formatDateTime(booking.createdAt)} · Flight date ${formatDateTime(booking.flightDate, 'DD/MM/YYYY')}`}
          extra={
            <RouteBadge
              fromCode={route.departure.code}
              toCode={route.arrival.code}
              fromName={route.departure.name}
              toName={route.arrival.name}
            />
          }
        />
      )}

      {booking && (
        <>
          <SectionCard title="Boarding pass" subtitle="Visual receipt for route and seat confirmation">
            <BoardingPassCard
              bookingId={booking.id}
              flightNumber={booking.flightNumber}
              passengerName={booking.passengerName}
              seatNumber={booking.seatNumber}
              departureCode={route?.departure.code || '--'}
              departureName={route?.departure.name || 'Unknown airport'}
              departureTime={bookingRelatedFlight?.departureDate}
              arrivalCode={route?.arrival.code || '--'}
              arrivalName={route?.arrival.name || 'Unknown airport'}
              arrivalTime={bookingRelatedFlight?.arriveDate}
              flightDate={booking.flightDate}
              price={booking.price}
            />
          </SectionCard>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <SectionCard title="Travel summary" subtitle="Flight and route context">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Flight number">{booking.flightNumber}</Descriptions.Item>
                  <Descriptions.Item label="Route">{route?.verbose}</Descriptions.Item>
                  <Descriptions.Item label="Flight date">{formatDateTime(booking.flightDate, 'DD/MM/YYYY')}</Descriptions.Item>
                  <Descriptions.Item label="Schedule">
                    {`${bookingRelatedFlight ? formatDateTime(bookingRelatedFlight.departureDate, 'HH:mm') : '--:--'} - ${bookingRelatedFlight ? formatDateTime(bookingRelatedFlight.arriveDate, 'HH:mm') : '--:--'}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="Aircraft">
                    {aircraftMap[booking.aircraftId] || `#${booking.aircraftId}`}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    <StatusPill
                      label={bookingStatusLabels[booking.bookingStatus]}
                      tone={getBookingStatusTone(booking.bookingStatus)}
                      subtle
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Seat">{booking.seatNumber}</Descriptions.Item>
                </Descriptions>
              </SectionCard>
            </Col>
            <Col xs={24} xl={12}>
              <SectionCard title="Booking payload" subtitle="Passenger, fare and note">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Passenger">{booking.passengerName}</Descriptions.Item>
                  <Descriptions.Item label="Fare">{formatCurrency(booking.price)}</Descriptions.Item>
                  <Descriptions.Item label="Description">{booking.description || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Created">{formatDateTime(booking.createdAt)}</Descriptions.Item>
                  <Descriptions.Item label="Updated">{formatDateTime(booking.updatedAt)}</Descriptions.Item>
                  <Descriptions.Item label="Canceled at">{formatDateTime(booking.canceledAt)}</Descriptions.Item>
                </Descriptions>
              </SectionCard>
            </Col>
          </Row>
        </>
      )}
    </>
  );
};
