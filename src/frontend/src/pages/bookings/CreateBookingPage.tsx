import {
  CheckCircleOutlined,
  FileSearchOutlined,
  RocketOutlined,
  TeamOutlined
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Grid,
  Input,
  Pagination,
  Row,
  Space,
  Steps,
  Table,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BoardingPassCard } from '@components/booking/BoardingPassCard';
import { BookingSummary } from '@components/booking/BookingSummary';
import { FlightCard } from '@components/booking/FlightCard';
import { EmptyState } from '@components/common/EmptyState';
import { EntityHero } from '@components/common/EntityHero';
import { PageHeader } from '@components/common/PageHeader';
import { SeatMapVisual } from '@components/common/SeatMapVisual';
import { SectionCard } from '@components/common/SectionCard';
import { StatusPill } from '@components/common/StatusPill';
import { useGetAircrafts } from '@hooks/useAircrafts';
import { useGetAirports } from '@hooks/useAirports';
import { useCreateBooking, useGetBookings } from '@hooks/useBookings';
import { useGetFlightById, useGetFlights } from '@hooks/useFlights';
import { useGetPassengerByUserId } from '@hooks/usePassengers';
import { useGetAvailableSeats } from '@hooks/useSeats';
import { useAuthStore } from '@stores/auth.store';
import { AirportDto } from '@/types/airport.types';
import { BookingDto } from '@/types/booking.types';
import { PaginationParams } from '@/types/common.types';
import { SeatClass } from '@/types/enums';
import { FlightDto } from '@/types/flight.types';
import { SeatDto } from '@/types/seat.types';
import { formatCurrency, seatClassLabels, seatTypeLabels } from '@utils/format';
import {
  buildSeatGrid,
  buildRouteDescriptor,
  formatDateLabel,
  formatScheduleStrip,
  isFlightBookable,
  getSeatClassTone,
  getSeatTypeTone
} from '@utils/presentation';

const { TextArea } = Input;
const { Text } = Typography;

type BookingStep = 0 | 1 | 2 | 3;
type SeatViewMode = 'map' | 'list';

const seatClassToCss = (seatClass: SeatClass): string => {
  if (seatClass === SeatClass.FIRST_CLASS) return 'first-class';
  if (seatClass === SeatClass.BUSINESS) return 'business';
  return 'economy';
};

