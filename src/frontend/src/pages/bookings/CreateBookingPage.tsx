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
  message,
  Pagination,
  Progress,
  Row,
  Space,
  Steps,
  Table,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBeforeUnload, useNavigate, useSearchParams } from 'react-router-dom';
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
import { AppError, PaginationParams } from '@/types/common.types';
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
type PostPaymentSyncState = 'idle' | 'syncing' | 'timed_out';
type SelectedSeatSummary = Pick<SeatDto, 'seatNumber' | 'seatClass' | 'price' | 'currency'> &
  Partial<Pick<SeatDto, 'seatType'>>;
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
const PREMIUM_SEAT_SELECTION_REQUIRED_CODE = 'PREMIUM_SEAT_SELECTION_REQUIRED';
const PREMIUM_SEAT_SELECTION_REQUIRED_MESSAGE =
  'Economy seats are sold out. Please select a premium seat to continue.';
const ACTIVE_BOOKING_EXISTS_CODE = 'ACTIVE_BOOKING_EXISTS';
const BOOKING_SYNC_INTERVAL_MS = 1000;
const BOOKING_SYNC_TIMEOUT_MS = 45000;

const parseStatusFromMeta = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const getCreateBookingResponseData = (appError: AppError): Record<string, unknown> | null => {
  if (
    typeof appError.raw === 'object' &&
    appError.raw !== null &&
    'response' in appError.raw &&
    typeof (appError.raw as { response?: { data?: unknown } }).response?.data === 'object' &&
    (appError.raw as { response?: { data?: unknown } }).response?.data !== null
  ) {
    return (appError.raw as { response?: { data?: Record<string, unknown> } }).response?.data as Record<string, unknown>;
  }

  return null;
};

const getCreateBookingMetaValue = (appError: AppError, key: string): unknown => {
  const rawResponseData = getCreateBookingResponseData(appError);
  if (rawResponseData && key in rawResponseData) {
    return rawResponseData[key];
  }

  return appError.meta?.[key];
};

const getCreateBookingBusinessCode = (appError: AppError): string => {
  const rawResponseData = getCreateBookingResponseData(appError);

  if (typeof rawResponseData?.code === 'string' && rawResponseData.code) {
    return rawResponseData.code;
  }

  if (typeof appError.meta?.code === 'string' && appError.meta.code) {
    return appError.meta.code;
  }

  return appError.code || '';
};

