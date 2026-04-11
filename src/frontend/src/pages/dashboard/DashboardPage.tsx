import {
  BookOutlined,
  DollarCircleOutlined,
  RocketOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Col, List, Row, Space, Typography } from 'antd';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { bookingApi } from '@api/booking.api';
import { flightApi } from '@api/flight.api';
import { passengerApi } from '@api/passenger.api';
import { userApi } from '@api/user.api';
import { RouteBadge } from '@components/common/RouteBadge';
import { DashboardMetricCard } from '@pages/dashboard/DashboardMetricCard';
import { EntityHero } from '@components/common/EntityHero';
import { PageHeader } from '@components/common/PageHeader';
import { QueryStatusStrip } from '@components/common/QueryStatusStrip';
import { SectionCard } from '@components/common/SectionCard';
import { StatusPill } from '@components/common/StatusPill';
import { useGetAirports } from '@hooks/useAirports';
import { useAdminMode, useCurrentUser } from '@stores/auth.store';
import { AirportDto } from '@/types/airport.types';
import { BookingDto } from '@/types/booking.types';
import { BookingStatus, FlightStatus } from '@/types/enums';
import { FlightDto } from '@/types/flight.types';
import { flightStatusLabels, formatCurrency } from '@utils/format';
import { QUERY_STALE_TIME_MS } from '@utils/constants';
import {
  buildRouteDescriptor,
  formatDateLabel,
  formatScheduleStrip,
  getFlightStatusTone,
  getLatestQueryTimestamp
} from '@utils/presentation';

const { Text } = Typography;
const DASHBOARD_FLIGHTS_PAGE_SIZE = 100;
const DASHBOARD_BOOKINGS_PAGE_SIZE = 100;

type DashboardQueryState = 'ok' | 'loading' | 'error' | 'idle';

const resolveQueryState = (
  query: { isError: boolean; isLoading: boolean; isSuccess: boolean },
  enabled = true
): DashboardQueryState => {
  if (!enabled) {
    return 'idle';
  }

  if (query.isError) {
    return 'error';
  }

  if (query.isLoading) {
    return 'loading';
  }

  if (query.isSuccess) {
    return 'ok';
  }

  return 'idle';
};

const getFlightSortTimestamp = (flight: Pick<FlightDto, 'departureDate' | 'flightDate'>): number | null => {
  const departureTimestamp = new Date(flight.departureDate).valueOf();
  if (!Number.isNaN(departureTimestamp)) {
    return departureTimestamp;
  }

  const flightDateTimestamp = new Date(flight.flightDate).valueOf();
  return Number.isNaN(flightDateTimestamp) ? null : flightDateTimestamp;
};