export const CreateBookingPage = () => {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [searchParams] = useSearchParams();
  const queryFlightId = Number(searchParams.get('flightId') || 0);

  const [step, setStep] = useState<BookingStep>(0);
  const [seatViewMode, setSeatViewMode] = useState<SeatViewMode>('map');
  const [flightParams, setFlightParams] = useState<PaginationParams>({
    page: 1,
    pageSize: 5,
    order: 'ASC',
    orderBy: 'flightDate',
    searchTerm: ''
  });
  const [selectedFlightId, setSelectedFlightId] = useState<number>(queryFlightId || 0);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [createdBooking, setCreatedBooking] = useState<BookingDto | null>(null);

  const { getUserIdFromToken } = useAuthStore();
  const currentUserId = getUserIdFromToken() || 0;

  const flightsQuery = useGetFlights(flightParams);
  const selectedFlightQuery = useGetFlightById(selectedFlightId);
  const seatsQuery = useGetAvailableSeats(selectedFlightId);
  const airportsQuery = useGetAirports();
  const aircraftsQuery = useGetAircrafts();
  const passengerQuery = useGetPassengerByUserId(currentUserId);
  const createBookingMutation = useCreateBooking();
  const latestBookingsQuery = useGetBookings({
    page: 1,
    pageSize: 1,
    order: 'DESC',
    orderBy: 'id'
  });

  const flights = useMemo(() => flightsQuery.data?.data ?? [], [flightsQuery.data]);
  const seats = useMemo(() => seatsQuery.data ?? [], [seatsQuery.data]);

  useEffect(() => {
    if (!selectedFlightId && queryFlightId > 0) {
      setSelectedFlightId(queryFlightId);
    }
  }, [queryFlightId, selectedFlightId]);

  const airportMap = useMemo<Record<number, AirportDto>>(
    () => Object.fromEntries((airportsQuery.data ?? []).map((item) => [item.id, item])) as Record<number, AirportDto>,
    [airportsQuery.data]
  );

  const aircraftMap = useMemo(
    () => Object.fromEntries((aircraftsQuery.data || []).map((item) => [item.id, item.name])) as Record<number, string>,
    [aircraftsQuery.data]
  );

  const selectedFlight = useMemo(() => {
    const fromList = flights.find((flight) => flight.id === selectedFlightId);
    if (fromList) return fromList;
    if (selectedFlightQuery.data?.id === selectedFlightId) return selectedFlightQuery.data;
    return null;
  }, [flights, selectedFlightId, selectedFlightQuery.data]);

  const selectedSeat = useMemo(
    () => seats.find((seat) => seat.seatNumber === selectedSeatNumber) || null,
    [seats, selectedSeatNumber]
  );
  const selectedFlightIsBookable = isFlightBookable(selectedFlight);

  const seatGrid = useMemo(() => buildSeatGrid(seats), [seats]);

  useEffect(() => {
    if (selectedFlight && !selectedFlightIsBookable && step > 0) {
      setStep(0);
      setSelectedSeatNumber(null);
    }
  }, [selectedFlight, selectedFlightIsBookable, step]);

  const seatColumns: ColumnsType<SeatDto> = [
    {
      title: 'Seat',
      dataIndex: 'seatNumber',
      key: 'seatNumber',
      render: (value: string) => (
        <Text style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{value}</Text>
      )
    },
    {
      title: 'Class',
      key: 'classType',
      render: (_, record) => `${seatClassLabels[record.seatClass]} / ${seatTypeLabels[record.seatType]}`
    },
    {
      title: 'Fare',
      key: 'price',
      render: () => formatCurrency(selectedFlight?.price || 0)
    }
  ];

  const handleFlightPageChange = (page: number, pageSize: number) => {
    setFlightParams((prev) => ({
      ...prev,
      page,
      pageSize
    }));
  };

  const handleSubmitBooking = async () => {
    if (!selectedFlight || !passengerQuery.data?.id || !selectedFlightIsBookable) return;

    const response = await createBookingMutation.mutateAsync({
      flightId: selectedFlight.id,
      description: description.trim() || 'N/A',
      seatNumber: selectedSeatNumber || undefined
    });

    const finalBooking = response?.id ? response : latestBookingsQuery.data?.data?.[0] || null;
    if (!finalBooking) {
      return;
    }

    setCreatedBooking(finalBooking);
    setStep(3);
  };

  const renderFlightSelection = () => (
    <SectionCard title="Chọn chuyến bay" subtitle="Step 1 · Select a route with the right schedule and fare">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {selectedFlightId > 0 && selectedFlight && !selectedFlightIsBookable && (
          <Alert
            type="warning"
            showIcon
            message="Chuyến bay từ deep link hiện không còn mở đặt vé"
            description="Vui lòng chọn một chuyến bay khác có trạng thái Scheduled hoặc Delayed và chưa quá giờ khởi hành."
          />
        )}

        {flights.map((flight: FlightDto) => (
          <FlightCard
            key={flight.id}
            flight={flight}
            airportsMap={airportMap}
            aircraftName={aircraftMap[flight.aircraftId]}
            actionSlot={
              <Button
                type="primary"
                size="large"
                disabled={!isFlightBookable(flight)}
                onClick={() => {
                  setSelectedFlightId(flight.id);
                  setSelectedSeatNumber(null);
                  setStep(1);
                }}
              >
                {isFlightBookable(flight) ? 'Chọn chuyến' : 'Không thể đặt'}
              </Button>
            }
          />
        ))}

        {!flightsQuery.isLoading && flights.length === 0 && <Empty description="Không có chuyến bay" />}

        <Pagination
          current={flightsQuery.data?.page || 1}
          pageSize={flightsQuery.data?.pageSize || 5}
          total={flightsQuery.data?.total || 0}
          showSizeChanger
          pageSizeOptions={['5', '10', '20']}
          onChange={handleFlightPageChange}
        />
      </Space>
    </SectionCard>
  );

  const renderSeatSelection = () => {
    if (!selectedFlight) {
      return <EmptyState title="Select a flight first" description="Vui lòng chọn chuyến bay ở bước trước." />;
    }

    if (!selectedFlightIsBookable) {
      return (
        <SectionCard title="Chọn ghế" subtitle="Step 2 · Flight is no longer bookable">
          <Alert
            type="warning"
            showIcon
            message="Chuyến bay này không còn mở đặt vé"
            description="Quay lại bước trước để chọn chuyến bay hợp lệ."
          />
          <Space style={{ marginTop: 16 }}>
            <Button onClick={() => setStep(0)}>Quay lại</Button>
          </Space>
        </SectionCard>
      );
    }

    const route = buildRouteDescriptor(
      airportMap[selectedFlight.departureAirportId],
      airportMap[selectedFlight.arriveAirportId],
      selectedFlight.departureAirportId,
      selectedFlight.arriveAirportId
    );

    return (
      <SectionCard
        title="Chọn ghế"
        subtitle={`Step 2 · ${selectedFlight.flightNumber} · ${route.compact} · ${formatDateLabel(selectedFlight.flightDate)}`}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {!seats.length && !seatsQuery.isLoading && (
            <Alert type="warning" showIcon message="Không có ghế trống cho chuyến bay này." />
          )}

          <Space wrap>
            <Text type="secondary">View:</Text>
            <Button type={seatViewMode === 'map' ? 'primary' : 'default'} onClick={() => setSeatViewMode('map')}>
              Seat map
            </Button>
            <Button type={seatViewMode === 'list' ? 'primary' : 'default'} onClick={() => setSeatViewMode('list')}>
              Grid/List
            </Button>
          </Space>

          <Space wrap size={[12, 8]}>
            <Text type="secondary">Legend:</Text>
            <StatusPill label="Available" tone="success" subtle />
            <StatusPill label="Selected" tone="accent" subtle />
            <StatusPill label="Business" tone="info" subtle />
            <StatusPill label="First class" tone="warning" subtle />
          </Space>

          {seatViewMode === 'map' ? (
            <SeatMapVisual seats={seats} selectedSeatNumber={selectedSeatNumber} onSelectSeat={setSelectedSeatNumber} />
          ) : seatGrid.isGrid ? (
            <div className="booking-seat-grid">
              {seatGrid.rows.map((row) => (
                <div key={row.rowKey} className="booking-seat-row">
                  <Text strong>{`Row ${row.rowKey}`}</Text>
                  <div className="booking-seat-row__seats">
                    {row.seats.map((seat, index) =>
                      seat ? (
                        <Button
                          key={seat.id}
                          className={[
                            'booking-seat-button',
                            seatClassToCss(seat.seatClass),
                            selectedSeatNumber === seat.seatNumber ? 'selected' : ''
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => setSelectedSeatNumber(seat.seatNumber)}
                        >
                          {seat.seatNumber}
                        </Button>
                      ) : (
                        <span key={`${row.rowKey}-${index}`} style={{ width: 64, height: 40 }} />
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {seats.map((seat) => (
                <Card key={seat.id} className="app-surface" style={{ borderRadius: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <Space direction="vertical" size={8}>
                      <Text style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                        {seat.seatNumber}
                      </Text>
                      <Space wrap>
                        <StatusPill label={seatClassLabels[seat.seatClass]} tone={getSeatClassTone(seat.seatClass)} subtle />
                        <StatusPill label={seatTypeLabels[seat.seatType]} tone={getSeatTypeTone(seat.seatType)} subtle />
                      </Space>
                    </Space>
                    <Button
                      type={selectedSeatNumber === seat.seatNumber ? 'primary' : 'default'}
                      onClick={() => setSelectedSeatNumber(seat.seatNumber)}
                    >
                      {selectedSeatNumber === seat.seatNumber ? 'Đã chọn' : 'Chọn ghế'}
                    </Button>
                  </div>
                </Card>
              ))}
            </Space>
          )}

          <Table<SeatDto>
            rowKey="id"
            loading={seatsQuery.isLoading}
            columns={seatColumns}
            dataSource={seats}
            pagination={false}
            scroll={{ x: 640 }}
          />

          <Space>
            <Button onClick={() => setStep(0)}>Quay lại</Button>
            <Button
              type="primary"
              disabled={!selectedSeatNumber || seats.length === 0 || !selectedFlightIsBookable}
              onClick={() => setStep(2)}
            >
              Tiếp tục review
            </Button>
          </Space>
        </Space>
      </SectionCard>
    );
  };

  const renderReviewStep = () => (
    <SectionCard title="Xác nhận đặt vé" subtitle="Step 3 · Review passenger, seat and note before submit">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card className="app-surface" style={{ borderRadius: 20 }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Text strong>Passenger profile</Text>
            {passengerQuery.data ? (
              <Text>{`${passengerQuery.data.name} · Passport ${passengerQuery.data.passportNumber}`}</Text>
            ) : (
              <Alert
                type="error"
                showIcon
                message="Không tìm thấy passenger tương ứng user hiện tại"
                description="Passenger được đồng bộ từ UserCreated event. Vui lòng đảm bảo passenger service đã chạy và identity service đã publish seed event."
              />
            )}
          </Space>
        </Card>

        {selectedFlight && (
          <Card className="app-surface" style={{ borderRadius: 20 }}>
            <Space direction="vertical" size={8}>
              <Text strong>Fare briefing</Text>
              <Text type="secondary">
                {`${selectedFlight.flightNumber} · ${formatDateLabel(selectedFlight.flightDate)} · ${formatScheduleStrip(selectedFlight.departureDate, selectedFlight.arriveDate)}`}
              </Text>
              <Text strong>{formatCurrency(selectedFlight.price)}</Text>
            </Space>
          </Card>
        )}

        <Card className="app-surface" style={{ borderRadius: 20 }} title="Notes">
          <TextArea
            rows={5}
            placeholder="Ghi chú thêm cho booking..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Card>

        <Space>
          <Button onClick={() => setStep(1)}>Quay lại</Button>
          <Button
            type="primary"
            loading={createBookingMutation.isPending}
            disabled={!passengerQuery.data?.id || !selectedFlight || !selectedFlightIsBookable}
            onClick={handleSubmitBooking}
          >
            Đặt vé ngay
          </Button>
        </Space>
      </Space>
    </SectionCard>
  );

  const renderSuccessStep = () => {
    if (!createdBooking) {
      return <EmptyState title="Booking not found" description="Không tìm thấy booking vừa tạo." />;
    }

    const route = buildRouteDescriptor(
      airportMap[createdBooking.departureAirportId],
      airportMap[createdBooking.arriveAirportId],
      createdBooking.departureAirportId,
      createdBooking.arriveAirportId
    );

    return (
      <div className="booking-success-card">
        <EntityHero
          eyebrow="Receipt"
          title={`Booking #${createdBooking.id}`}
          subtitle={`Flight ${createdBooking.flightNumber} · Seat ${createdBooking.seatNumber} · Passenger ${createdBooking.passengerName}`}
          tags={
            <>
              <StatusPill label="Confirmed" tone="success" />
              <StatusPill label={formatCurrency(createdBooking.price)} tone="accent" />
            </>
          }
        />

        <SectionCard title="Boarding pass" subtitle="Step 4 · Booking confirmation">
          <BoardingPassCard
            bookingId={createdBooking.id}
            flightNumber={createdBooking.flightNumber}
            passengerName={createdBooking.passengerName}
            seatNumber={createdBooking.seatNumber}
            departureCode={route.departure.code}
            departureName={route.departure.name}
            departureTime={selectedFlight?.departureDate}
            arrivalCode={route.arrival.code}
            arrivalName={route.arrival.name}
            arrivalTime={selectedFlight?.arriveDate}
            flightDate={createdBooking.flightDate}
            price={createdBooking.price}
          />

          <Space style={{ marginTop: 16 }}>
            <Button type="primary" size="large" onClick={() => navigate(`/bookings/${createdBooking.id}`)}>
              Xem chi tiết booking
            </Button>
            <Button
              size="large"
              onClick={() => {
                setCreatedBooking(null);
                setStep(0);
                setSelectedSeatNumber(null);
                setDescription('');
              }}
            >
              Đặt thêm vé
            </Button>
          </Space>
        </SectionCard>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow={step === 3 ? 'Booking completed' : 'Checkout flow'}
        title={step === 3 ? 'Đặt vé thành công' : 'Đặt vé mới'}
        subtitle="Flow 4 bước với summary sidebar, seat selection trực quan và boarding pass ở bước hoàn tất."
        meta={selectedFlight ? `${selectedFlight.flightNumber} · ${formatDateLabel(selectedFlight.flightDate)}` : 'Select a flight to begin'}
      />

      <SectionCard title="Booking steps" subtitle="Checkout-inspired flow for route, seat and confirmation">
        <Steps
          current={step}
          items={[
            { title: 'Chọn chuyến bay', description: 'Route & schedule', icon: <RocketOutlined /> },
            { title: 'Chọn ghế', description: 'Cabin & preference', icon: <TeamOutlined /> },
            { title: 'Xác nhận', description: 'Review & note', icon: <FileSearchOutlined /> },
            { title: 'Hoàn tất', description: 'Boarding pass', icon: <CheckCircleOutlined /> }
          ]}
        />
      </SectionCard>

      {step === 3 ? (
        renderSuccessStep()
      ) : (
        <Row gutter={[16, 16]} align="top">
          <Col xs={24} lg={15} xl={16}>
            {step === 0 && renderFlightSelection()}
            {step === 1 && renderSeatSelection()}
            {step === 2 && renderReviewStep()}
          </Col>

          <Col xs={24} lg={9} xl={8}>
            <div style={screens.lg ? { position: 'sticky', top: 108 } : undefined}>
              {selectedFlight ? (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <BookingSummary
                    flight={selectedFlight}
                    selectedSeat={selectedSeat}
                    passenger={passengerQuery.data}
                    airportsMap={airportMap}
                  />
                  <Card className="app-surface" style={{ borderRadius: 24 }}>
                    <Space direction="vertical" size={8}>
                      <Text className="page-eyebrow">Flow notes</Text>
                      <Text type="secondary">
                        {selectedSeat
                          ? `Seat ${selectedSeat.seatNumber} selected · ${seatClassLabels[selectedSeat.seatClass]} / ${seatTypeLabels[selectedSeat.seatType]}`
                          : 'Seat selection pending'}
                      </Text>
                      <Text type="secondary">
                        {passengerQuery.data
                          ? `Passenger linked · ${passengerQuery.data.name}`
                          : 'Passenger profile missing'}
                      </Text>
                    </Space>
                  </Card>
                </Space>
              ) : (
                <EmptyState
                  title="Awaiting selection"
                  description="Chọn chuyến bay ở bước đầu để xem summary checkout."
                />
              )}
            </div>
          </Col>
        </Row>
      )}
    </>
  );
};