const getCreateBookingBusinessMessage = (appError: AppError): string => {
  const rawResponseData = getCreateBookingResponseData(appError);

  if (typeof rawResponseData?.title === 'string' && rawResponseData.title) {
    return rawResponseData.title;
  }

  if (typeof rawResponseData?.message === 'string' && rawResponseData.message) {
    return rawResponseData.message;
  }

  if (appError.message && !appError.message.startsWith('Request failed with status code ')) {
    return appError.message;
  }

  return '';
};

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
  const [seatSelectionAlert, setSeatSelectionAlert] = useState<InlineAlert | null>(null);
  const [resumeWarning, setResumeWarning] = useState<InlineAlert | null>(null);
  const [duplicateBookingId, setDuplicateBookingId] = useState<number | null>(null);
  const [countdownNow, setCountdownNow] = useState<number>(Date.now());
  const [postPaymentSyncState, setPostPaymentSyncState] = useState<PostPaymentSyncState>('idle');
  const [syncStartedAt, setSyncStartedAt] = useState<number | null>(null);
  const [resumeHandledBookingId, setResumeHandledBookingId] = useState<number | null>(null);

  const { getUserIdFromToken } = useAuthStore();
  const currentUserId = getUserIdFromToken() || 0;

  const flightsQuery = useGetFlights(flightParams);
  const bookingDeepLinkQuery = useGetBookingById(queryBookingId);
  const flights = useMemo(() => flightsQuery.data?.data ?? [], [flightsQuery.data]);
  const selectedFlightFromCurrentPage = useMemo(
    () => flights.find((flight) => flight.id === selectedFlightId) || null,
    [flights, selectedFlightId]
  );
  const activePaymentId =
    checkout?.payment?.id ||
    (bookingDeepLinkQuery.data?.bookingStatus === BookingStatus.PENDING_PAYMENT
      ? (bookingDeepLinkQuery.data?.paymentId ?? 0)
      : 0);
  const shouldFetchSelectedFlightDetail =
    selectedFlightId > 0 && !selectedFlightFromCurrentPage && !flightsQuery.isLoading;
  const shouldFetchSeatInventory = selectedFlightId > 0 && step === 1;
  const shouldFetchAircraftCatalog = step === 0;
  const shouldFetchWallet = step === 3 && Boolean(checkout);
  const shouldFetchPayment = activePaymentId > 0;

  const selectedFlightQuery = useGetFlightById(selectedFlightId, {
    enabled: shouldFetchSelectedFlightDetail
  });
  const seatsQuery = useGetAvailableSeats(selectedFlightId, {
    enabled: shouldFetchSeatInventory
  });
  const airportsQuery = useGetAirports();
  const aircraftsQuery = useGetAircrafts({
    enabled: shouldFetchAircraftCatalog
  });
  const passengerQuery = useGetPassengerByUserId(currentUserId, {
    enabled: queryBookingId <= 0 && step >= 2
  });
  const createBookingMutation = useCreateBooking();
  const walletQuery = useGetWalletMe(shouldFetchWallet);
  const payBookingWithWalletMutation = usePayBookingWithWallet();
  const paymentQuery = useGetPaymentById(activePaymentId, {
    enabled: shouldFetchPayment,
    refetchInterval: (query) => {
      const paymentStatus = query.state.data?.paymentStatus ?? checkout?.payment?.paymentStatus;
      return step === 3 && paymentStatus === PaymentStatus.PENDING ? 5000 : false;
    }
  });
  const currentPayment = paymentQuery.data || checkout?.payment || null;
  const isPaymentStep = step === 3;
  const isPaymentSucceeded = currentPayment?.paymentStatus === PaymentStatus.SUCCEEDED;
  const bookingSyncId = checkout?.booking.id || 0;
  const bookingSyncQuery = useGetBookingById(bookingSyncId, {
    enabled:
      isPaymentStep &&
      bookingSyncId > 0 &&
      isPaymentSucceeded &&
      postPaymentSyncState !== 'timed_out' &&
      checkout?.booking.bookingStatus !== BookingStatus.CONFIRMED,
    refetchInterval: (query) => {
      if (postPaymentSyncState !== 'syncing') {
        return false;
      }

      const bookingStatus = query.state.data?.bookingStatus;
      return bookingStatus === BookingStatus.CONFIRMED ? false : BOOKING_SYNC_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
    retry: false,
    refetchOnWindowFocus: false
  });
  const latestBookingSnapshot = bookingSyncQuery.data || checkout?.booking || null;
  const isAwaitingBookingConfirm =
    isPaymentStep &&
    Boolean(checkout?.booking.id) &&
    isPaymentSucceeded &&
    latestBookingSnapshot?.bookingStatus !== BookingStatus.CONFIRMED;
  const isHardLocked = postPaymentSyncState === 'syncing';
  const isTimedOut = postPaymentSyncState === 'timed_out';

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
        message: 'Booking not found for payment',
        description: 'This payment link is invalid or the booking has been removed.'
      });
      setResumeHandledBookingId(queryBookingId);
      return;
    }

    if (targetBooking.bookingStatus !== BookingStatus.PENDING_PAYMENT) {
      if (targetBooking.bookingStatus === BookingStatus.CONFIRMED) {
        message.info(`Booking #${targetBooking.id} is already confirmed. Redirecting to the detail page.`);
        setResumeHandledBookingId(queryBookingId);
        navigate(`/bookings/${targetBooking.id}`);
        return;
      }

      setResumeWarning({
        type: 'warning',
        message: `Booking #${targetBooking.id} is not pending payment`,
        description: 'This booking is already confirmed, expired, or canceled, so the payment flow cannot be resumed.'
      });
      setResumeHandledBookingId(queryBookingId);
      return;
    }

    if (!targetBooking.paymentId) {
      setResumeWarning({
        type: 'warning',
        message: `Booking #${targetBooking.id} has no payment intent`,
        description: 'This booking is missing a paymentId, so the payment step cannot be opened yet.'
      });
      setResumeHandledBookingId(queryBookingId);
      return;
    }

    if (!targetBooking.flightId) {
      setResumeWarning({
        type: 'warning',
        message: `Booking #${targetBooking.id} is missing flight information`,
        description: 'The payment flow cannot reopen because this booking has no valid flightId.'
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
        message: `Could not load the payment intent for booking #${targetBooking.id}`,
        description: 'Please try again later or contact operations to inspect the payment intent.'
      });
      setResumeHandledBookingId(queryBookingId);
      return;
    }

    setCheckout({
      booking: targetBooking,
      payment: targetPayment
    });
    setCreatedBooking(null);
    setPostPaymentSyncState('idle');
    setSyncStartedAt(null);
    setSelectedFlightId(targetBooking.flightId);
    setSelectedSeatNumber(targetBooking.seatNumber || null);
    setStep(3);
    setResumeWarning(null);
    setInlineAlert({
      type: 'info',
      message: `Loading payment for booking #${targetBooking.id}`,
      description: 'You can pay immediately with your wallet balance if funds are available.'
    });
    setResumeHandledBookingId(queryBookingId);
  }, [
    bookingDeepLinkQuery.data,
    bookingDeepLinkQuery.isLoading,
    navigate,
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
    if (selectedFlightFromCurrentPage) return selectedFlightFromCurrentPage;
    if (selectedFlightQuery.data?.id === selectedFlightId) return selectedFlightQuery.data;
    return null;
  }, [selectedFlightFromCurrentPage, selectedFlightId, selectedFlightQuery.data]);

  const selectedSeat = useMemo(
    () => seats.find((seat) => seat.seatNumber === selectedSeatNumber) || null,
    [seats, selectedSeatNumber]
  );
  const selectedSeatSummary = useMemo<SelectedSeatSummary | null>(() => {
    if (selectedSeat) {
      return selectedSeat;
    }

    if (!checkout?.booking.seatNumber) {
      return null;
    }

    return {
      seatNumber: checkout.booking.seatNumber,
      seatClass: checkout.booking.seatClass,
      price: checkout.booking.price,
      currency: checkout.booking.currency
    };
  }, [checkout, selectedSeat]);
  const selectedFlightIsBookable = isFlightBookable(selectedFlight);
  const isWalletLoading = shouldFetchWallet && (walletQuery.isLoading || (walletQuery.isFetching && !walletQuery.data));

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
    setSeatSelectionAlert(null);
    setDuplicateBookingId(null);
  }, [selectedFlightId]);

  useEffect(() => {
    if (selectedSeat && [SeatClass.BUSINESS, SeatClass.FIRST_CLASS].includes(selectedSeat.seatClass)) {
      setSeatSelectionAlert(null);
    }
  }, [selectedSeat]);

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
        message: 'The payment session has expired',
        description: 'The seat hold will be released, and you will need to create a new checkout to continue.'
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
    setSeatSelectionAlert(null);

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
      setPostPaymentSyncState('idle');
      setSyncStartedAt(null);
      setStep(3);
      setInlineAlert({
        type: 'info',
        message: 'Seat hold created',
        description: 'Your seat is now held and the checkout is waiting for payment.'
      });
    } catch (error) {
      const appError = normalizeProblemError(error);
      const existingBookingId = Number(getCreateBookingMetaValue(appError, 'existingBookingId') || 0);
      const existingBookingStatus = parseStatusFromMeta(getCreateBookingMetaValue(appError, 'existingBookingStatus'));
      const existingPaymentStatus = parseStatusFromMeta(getCreateBookingMetaValue(appError, 'existingPaymentStatus'));
      const businessCode = getCreateBookingBusinessCode(appError);
      const businessMessage = getCreateBookingBusinessMessage(appError);
      const hasExistingBookingMetadata = existingBookingId > 0;
      const isActiveBookingConflict =
        businessCode === ACTIVE_BOOKING_EXISTS_CODE || (appError.status === 409 && hasExistingBookingMetadata);
      const isImplicitPremiumSelectionConflict =
        !selectedSeatNumber && appError.status === 409 && existingBookingId <= 0;

      if (
        businessCode === PREMIUM_SEAT_SELECTION_REQUIRED_CODE ||
        businessMessage === PREMIUM_SEAT_SELECTION_REQUIRED_MESSAGE ||
        isImplicitPremiumSelectionConflict
      ) {
        setStep(1);
        setSeatSelectionAlert({
          type: 'warning',
          message: businessMessage || PREMIUM_SEAT_SELECTION_REQUIRED_MESSAGE,
          description: 'Please choose a Business or First Class seat to continue and lock the final fare.'
        });
        return;
      }

      if (isActiveBookingConflict && hasExistingBookingMetadata) {
        const shouldOpenConfirmedBooking =
          existingBookingStatus === BookingStatus.CONFIRMED || existingPaymentStatus === PaymentStatus.SUCCEEDED;

        if (shouldOpenConfirmedBooking) {
          message.info(`Booking #${existingBookingId} is already confirmed. Redirecting to the detail page.`);
          navigate(`/bookings/${existingBookingId}`);
          return;
        }

        const shouldResumePendingBooking =
          existingBookingStatus === BookingStatus.PENDING_PAYMENT ||
          existingPaymentStatus === PaymentStatus.PENDING ||
          existingPaymentStatus === PaymentStatus.PROCESSING;

        if (shouldResumePendingBooking) {
          message.info(`Reopening the payment session for booking #${existingBookingId}.`);
          navigate(`/bookings/create?bookingId=${existingBookingId}`);
          return;
        }
      }

      if (existingBookingId > 0) {
        setDuplicateBookingId(existingBookingId);
      }
    }
  };

  const handleSyncTimeout = useCallback(() => {
    setPostPaymentSyncState((previousState) => (previousState === 'syncing' ? 'timed_out' : previousState));
    setSyncStartedAt(null);
    setInlineAlert({
      type: 'warning',
      message: 'Booking confirmation is delayed',
      description: 'Payment succeeded. Please open the booking details page to track the latest status.'
    });
  }, []);

  useEffect(() => {
    if (!isAwaitingBookingConfirm || postPaymentSyncState !== 'idle') {
      return;
    }

    setPostPaymentSyncState('syncing');
    setSyncStartedAt(Date.now());
    setInlineAlert({
      type: 'info',
      message: 'Payment received, confirming booking',
      description: 'The system is syncing the confirmation status from the payment service. Please stay on this page.'
    });
  }, [isAwaitingBookingConfirm, postPaymentSyncState]);

  useEffect(() => {
    if (
      !isPaymentStep ||
      !checkout ||
      !bookingSyncQuery.data ||
      bookingSyncQuery.data.bookingStatus !== BookingStatus.CONFIRMED
    ) {
      return;
    }

    setCheckout((previousCheckout) =>
      previousCheckout
        ? {
            ...previousCheckout,
            booking: bookingSyncQuery.data
          }
        : previousCheckout
    );
    setCreatedBooking(bookingSyncQuery.data);
    setPostPaymentSyncState('idle');
    setSyncStartedAt(null);
    setInlineAlert(null);
    setStep(4);
  }, [bookingSyncQuery.data, checkout, isPaymentStep]);

  useEffect(() => {
    if (postPaymentSyncState !== 'syncing' || syncStartedAt === null) {
      return;
    }

    const remainingMs = BOOKING_SYNC_TIMEOUT_MS - (Date.now() - syncStartedAt);
    if (remainingMs <= 0) {
      handleSyncTimeout();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handleSyncTimeout();
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [handleSyncTimeout, postPaymentSyncState, syncStartedAt]);

  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (!isHardLocked) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    },
    [isHardLocked]
  );
  useBeforeUnload(handleBeforeUnload);

  useEffect(() => {
    if (!isHardLocked) {
      return;
    }

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setInlineAlert({
        type: 'info',
        message: 'Syncing booking, please wait',
        description: 'The system is confirming the booking after your payment.'
      });
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isHardLocked]);

  const renderFlightSelection = () => (
    <SectionCard title="Select a flight" subtitle="Step 1 · Select a route with the right schedule and fare">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {selectedFlightId > 0 && selectedFlight && !selectedFlightIsBookable && (
          <Alert
            type="warning"
            showIcon
            message="The deep-linked flight is no longer open for booking"
            description="Please choose another flight that is Scheduled or Delayed and has not departed yet."
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
                {isFlightBookable(flight) ? 'Select flight' : 'Unavailable'}
              </Button>
            }
          />
        ))}

        {!flightsQuery.isLoading && flights.length === 0 && <Empty description="No flights available" />}

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
      return <EmptyState title="Select a flight first" description="Choose a flight in the previous step." />;
    }

    if (!selectedFlightIsBookable) {
      return (
        <SectionCard title="Select a seat" subtitle="Step 2 · Flight is no longer bookable">
          <Alert
            type="warning"
            showIcon
            message="This flight is no longer open for booking"
            description="Return to the previous step and choose a valid flight."
          />
          <Space style={{ marginTop: 16 }}>
            <Button onClick={() => setStep(0)}>Back</Button>
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
        title="Select a seat"
        subtitle={`Step 2 · ${selectedFlight.flightNumber} · ${route.compact} · ${formatDateLabel(selectedFlight.flightDate)}`}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {!seats.length && !seatsQuery.isLoading && (
            <Alert type="warning" showIcon message="No seats are available for this flight." />
          )}

          <Alert
            type="info"
            showIcon
            message="You can skip seat selection and auto-assign Economy"
            description="If you do not choose a seat, the system can only auto-hold an available Economy seat. Business and First Class must be selected manually."
          />

          {seatSelectionAlert && (
            <Alert
              type={seatSelectionAlert.type}
              showIcon
              message={seatSelectionAlert.message}
              description={seatSelectionAlert.description}
            />
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
                      {selectedSeatNumber === seat.seatNumber ? 'Selected' : 'Select seat'}
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
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button
              type="primary"
              disabled={seats.length === 0 || !selectedFlightIsBookable}
              onClick={() => setStep(2)}
            >
              Continue to review
            </Button>
          </Space>
        </Space>
      </SectionCard>
    );
  };

  const renderReviewStep = () => (
    <SectionCard title="Review booking" subtitle="Step 3 · Review passenger, seat, and notes before submit">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card className="app-surface" style={{ borderRadius: 20 }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Text strong>Passenger profile</Text>
            {isPassengerSyncing ? (
              <Alert
                type="info"
                showIcon
                message="Syncing passenger profile"
                description="The system is waiting for the passenger profile to sync from the identity service."
              />
            ) : passengerQuery.data ? (
              <Text>{`${passengerQuery.data.name} · Passport ${passengerQuery.data.passportNumber}`}</Text>
            ) : (
              <Alert
                type="error"
                showIcon
                message={
                  passengerAppError?.status === 404
                    ? 'No passenger profile was found for the current user'
                    : passengerAppError?.message || 'Could not load the current passenger profile'
                }
                description={
                  passengerAppError?.status === 404
                    ? 'Passenger records are synced from the UserCreated event. Try again in a few seconds if you just registered.'
                    : 'Please try again later or inspect the passenger service.'
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
              <Text type="secondary">{selectedSeatSummary ? 'Selected fare' : 'Base fare'}</Text>
              <Text strong>
                {formatCurrency(selectedSeatSummary?.price || selectedFlight.price, selectedSeatSummary?.currency || 'VND')}
              </Text>
              <Text type="secondary">
                {selectedSeatSummary
                  ? `Checkout will lock the exact fare for seat ${selectedSeatSummary.seatNumber}.`
                  : 'The final total will lock after seat assignment. Business and First Class require manual selection.'}
              </Text>
            </Space>
          </Card>
        )}

        {duplicateBookingId && (
          <Alert
            type="warning"
            showIcon
            message="You already have an active booking for this flight"
            description={
              <Space wrap>
                <Text type="secondary">{`Booking #${duplicateBookingId} is still pending or already confirmed.`}</Text>
                <Button type="link" onClick={() => navigate(`/bookings/${duplicateBookingId}`)}>
                  Open existing booking
                </Button>
              </Space>
            }
          />
        )}

        <Card className="app-surface" style={{ borderRadius: 20 }} title="Notes">
          <TextArea
            rows={5}
            placeholder="Add booking notes..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Card>

        <Space>
          <Button onClick={() => setStep(1)}>Back</Button>
          <Button
            type="primary"
            loading={createBookingMutation.isPending}
            disabled={isPassengerSyncing || !passengerQuery.data?.id || !selectedFlight || !selectedFlightIsBookable}
            onClick={handleSubmitBooking}
          >
            Continue to wallet payment
          </Button>
        </Space>
      </Space>
    </SectionCard>
  );

  const renderPaymentStep = () => {
    if (!checkout) {
      return <EmptyState title="Checkout missing" description="No pending checkout session was found." />;
    }

    const payment = currentPayment || checkout.payment;
    const paymentExpired = payment.paymentStatus === PaymentStatus.EXPIRED || countdownMs <= 0;
    const isResumedCheckout = queryBookingId > 0 && checkout.booking.id === queryBookingId;
    const walletBalance = walletQuery.data?.balance;
    const walletCurrency = walletQuery.data?.currency || payment.currency;
    const isWalletSufficient =
      typeof walletBalance === 'number' ? walletBalance >= Number(payment.amount || 0) : null;
    const shouldFreezePaymentActions = isPaymentSucceeded;
    const showTimeoutSafeExit = shouldFreezePaymentActions && isTimedOut;

    return (
      <SectionCard title="Payment" subtitle="Step 4 · Confirm the locked amount before the hold expires">
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
              <Text type="secondary">{`Expires in ${String(countdownMinutes).padStart(2, '0')}:${String(countdownSeconds).padStart(2, '0')}`}</Text>
              <Progress percent={paymentWindowProgress} showInfo={false} strokeColor="#1d4ed8" />
            </Space>
          </Card>

          <Card className="app-surface" style={{ borderRadius: 20 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Text strong>Pay with wallet</Text>
              <Text type="secondary">The booking will be confirmed as soon as your wallet payment succeeds.</Text>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Text>
                  {isWalletLoading
                    ? 'Loading wallet balance...'
                    : `Current wallet balance: ${formatCurrency(walletBalance || 0, walletCurrency)}`}
                </Text>
                <Text>{`Amount due: ${formatCurrency(payment.amount, payment.currency)}`}</Text>
                <StatusPill
                  label={
                    isWalletLoading
                      ? 'Loading wallet'
                      : isWalletSufficient
                        ? 'Wallet funded'
                        : 'Wallet insufficient'
                  }
                  tone={isWalletLoading ? 'neutral' : isWalletSufficient ? 'success' : 'warning'}
                  subtle
                />
              </Space>
              {!shouldFreezePaymentActions && walletQuery.isError && typeof walletBalance !== 'number' && (
                <Alert
                  type="warning"
                  showIcon
                  message="Could not load the current wallet balance"
                  description="Refresh the wallet balance before paying."
                />
              )}
              {!shouldFreezePaymentActions && isWalletSufficient === false && (
                <Alert
                  type="warning"
                  showIcon
                  message="The wallet balance is insufficient for this booking"
                  description="Top up your wallet before paying."
                />
              )}
            </Space>
          </Card>

          {showTimeoutSafeExit ? (
            <Space wrap>
              <Button type="primary" onClick={() => navigate(`/bookings/${checkout.booking.id}`)}>
                Go to booking details
              </Button>
            </Space>
          ) : shouldFreezePaymentActions ? null : (
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
                {isResumedCheckout ? 'Go to booking details' : 'Back to review'}
              </Button>
              <Button onClick={() => walletQuery.refetch()} loading={walletQuery.isFetching}>
                Refresh wallet
              </Button>
              {isWalletSufficient === false ? (
                <Button type="primary" onClick={() => navigate('/wallet')}>
                  Top up wallet
                </Button>
              ) : (
                <Button
                  type="primary"
                  loading={payBookingWithWalletMutation.isPending}
                  disabled={paymentExpired || !checkout.payment.id || isWalletSufficient !== true}
                  onClick={async () => {
                    if (!payment.id) {
                      return;
                    }

                    await payBookingWithWalletMutation.mutateAsync({ paymentId: payment.id });
                    setInlineAlert({
                      type: 'info',
                      message: 'Wallet payment succeeded, syncing booking',
                      description: 'The system is updating the booking confirmation status.'
                    });
                    await paymentQuery.refetch();
                  }}
                >
                  Pay with wallet
                </Button>
              )}
              <Button onClick={() => paymentQuery.refetch()} disabled={!checkout.payment.id}>
                Recheck payment
              </Button>
            </Space>
          )}
        </Space>
      </SectionCard>
    );
  };

  const renderSuccessStep = () => {
    if (!createdBooking) {
      return <EmptyState title="Booking not found" description="The newly created booking could not be found." />;
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
              View booking details
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
                setPostPaymentSyncState('idle');
                setSyncStartedAt(null);
              }}
            >
              Book another flight
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
        title={step === 4 ? 'Booking confirmed' : 'New booking'}
        subtitle="A 5-step flow with seat-aware pricing, a pending payment state, and a boarding pass that appears only after successful payment."
        meta={selectedFlight ? `${selectedFlight.flightNumber} · ${formatDateLabel(selectedFlight.flightDate)}` : 'Select a flight to begin'}
      />

      <SectionCard title="Booking steps" subtitle="Checkout-inspired flow for route, seat, payment and confirmation">
        <Steps
          current={step}
          items={[
            { title: 'Select flight', description: 'Route & schedule', icon: <RocketOutlined /> },
            { title: 'Select seat', description: 'Cabin & preference', icon: <TeamOutlined /> },
            { title: 'Review', description: 'Review & note', icon: <FileSearchOutlined /> },
            { title: 'Payment', description: 'Locked amount', icon: <FileSearchOutlined /> },
            { title: 'Complete', description: 'Boarding pass', icon: <CheckCircleOutlined /> }
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
                    selectedSeat={selectedSeatSummary || undefined}
                    passenger={passengerQuery.data}
                    airportsMap={airportMap}
                  />
                  <Card className="app-surface" style={{ borderRadius: 24 }}>
                    <Space direction="vertical" size={8}>
                      <Text className="page-eyebrow">Flow notes</Text>
                      <Text type="secondary">
                        {selectedSeatSummary
                          ? `Seat ${selectedSeatSummary.seatNumber} selected · ${seatClassLabels[selectedSeatSummary.seatClass]}${selectedSeatSummary.seatType ? ` / ${seatTypeLabels[selectedSeatSummary.seatType]}` : ''} · ${formatCurrency(selectedSeatSummary.price, selectedSeatSummary.currency)}`
                          : `No seat selected yet · Base fare ${formatCurrency(selectedFlight.price)} · Economy auto-assign if available`}
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
                  description="Choose a flight in the first step to see the checkout summary."
                />
              )}
            </div>
          </Col>
        </Row>
      )}

      {isHardLocked && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(15, 23, 42, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Card className="app-surface" style={{ borderRadius: 16, maxWidth: 420 }}>
            <Text strong>Syncing booking, please wait</Text>
          </Card>
        </div>
      )}
    </>
  );
};