const formatDashboardCompactCurrency = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const units: Array<{ minValue: number; suffix: 'K' | 'M' | 'B' }> = [
    { minValue: 1_000_000_000, suffix: 'B' },
    { minValue: 1_000_000, suffix: 'M' },
    { minValue: 1_000, suffix: 'K' }
  ];

  const selectedUnit = units.find((unit) => absValue >= unit.minValue);
  if (!selectedUnit) {
    return `${sign}${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(absValue)} đ`;
  }

  const normalized = absValue / selectedUnit.minValue;
  const formatted = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: normalized >= 100 ? 0 : 1
  }).format(normalized);

  return `${sign}${formatted}${selectedUnit.suffix} đ`;
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const adminMode = useAdminMode();

  const airportsQuery = useGetAirports();

  const usersCountQuery = useQuery({
    queryKey: ['dashboard', 'count', 'users'],
    queryFn: async () => {
      const response = await userApi.getAll({ page: 1, pageSize: 1 });
      return response.data.total;
    },
    enabled: adminMode,
    staleTime: QUERY_STALE_TIME_MS
  });

  const passengersCountQuery = useQuery({
    queryKey: ['dashboard', 'count', 'passengers'],
    queryFn: async () => {
      const response = await passengerApi.getAll({ page: 1, pageSize: 1 });
      return response.data.total;
    },
    enabled: adminMode,
    staleTime: QUERY_STALE_TIME_MS
  });

  const flightsSnapshotQuery = useQuery({
    queryKey: ['dashboard', 'snapshot', 'flights'],
    queryFn: async () => {
      const response = await flightApi.getAll({
        page: 1,
        pageSize: DASHBOARD_FLIGHTS_PAGE_SIZE,
        orderBy: 'flightDate',
        order: 'ASC'
      });
      return {
        total: response.data.total,
        flights: (response.data.result || []) as FlightDto[]
      };
    },
    staleTime: QUERY_STALE_TIME_MS
  });

  const bookingsSnapshotQuery = useQuery({
    queryKey: ['dashboard', 'snapshot', 'bookings'],
    queryFn: async () => {
      const response = await bookingApi.getAll({
        page: 1,
        pageSize: DASHBOARD_BOOKINGS_PAGE_SIZE,
        orderBy: 'id',
        order: 'DESC',
        includePaymentSummary: false
      });
      return {
        total: response.data.total,
        bookings: (response.data.result || []) as BookingDto[]
      };
    },
    staleTime: QUERY_STALE_TIME_MS
  });

  const flights = useMemo(() => flightsSnapshotQuery.data?.flights || [], [flightsSnapshotQuery.data?.flights]);

  const airportMap = useMemo(
    () => Object.fromEntries((airportsQuery.data || []).map((airport) => [airport.id, airport])) as Record<number, AirportDto>,
    [airportsQuery.data]
  );

  const timelineBookings = useMemo(
    () => bookingsSnapshotQuery.data?.bookings || [],
    [bookingsSnapshotQuery.data?.bookings]
  );

  const recentBookings = useMemo(() => timelineBookings.slice(0, 5), [timelineBookings]);

  const upcomingFlights = useMemo(() => {
    const now = Date.now();
    return [...flights]
      .filter((item) => {
        const timestamp = getFlightSortTimestamp(item);
        return typeof timestamp === 'number' && timestamp >= now;
      })
      .sort((a, b) => {
        const first = getFlightSortTimestamp(a) ?? Number.POSITIVE_INFINITY;
        const second = getFlightSortTimestamp(b) ?? Number.POSITIVE_INFINITY;
        return first - second;
      })
      .slice(0, 5);
  }, [flights]);

  const statusData = useMemo(() => {
    const grouped = flights.reduce<Record<number, number>>((acc, flight) => {
      acc[flight.flightStatus] = (acc[flight.flightStatus] || 0) + 1;
      return acc;
    }, {});

    const statusColor: Record<FlightStatus, string> = {
      [FlightStatus.UNKNOWN]: '#94a3b8',
      [FlightStatus.FLYING]: '#3b82f6',
      [FlightStatus.DELAY]: '#f59e0b',
      [FlightStatus.CANCELED]: '#ef4444',
      [FlightStatus.COMPLETED]: '#22c55e',
      [FlightStatus.SCHEDULED]: '#06b6d4'
    };

    return Object.values(FlightStatus)
      .filter((value) => typeof value === 'number')
      .map((status) => ({
        name: flightStatusLabels[status as FlightStatus],
        value: grouped[status as number] || 0,
        color: statusColor[status as FlightStatus]
      }))
      .filter((item) => item.value > 0);
  }, [flights]);

  const bookingTimelineData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateKey = (value: Date) => {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const dateLabel = (value: Date) =>
      value.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit'
      });

    const buckets: Array<{ key: string; label: string; count: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      buckets.push({
        key: dateKey(date),
        label: dateLabel(date),
        count: 0
      });
    }

    const indexByKey = new Map(buckets.map((bucket, index) => [bucket.key, index]));
    for (const booking of timelineBookings) {
      const created = new Date(booking.createdAt);
      created.setHours(0, 0, 0, 0);
      const key = dateKey(created);
      const index = indexByKey.get(key);
      if (typeof index === 'number') {
        buckets[index].count += 1;
      }
    }

    return buckets.map((bucket) => ({
      date: bucket.label,
      count: bucket.count
    }));
  }, [timelineBookings]);

  const totalRevenue = useMemo(
    () =>
      timelineBookings.reduce(
        (sum, booking) => sum + (booking.bookingStatus === BookingStatus.CONFIRMED ? booking.price || 0 : 0),
        0
      ),
    [timelineBookings]
  );

  const lastUpdatedAt = getLatestQueryTimestamp(
    airportsQuery.dataUpdatedAt,
    usersCountQuery.dataUpdatedAt,
    flightsSnapshotQuery.dataUpdatedAt,
    bookingsSnapshotQuery.dataUpdatedAt,
    passengersCountQuery.dataUpdatedAt
  );

  const analyticsState: DashboardQueryState =
    flightsSnapshotQuery.isError || bookingsSnapshotQuery.isError
      ? 'error'
      : flightsSnapshotQuery.isLoading || bookingsSnapshotQuery.isLoading
        ? 'loading'
        : flightsSnapshotQuery.isSuccess && bookingsSnapshotQuery.isSuccess
          ? 'ok'
          : 'idle';

  const queryItems = [
    {
      label: 'Identity',
      state: resolveQueryState(usersCountQuery, adminMode)
    },
    {
      label: 'Flights',
      state: resolveQueryState(flightsSnapshotQuery)
    },
    {
      label: 'Bookings',
      state: resolveQueryState(bookingsSnapshotQuery)
    },
    {
      label: 'Passengers',
      state: resolveQueryState(passengersCountQuery, adminMode)
    },
    {
      label: 'Analytics',
      state: analyticsState
    }
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow={adminMode ? 'Operations overview' : 'Traveler overview'}
        title="Dashboard"
        subtitle={
          adminMode
            ? `Hello, ${user?.name || 'Unknown'}. This workspace brings together activity from the identity, flight, passenger, and booking services.`
            : `Hello, ${user?.name || 'Unknown'}. Browse flights, review your bookings, and manage your wallet from one place.`
        }
        meta={adminMode ? 'Balanced bilingual UI · VND pricing' : 'Traveler tools · VND pricing'}
      />

      {adminMode && <QueryStatusStrip title="Module status" items={queryItems} lastUpdatedAt={lastUpdatedAt} />}

      <EntityHero
        eyebrow={adminMode ? 'Admin workspace' : 'Traveler workspace'}
        title={adminMode ? 'Booking operations at a glance' : 'Your trips'}
        subtitle={
          adminMode
            ? 'Track inventory, booking activity, and flight movement in one view. No fake analytics; only signals currently available from the backend are shown.'
            : 'Start from flights first, then review bookings or open your wallet when you need to continue the journey.'
        }
        tags={
          <>
            <StatusPill label={adminMode ? 'Admin' : 'User'} tone={adminMode ? 'accent' : 'info'} />
            <StatusPill label="Live inventory" tone="success" />
          </>
        }
        extra={
          adminMode ? (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Button type="primary" size="large" onClick={() => navigate('/bookings/create')}>
                Create booking
              </Button>
              <Button size="large" onClick={() => navigate('/flights')}>
                Browse flights
              </Button>
            </Space>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Button type="primary" size="large" onClick={() => navigate('/flights')}>
                Browse flights
              </Button>
              <Button size="large" onClick={() => navigate('/bookings')}>
                View bookings
              </Button>
            </Space>
          )
        }
      />

      {adminMode ? (
        <>
          <div className="dashboard-metrics-grid" data-testid="dashboard-metrics-grid">
            <DashboardMetricCard
              testId="dashboard-metric-users"
              label="Users"
              value={usersCountQuery.data || 0}
              caption="Identity roster available for role-based access."
              icon={<UserOutlined />}
              accent="#0f6cbd"
            />
            <DashboardMetricCard
              testId="dashboard-metric-flights"
              label="Flights"
              value={flightsSnapshotQuery.data?.total || 0}
              caption="Current flight records ready for route and seat operations."
              icon={<RocketOutlined />}
              accent="#13908c"
            />
            <DashboardMetricCard
              testId="dashboard-metric-bookings"
              label="Bookings"
              value={bookingsSnapshotQuery.data?.total || 0}
              caption="Recent booking transactions across the booking service."
              icon={<BookOutlined />}
              accent="#d97706"
            />
            <DashboardMetricCard
              testId="dashboard-metric-passengers"
              label="Passengers"
              value={passengersCountQuery.data || 0}
              caption="Passenger profiles currently available for booking linkage."
              icon={<TeamOutlined />}
              accent="#7c3aed"
            />
            <DashboardMetricCard
              testId="dashboard-metric-revenue"
              label="Revenue"
              value={formatDashboardCompactCurrency(totalRevenue)}
              caption="Total booking revenue from recent dashboard feed."
              icon={<DollarCircleOutlined />}
              accent="#059669"
            />
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={10}>
              <SectionCard title="Flight status distribution" subtitle="Current operational breakdown by status">
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={94}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                      >
                        {statusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </Col>

            <Col xs={24} xl={14}>
              <SectionCard title="Booking activity" subtitle="Booking volume over the last 7 days">
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={bookingTimelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0f6cbd" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={11}>
              <SectionCard
                title="Recent bookings"
                subtitle="Latest booking activity mapped from the booking service"
                extra={
                  <Button type="link" onClick={() => navigate('/bookings')}>
                    View all
                  </Button>
                }
              >
                <List
                  dataSource={recentBookings}
                  locale={{ emptyText: 'No bookings available yet.' }}
                  renderItem={(item: BookingDto) => {
                    const route = buildRouteDescriptor(
                      airportMap[item.departureAirportId],
                      airportMap[item.arriveAirportId],
                      item.departureAirportId,
                      item.arriveAirportId
                    );

                    return (
                      <List.Item style={{ paddingInline: 0 }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                          <Space direction="vertical" size={8}>
                            <Text
                              style={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 700
                              }}
                            >
                              BK-{item.id}
                            </Text>
                            <RouteBadge
                              compact
                              fromCode={route.departure.code}
                              toCode={route.arrival.code}
                              fromName={route.departure.name}
                              toName={route.arrival.name}
                            />
                            <Text type="secondary">{`${item.passengerName} · Seat ${item.seatNumber}`}</Text>
                          </Space>
                          <Space direction="vertical" size={8} align="end">
                            <Text strong>{formatCurrency(item.price)}</Text>
                            <Text type="secondary">{item.flightNumber}</Text>
                          </Space>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </SectionCard>
            </Col>

            <Col xs={24} xl={13}>
              <SectionCard
                title="Upcoming flights"
                subtitle="Operational view of the next scheduled flights"
                extra={
                  <Button type="link" onClick={() => navigate('/flights')}>
                    Open flight ops
                  </Button>
                }
              >
                <List
                  dataSource={upcomingFlights}
                  locale={{ emptyText: 'No upcoming flights available.' }}
                  renderItem={(item) => {
                    const route = buildRouteDescriptor(
                      airportMap[item.departureAirportId],
                      airportMap[item.arriveAirportId],
                      item.departureAirportId,
                      item.arriveAirportId
                    );

                    return (
                      <List.Item style={{ paddingInline: 0 }}>
                        <div style={{ width: '100%', display: 'grid', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                            <Space direction="vertical" size={8}>
                              <Text
                                style={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontWeight: 700
                                }}
                              >
                                {item.flightNumber}
                              </Text>
                              <RouteBadge
                                compact
                                fromCode={route.departure.code}
                                toCode={route.arrival.code}
                                fromName={route.departure.name}
                                toName={route.arrival.name}
                              />
                            </Space>
                            <Space direction="vertical" size={8} align="end">
                              <StatusPill
                                label={flightStatusLabels[item.flightStatus]}
                                tone={getFlightStatusTone(item.flightStatus)}
                              />
                              <Text type="secondary">Base fare</Text>
                              <Text strong>{formatCurrency(item.price)}</Text>
                            </Space>
                          </div>
                          <Text type="secondary">{`${formatDateLabel(item.flightDate)} · ${formatScheduleStrip(item.departureDate, item.arriveDate)}`}</Text>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </SectionCard>
            </Col>
          </Row>
        </>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <DashboardMetricCard
                label="Bookings"
                value={bookingsSnapshotQuery.data?.total || 0}
                caption="Booking records currently reachable from the backend."
                icon={<BookOutlined />}
                accent="#0f6cbd"
              />
            </Col>
            <Col xs={24} md={12}>
              <DashboardMetricCard
                label="Flights"
                value={flightsSnapshotQuery.data?.total || 0}
                caption="Available flight records you can browse and book from here."
                icon={<RocketOutlined />}
                accent="#13908c"
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={10}>
              <SectionCard title="Quick actions" subtitle="Common traveler actions without leaving the dashboard">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Button type="primary" size="large" block onClick={() => navigate('/flights')}>
                    Browse flights
                  </Button>
                  <Button size="large" block onClick={() => navigate('/bookings')}>
                    View bookings
                  </Button>
                  <Button size="large" block onClick={() => navigate('/wallet')}>
                    My wallet
                  </Button>
                </Space>
              </SectionCard>
            </Col>

            <Col xs={24} xl={14}>
              <SectionCard
                title="My recent bookings"
                subtitle="Latest visible transactions from the current booking feed"
              >
                <List
                  dataSource={recentBookings}
                  locale={{ emptyText: 'No bookings to display.' }}
                  renderItem={(item: BookingDto) => {
                    const route = buildRouteDescriptor(
                      airportMap[item.departureAirportId],
                      airportMap[item.arriveAirportId],
                      item.departureAirportId,
                      item.arriveAirportId
                    );

                    return (
                      <List.Item style={{ paddingInline: 0 }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                          <Space direction="vertical" size={8}>
                            <RouteBadge
                              compact
                              fromCode={route.departure.code}
                              toCode={route.arrival.code}
                              fromName={route.departure.name}
                              toName={route.arrival.name}
                            />
                            <Text type="secondary">{`${item.flightNumber} · Seat ${item.seatNumber}`}</Text>
                          </Space>
                          <Space direction="vertical" size={8} align="end">
                            <Text strong>{formatCurrency(item.price)}</Text>
                            <Text type="secondary">{item.passengerName}</Text>
                          </Space>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </SectionCard>
            </Col>
          </Row>
        </>
      )}
    </>
  );
};
