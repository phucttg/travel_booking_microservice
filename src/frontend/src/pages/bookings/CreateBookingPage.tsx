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
  Progress,
  Row,
  Space,
  Steps,
  Table,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bookingApi } from '@api/booking.api';
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
import { useCreateBooking, useGetBookingById } from '@hooks/useBookings';
import { useGetFlightById, useGetFlights } from '@hooks/useFlights';
import { useGetPassengerByUserId } from '@hooks/usePassengers';
import { useGetPaymentById, useGetWalletMe, usePayBookingWithWallet } from '@hooks/usePayments';
import { useGetAvailableSeats } from '@hooks/useSeats';
import { useAuthStore } from '@stores/auth.store';
import { AirportDto } from '@/types/airport.types';
import { BookingCheckoutDto, BookingDto } from '@/types/booking.types';
import { PaginationParams } from '@/types/common.types';
import { BookingStatus, PaymentStatus, SeatClass } from '@/types/enums';
import { FlightDto } from '@/types/flight.types';
import { SeatDto } from '@/types/seat.types';
import {
  bookingStatusLabels,
  formatCurrency,
  paymentStatusLabels,
  seatClassLabels,
  seatTypeLabels
} from '@utils/format';
import { normalizeProblemError } from '@utils/helpers';
import {
  buildSeatGrid,
  buildRouteDescriptor,
  formatDateLabel,
  formatScheduleStrip,
  isFlightBookable,
  getPaymentStatusTone,
  getSeatClassTone,
  getSeatTypeTone
} from '@utils/presentation';

const { TextArea } = Input;
const { Text } = Typography;

type BookingStep = 0 | 1 | 2 | 3 | 4;
type SeatViewMode = 'map' | 'list';
type InlineAlert = {
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  description?: string;
};

const seatClassToCss = (seatClass: SeatClass): string => {
  if (seatClass === SeatClass.FIRST_CLASS) return 'first-class';
  if (seatClass === SeatClass.BUSINESS) return 'business';
  return 'economy';
};

const createIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() || `idempo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const CreateBookingPage = () => {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [searchParams] = useSearchParams();
  const queryBookingId = Number(searchParams.get('bookingId') || 0);
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
  const [selectedFlightId, setSelectedFlightId] = useState<number>(queryBookingId > 0 ? 0 : queryFlightId || 0);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [checkout, setCheckout] = useState<BookingCheckoutDto | null>(null);
  const [createdBooking, setCreatedBooking] = useState<BookingDto | null>(null);
  const [inlineAlert, setInlineAlert] = useState<InlineAlert | null>(null);
  const [resumeWarning, setResumeWarning] = useState<InlineAlert | null>(null);
  const [duplicateBookingId, setDuplicateBookingId] = useState<number | null>(null);
  const [countdownNow, setCountdownNow] = useState<number>(Date.now());
  const [isSyncingConfirmedBooking, setIsSyncingConfirmedBooking] = useState(false);
  const [syncedPaymentId, setSyncedPaymentId] = useState<number | null>(null);
  const [resumeHandledBookingId, setResumeHandledBookingId] = useState<number | null>(null);

  const { getUserIdFromToken } = useAuthStore();
  const currentUserId = getUserIdFromToken() || 0;

  const flightsQuery = useGetFlights(flightParams);
  const bookingDeepLinkQuery = useGetBookingById(queryBookingId);
  const activePaymentId =
    checkout?.payment?.id ||
    (bookingDeepLinkQuery.data?.bookingStatus === BookingStatus.PENDING_PAYMENT
      ? (bookingDeepLinkQuery.data?.paymentId ?? 0)
      : 0);
  const selectedFlightQuery = useGetFlightById(selectedFlightId);
  const seatsQuery = useGetAvailableSeats(selectedFlightId);
  const airportsQuery = useGetAirports();
  const aircraftsQuery = useGetAircrafts();
  const passengerQuery = useGetPassengerByUserId(currentUserId, {
    enabled: queryBookingId <= 0 && step >= 2
  });
  const createBookingMutation = useCreateBooking();
  const walletQuery = useGetWalletMe(true);
  const payBookingWithWalletMutation = usePayBookingWithWallet();
  const paymentQuery = useGetPaymentById(activePaymentId, {
    refetchInterval: step === 3 ? 5000 : false
  });

  const flights = useMemo(() => flightsQuery.data?.data ?? [], [flightsQuery.data]);
  const seats = useMemo(() => seatsQuery.data ?? [], [seatsQuery.data]);
  const passengerAppError = passengerQuery.error ? normalizeProblemError(passengerQuery.error) : null;
  const isPassengerSyncing = !passengerQuery.data && passengerQuery.status === 'pending';

  useEffect(() => {
    if (queryBookingId > 0) {
      return;
    }

    if (!selectedFlightId && queryFlightId > 0) {
      setSelectedFlightId(queryFlightId);
    }
  }, [queryBookingId, queryFlightId, selectedFlightId]);

  useEffect(() => {
    setResumeHandledBookingId(null);
    setResumeWarning(null);
  }, [queryBookingId]);

  useEffect(() => {
    if (queryBookingId <= 0 || resumeHandledBookingId === queryBookingId) {
      return;
    }

    if (bookingDeepLinkQuery.isLoading) {
      return;
    }

    const targetBooking = bookingDeepLinkQuery.data;
    if (!targetBooking) {
      setResumeWarning({
        type: 'warning',
        message: 'Không tìm thấy booking để nạp tiền',
        description: 'Liên kết nạp tiền không hợp lệ hoặc booking đã bị xóa.'
      });
      setResumeHandledBookingId(queryBookingId);
      return;
    }

    if (targetBooking.bookingStatus !== BookingStatus.PENDING_PAYMENT) {
      setResumeWarning({
        type: 'warning',
        message: `Booking #${targetBooking.id} không ở trạng thái chờ thanh toán`,
        description: 'Booking đã confirmed/expired/canceled nên không thể nạp tiền cho lệnh này.'
      });
      setResumeHandledBookingId(queryBookingId);
      return;
    }

    if (!targetBooking.paymentId) {
      setResumeWarning({
        type: 'warning',
        message: `Booking #${targetBooking.id} chưa có lệnh thanh toán`,
        description: 'Booking này thiếu paymentId nên chưa thể vào bước nạp tiền.'
      });
      setResumeHandledBookingId(queryBookingId);
      return;
    }

    if (!targetBooking.flightId) {
      setResumeWarning({
        type: 'warning',
        message: `Booking #${targetBooking.id} thiếu thông tin chuyến bay`,
        description: 'Không thể mở lại màn hình nạp tiền vì booking không có flightId hợp lệ.'
      });
      setResumeHandledBookingId(queryBookingId);
      return;
    }

    if (paymentQuery.isLoading) {
      return;
    }

    const targetPayment = paymentQuery.data;
    if (!targetPayment) {
      setResumeWarning({
        type: 'warning',
        message: `Không tải được lệnh thanh toán của booking #${targetBooking.id}`,
        description: 'Vui lòng thử lại sau hoặc liên hệ vận hành để kiểm tra payment intent.'
      });
      setResumeHandledBookingId(queryBookingId);
      return;
    }

    setCheckout({
      booking: targetBooking,
      payment: targetPayment
    });
    setSelectedFlightId(targetBooking.flightId);
    setSelectedSeatNumber(targetBooking.seatNumber || null);
    setStep(3);
    setResumeWarning(null);
    setInlineAlert({
      type: 'info',
      message: `Đang nạp tiền cho booking #${targetBooking.id}`,
      description: 'Bạn có thể thanh toán ngay bằng số dư ví nếu đủ tiền.'
    });
    setResumeHandledBookingId(queryBookingId);
  }, [
    bookingDeepLinkQuery.data,
    bookingDeepLinkQuery.isLoading,
    paymentQuery.data,
    paymentQuery.isLoading,
    queryBookingId,
    resumeHandledBookingId
  ]);

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
  const currentPayment = paymentQuery.data || checkout?.payment || null;

  const seatGrid = useMemo(() => buildSeatGrid(seats), [seats]);
  const paymentExpiresAt = currentPayment?.expiresAt ? new Date(currentPayment.expiresAt).valueOf() : null;
  const countdownMs = paymentExpiresAt ? Math.max(0, paymentExpiresAt - countdownNow) : 0;
  const countdownMinutes = Math.floor(countdownMs / 60000);
  const countdownSeconds = Math.floor((countdownMs % 60000) / 1000);
  const paymentWindowProgress = paymentExpiresAt
    ? Math.max(0, Math.min(100, (countdownMs / (15 * 60 * 1000)) * 100))
    : 0;

  useEffect(() => {
    if (selectedFlight && !selectedFlightIsBookable && step > 0) {
      setStep(0);
      setSelectedSeatNumber(null);
    }
  }, [selectedFlight, selectedFlightIsBookable, step]);

  useEffect(() => {
    if (step !== 3 || !paymentExpiresAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [step, paymentExpiresAt]);

  useEffect(() => {
    if (!currentPayment) {
      return;
    }

    if (currentPayment.paymentStatus === PaymentStatus.EXPIRED) {
      setInlineAlert({
        type: 'warning',
        message: 'Phiên thanh toán đã hết hạn',
        description: 'Ghế sẽ được giải phóng và bạn cần tạo checkout mới nếu muốn tiếp tục.'
      });
    }
  }, [currentPayment]);

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
      render: (_, record) => formatCurrency(record.price, record.currency)
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

    setInlineAlert(null);
    setDuplicateBookingId(null);

    try {
      const response = await createBookingMutation.mutateAsync({
        payload: {
          flightId: selectedFlight.id,
          description: description.trim() || 'N/A',
          seatNumber: selectedSeatNumber || undefined
        },
        idempotencyKey: createIdempotencyKey()
      });

      setCheckout(response);
      setCreatedBooking(null);
      setIsSyncingConfirmedBooking(false);
      setSyncedPaymentId(null);
      setStep(3);
      setInlineAlert({
        type: 'info',
        message: 'Giữ chỗ thành công',
        description: 'Ghế đã được giữ và checkout đang chờ bạn hoàn tất thanh toán.'
      });
    } catch (error) {
      const appError = normalizeProblemError(error);
      const existingBookingId = Number(appError.meta?.existingBookingId || 0);

      if (existingBookingId > 0) {
        setDuplicateBookingId(existingBookingId);
      }
    }
  };

  const waitForConfirmedBooking = async (bookingId: number): Promise<BookingDto | null> => {
    let latestBooking: BookingDto | null = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await bookingApi.getById(bookingId);
      latestBooking = response.data;

      if (latestBooking.bookingStatus === BookingStatus.CONFIRMED) {
        return latestBooking;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 300));
    }

    return latestBooking;
  };

  useEffect(() => {
    if (step !== 3 || !checkout || !currentPayment) {
      return;
    }

    if (currentPayment.paymentStatus !== PaymentStatus.SUCCEEDED || isSyncingConfirmedBooking) {
      return;
    }

    if (syncedPaymentId === currentPayment.id) {
      return;
    }

    setIsSyncingConfirmedBooking(true);
    setSyncedPaymentId(currentPayment.id);
    setInlineAlert({
      type: 'info',
      message: 'Đã nhận thanh toán, đang đồng bộ trạng thái booking',
      description: 'Hệ thống đang chờ sự kiện xác nhận từ payment service.'
    });

    void (async () => {
      const syncedBooking = await waitForConfirmedBooking(checkout.booking.id);

      if (syncedBooking?.bookingStatus === BookingStatus.CONFIRMED) {
        setCreatedBooking(syncedBooking);
        setStep(4);
        setIsSyncingConfirmedBooking(false);
        return;
      }

      setInlineAlert({
        type: 'info',
        message: 'Thanh toán đã thành công, đang chờ booking xác nhận',
        description: 'Sự kiện xác nhận đang được đồng bộ. Bạn có thể thử kiểm tra lại ngay.'
      });
      setIsSyncingConfirmedBooking(false);
    })();
  }, [checkout, currentPayment, isSyncingConfirmedBooking, step, syncedPaymentId]);

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
            {isPassengerSyncing ? (
              <Alert
                type="info"
                showIcon
                message="Đang đồng bộ hồ sơ hành khách"
                description="Hệ thống đang chờ passenger profile được đồng bộ từ identity service."
              />
            ) : passengerQuery.data ? (
              <Text>{`${passengerQuery.data.name} · Passport ${passengerQuery.data.passportNumber}`}</Text>
            ) : (
              <Alert
                type="error"
                showIcon
                message={
                  passengerAppError?.status === 404
                    ? 'Không tìm thấy passenger tương ứng user hiện tại'
                    : passengerAppError?.message || 'Không thể tải hồ sơ hành khách hiện tại'
                }
                description={
                  passengerAppError?.status === 404
                    ? 'Passenger được đồng bộ từ UserCreated event. Vui lòng thử lại sau ít giây nếu bạn vừa đăng ký.'
                    : 'Vui lòng thử lại sau hoặc kiểm tra passenger service.'
                }
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
              <Text strong>{formatCurrency(selectedSeat?.price || selectedFlight.price, selectedSeat?.currency || 'VND')}</Text>
            </Space>
          </Card>
        )}

        {duplicateBookingId && (
          <Alert
            type="warning"
            showIcon
            message="Bạn đã có booking đang hoạt động cho chuyến bay này"
            description={
              <Space wrap>
                <Text type="secondary">{`Booking #${duplicateBookingId} đang chờ xử lý hoặc đã confirmed.`}</Text>
                <Button type="link" onClick={() => navigate(`/bookings/${duplicateBookingId}`)}>
                  Mở booking hiện có
                </Button>
              </Space>
            }
          />
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
            disabled={isPassengerSyncing || !passengerQuery.data?.id || !selectedFlight || !selectedFlightIsBookable}
            onClick={handleSubmitBooking}
          >
            Tiếp tục thanh toán ví
          </Button>
        </Space>
      </Space>
    </SectionCard>
  );

  const renderPaymentStep = () => {
    if (!checkout) {
      return <EmptyState title="Checkout missing" description="Không tìm thấy phiên checkout đang chờ thanh toán." />;
    }

    const payment = currentPayment || checkout.payment;
    const paymentExpired = payment.paymentStatus === PaymentStatus.EXPIRED || countdownMs <= 0;
    const isResumedCheckout = queryBookingId > 0 && checkout.booking.id === queryBookingId;
    const walletBalance = Number(walletQuery.data?.balance || 0);
    const walletCurrency = walletQuery.data?.currency || payment.currency;
    const isWalletSufficient = walletBalance >= Number(payment.amount || 0);

    return (
      <SectionCard title="Thanh toán" subtitle="Step 4 · Confirm the locked amount before the hold expires">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {inlineAlert && (
            <Alert
              type={inlineAlert.type}
              showIcon
              message={inlineAlert.message}
              description={inlineAlert.description}
            />
          )}

          <Card className="app-surface" style={{ borderRadius: 20 }}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Text strong>Locked total</Text>
              <Text style={{ fontSize: 28, fontWeight: 700 }}>{formatCurrency(payment.amount, payment.currency)}</Text>
              <Space wrap>
                <StatusPill label={paymentStatusLabels[payment.paymentStatus]} tone={getPaymentStatusTone(payment.paymentStatus)} />
                <StatusPill label={`Seat ${checkout.booking.seatNumber}`} tone="accent" subtle />
                <StatusPill label={seatClassLabels[checkout.booking.seatClass]} tone={getSeatClassTone(checkout.booking.seatClass)} subtle />
              </Space>
            </Space>
          </Card>

          <Card className="app-surface" style={{ borderRadius: 20 }}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Text strong>Payment window</Text>
              <Text type="secondary">{`Hết hạn sau ${String(countdownMinutes).padStart(2, '0')}:${String(countdownSeconds).padStart(2, '0')}`}</Text>
              <Progress percent={paymentWindowProgress} showInfo={false} strokeColor="#1d4ed8" />
            </Space>
          </Card>

          <Card className="app-surface" style={{ borderRadius: 20 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Text strong>Thanh toán bằng ví</Text>
              <Text type="secondary">Booking sẽ được xác nhận ngay khi ví đủ tiền và thanh toán thành công.</Text>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Text>{`Số dư ví hiện tại: ${formatCurrency(walletBalance, walletCurrency)}`}</Text>
                <Text>{`Số tiền cần thanh toán: ${formatCurrency(payment.amount, payment.currency)}`}</Text>
                <StatusPill
                  label={isWalletSufficient ? 'Ví đủ tiền' : 'Ví không đủ tiền'}
                  tone={isWalletSufficient ? 'success' : 'warning'}
                  subtle
                />
              </Space>
              {!isWalletSufficient && (
                <Alert
                  type="warning"
                  showIcon
                  message="Số dư ví không đủ để thanh toán booking này"
                  description="Vui lòng nạp thêm ví trước khi thanh toán."
                />
              )}
            </Space>
          </Card>

          <Space wrap>
            <Button
              onClick={() => {
                if (isResumedCheckout) {
                  navigate(`/bookings/${checkout.booking.id}`);
                  return;
                }

                setStep(2);
              }}
            >
              {isResumedCheckout ? 'Về chi tiết booking' : 'Quay lại review'}
            </Button>
            <Button onClick={() => walletQuery.refetch()} loading={walletQuery.isFetching}>
              Refresh ví
            </Button>
            {!isWalletSufficient ? (
              <Button type="primary" onClick={() => navigate('/wallet')}>
                Nạp ví
              </Button>
            ) : (
              <Button
                type="primary"
                loading={payBookingWithWalletMutation.isPending}
                disabled={paymentExpired || !checkout.payment.id}
                onClick={async () => {
                  if (!payment.id) {
                    return;
                  }

                  await payBookingWithWalletMutation.mutateAsync({ paymentId: payment.id });
                  setInlineAlert({
                    type: 'info',
                    message: 'Thanh toán ví thành công, đang đồng bộ booking',
                    description: 'Hệ thống đang cập nhật trạng thái xác nhận booking.'
                  });
                  await paymentQuery.refetch();
                }}
              >
                Thanh toán bằng ví
              </Button>
            )}
            <Button onClick={() => paymentQuery.refetch()} disabled={!checkout.payment.id}>
              Kiểm tra lại payment
            </Button>
          </Space>
        </Space>
      </SectionCard>
    );
  };

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
              <StatusPill label={bookingStatusLabels[createdBooking.bookingStatus]} tone="success" />
              <StatusPill label={formatCurrency(createdBooking.price, createdBooking.currency)} tone="accent" />
            </>
          }
        />

        <SectionCard title="Boarding pass" subtitle="Step 5 · Booking confirmation">
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
                setCheckout(null);
                setStep(0);
                setSelectedSeatNumber(null);
                setDescription('');
                setInlineAlert(null);
                setIsSyncingConfirmedBooking(false);
                setSyncedPaymentId(null);
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
        eyebrow={step === 4 ? 'Booking completed' : 'Checkout flow'}
        title={step === 4 ? 'Đặt vé thành công' : 'Đặt vé mới'}
        subtitle="Flow 5 bước với seat-aware pricing, pending payment state và boarding pass chỉ hiện sau khi payment thành công."
        meta={selectedFlight ? `${selectedFlight.flightNumber} · ${formatDateLabel(selectedFlight.flightDate)}` : 'Select a flight to begin'}
      />

      <SectionCard title="Booking steps" subtitle="Checkout-inspired flow for route, seat, payment and confirmation">
        <Steps
          current={step}
          items={[
            { title: 'Chọn chuyến bay', description: 'Route & schedule', icon: <RocketOutlined /> },
            { title: 'Chọn ghế', description: 'Cabin & preference', icon: <TeamOutlined /> },
            { title: 'Xác nhận', description: 'Review & note', icon: <FileSearchOutlined /> },
            { title: 'Thanh toán', description: 'Locked amount', icon: <FileSearchOutlined /> },
            { title: 'Hoàn tất', description: 'Boarding pass', icon: <CheckCircleOutlined /> }
          ]}
        />
      </SectionCard>

      {resumeWarning && (
        <Alert
          type={resumeWarning.type}
          showIcon
          message={resumeWarning.message}
          description={resumeWarning.description}
          style={{ marginBottom: 16 }}
        />
      )}

      {step === 4 ? (
        renderSuccessStep()
      ) : (
        <Row gutter={[16, 16]} align="top">
          <Col xs={24} lg={15} xl={16}>
            {step === 0 && renderFlightSelection()}
            {step === 1 && renderSeatSelection()}
            {step === 2 && renderReviewStep()}
            {step === 3 && renderPaymentStep()}
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
                          ? `Seat ${selectedSeat.seatNumber} selected · ${seatClassLabels[selectedSeat.seatClass]} / ${seatTypeLabels[selectedSeat.seatType]} · ${formatCurrency(selectedSeat.price, selectedSeat.currency)}`
                          : 'Seat selection pending'}
                      </Text>
                      <Text type="secondary">
                        {passengerQuery.data
                          ? `Passenger linked · ${passengerQuery.data.name}`
                          : 'Passenger profile missing'}
                      </Text>
                      {checkout?.payment && (
                        <Text type="secondary">
                          {`Payment ${paymentStatusLabels[(currentPayment || checkout.payment).paymentStatus]}`}
                        </Text>
                      )}
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
