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
import { EntityHero } from '@components/common/EntityHero';
import { MetricCard } from '@components/common/MetricCard';
import { PageHeader } from '@components/common/PageHeader';
import { QueryStatusStrip } from '@components/common/QueryStatusStrip';
import { SectionCard } from '@components/common/SectionCard';
import { StatusPill } from '@components/common/StatusPill';
import { useGetAirports } from '@hooks/useAirports';
import { useAuthStore } from '@stores/auth.store';
import { AirportDto } from '@/types/airport.types';
import { BookingDto } from '@/types/booking.types';
import { FlightStatus } from '@/types/enums';
import { FlightDto } from '@/types/flight.types';
import { flightStatusLabels, formatCurrency } from '@utils/format';
import {
  buildRouteDescriptor,
  formatDateLabel,
  formatScheduleStrip,
  getFlightStatusTone,
  getLatestQueryTimestamp
} from '@utils/presentation';

const { Text } = Typography;

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();
  const adminMode = isAdmin();

  const airportsQuery = useGetAirports();

  const usersCountQuery = useQuery({
    queryKey: ['dashboard', 'count', 'users'],
    queryFn: async () => {
      const response = await userApi.getAll({ page: 1, pageSize: 1 });
      return response.data.total;
    },
    enabled: adminMode
  });

  const flightsCountQuery = useQuery({
    queryKey: ['dashboard', 'count', 'flights'],
    queryFn: async () => {
      const response = await flightApi.getAll({ page: 1, pageSize: 1, orderBy: 'flightDate', order: 'ASC' });
      return response.data.total;
    }
  });

  const bookingsCountQuery = useQuery({
    queryKey: ['dashboard', 'count', 'bookings'],
    queryFn: async () => {
      const response = await bookingApi.getAll({ page: 1, pageSize: 1, orderBy: 'id', order: 'DESC' });
      return response.data.total;
    }
  });

  const passengersCountQuery = useQuery({
    queryKey: ['dashboard', 'count', 'passengers'],
    queryFn: async () => {
      const response = await passengerApi.getAll({ page: 1, pageSize: 1 });
      return response.data.total;
    },
    enabled: adminMode
  });

  const recentBookingsQuery = useQuery({
    queryKey: ['dashboard', 'recentBookings'],
    queryFn: async () => {
      const response = await bookingApi.getAll({ page: 1, pageSize: 5, orderBy: 'id', order: 'DESC' });
      return response.data.result || [];
    }
  });

  const upcomingFlightsQuery = useQuery({
    queryKey: ['dashboard', 'upcomingFlights'],
    queryFn: async () => {
      const response = await flightApi.getAll({ page: 1, pageSize: 5, orderBy: 'flightDate', order: 'ASC' });
      return response.data.result || [];
    }
  });

  const allFlightsQuery = useQuery({
    queryKey: ['dashboard', 'allFlights'],
    queryFn: async () => {
      const response = await flightApi.getAll({ page: 1, pageSize: 100, orderBy: 'flightDate', order: 'ASC' });
      return response.data.result || [];
    },
    enabled: adminMode
  });

  const bookingTimelineQuery = useQuery({
    queryKey: ['dashboard', 'bookingTimeline'],
    queryFn: async () => {
      const response = await bookingApi.getAll({ page: 1, pageSize: 100, orderBy: 'id', order: 'DESC' });
      return response.data.result || [];
    }
  });

  const airportMap = useMemo(
    () => Object.fromEntries((airportsQuery.data || []).map((airport) => [airport.id, airport])) as Record<number, AirportDto>,
    [airportsQuery.data]
  );

  const recentBookings = recentBookingsQuery.data || [];

  const timelineBookings = useMemo(() => bookingTimelineQuery.data || [], [bookingTimelineQuery.data]);

  const upcomingFlights = useMemo(() => {
    const data = (upcomingFlightsQuery.data || []) as FlightDto[];
    const now = Date.now();
    return [...data]
      .filter((item) => new Date(item.flightDate).valueOf() >= now)
      .sort((a, b) => new Date(a.flightDate).valueOf() - new Date(b.flightDate).valueOf())
      .slice(0, 5);
  }, [upcomingFlightsQuery.data]);

  const statusData = useMemo(() => {
    const flights = (allFlightsQuery.data || []) as FlightDto[];
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
  }, [allFlightsQuery.data]);

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
    for (const booking of timelineBookings as BookingDto[]) {
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
    () => timelineBookings.reduce((sum, booking) => sum + (booking.price || 0), 0),
    [timelineBookings]
  );

  const lastUpdatedAt = getLatestQueryTimestamp(
    airportsQuery.dataUpdatedAt,
    usersCountQuery.dataUpdatedAt,
    flightsCountQuery.dataUpdatedAt,
    bookingsCountQuery.dataUpdatedAt,
    passengersCountQuery.dataUpdatedAt,
    recentBookingsQuery.dataUpdatedAt,
    upcomingFlightsQuery.dataUpdatedAt,
    allFlightsQuery.dataUpdatedAt,
    bookingTimelineQuery.dataUpdatedAt
  );

  const queryItems = [
    {
      label: 'Identity',
      state: usersCountQuery.isError ? 'error' : usersCountQuery.isLoading ? 'loading' : usersCountQuery.data ? 'ok' : 'idle'
    },
    {
      label: 'Flights',
      state: flightsCountQuery.isError ? 'error' : flightsCountQuery.isLoading ? 'loading' : flightsCountQuery.data ? 'ok' : 'idle'
    },
    {
      label: 'Bookings',
      state: bookingsCountQuery.isError ? 'error' : bookingsCountQuery.isLoading ? 'loading' : bookingsCountQuery.data ? 'ok' : 'idle'
    },
    {
      label: 'Passengers',
      state: passengersCountQuery.isError ? 'error' : passengersCountQuery.isLoading ? 'loading' : passengersCountQuery.data ? 'ok' : 'idle'
    },
    {
      label: 'Analytics',
      state:
        allFlightsQuery.isError || bookingTimelineQuery.isError
          ? 'error'
          : allFlightsQuery.isLoading || bookingTimelineQuery.isLoading
            ? 'loading'
            : allFlightsQuery.data || bookingTimelineQuery.data
              ? 'ok'
              : 'idle'
    }
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow="Operations overview"
        title="Dashboard"
        subtitle={`Xin chào, ${user?.name || 'Unknown'}. Workspace này tổng hợp activity từ identity, flight, passenger và booking services.`}
        meta="Balanced bilingual UI · VND pricing"
      />

      <QueryStatusStrip title="Module status" items={queryItems} lastUpdatedAt={lastUpdatedAt} />

      <EntityHero
        eyebrow={adminMode ? 'Admin workspace' : 'Traveler workspace'}
        title={adminMode ? 'Booking operations at a glance' : 'Travel and booking workspace'}
        subtitle={
          adminMode
            ? 'Theo dõi inventory, booking activity và flight movement trong cùng một view. Không dùng fake analytics; chỉ hiển thị signal lấy được từ backend hiện tại.'
            : 'Điểm bắt đầu nhanh cho hành trình đặt vé: xem chuyến bay, tạo booking mới và rà lại các giao dịch gần đây.'
        }
        tags={
          <>
            <StatusPill label={adminMode ? 'Admin' : 'User'} tone={adminMode ? 'accent' : 'info'} />
            <StatusPill label="Live inventory" tone="success" />
          </>
        }
        extra={
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Button type="primary" size="large" onClick={() => navigate('/bookings/create')}>
              Đặt vé mới
            </Button>
            <Button size="large" onClick={() => navigate('/flights')}>
              Xem chuyến bay
            </Button>
          </Space>
        }
      />

      {adminMode ? (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} xl={4}>
              <MetricCard
                label="Users"
                value={usersCountQuery.data || 0}
                caption="Identity roster available for role-based access."
                icon={<UserOutlined />}
                accent="#0f6cbd"
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <MetricCard
                label="Flights"
                value={flightsCountQuery.data || 0}
                caption="Current flight records ready for route and seat operations."
                icon={<RocketOutlined />}
                accent="#13908c"
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <MetricCard
                label="Bookings"
                value={bookingsCountQuery.data || 0}
                caption="Recent booking transactions across the booking service."
                icon={<BookOutlined />}
                accent="#d97706"
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <MetricCard
                label="Passengers"
                value={passengersCountQuery.data || 0}
                caption="Passenger profiles currently available for booking linkage."
                icon={<TeamOutlined />}
                accent="#7c3aed"
              />
            </Col>
            <Col xs={24} sm={12} xl={4}>
              <MetricCard
                label="Revenue"
                value={formatCurrency(totalRevenue)}
                caption="Total booking revenue from recent dashboard feed."
                icon={<DollarCircleOutlined />}
                accent="#059669"
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={10}>
              <SectionCard title="Phân bổ trạng thái chuyến bay" subtitle="Flight status distribution">
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
                title="Booking gần đây"
                subtitle="Latest booking activity mapped from the booking service"
                extra={
                  <Button type="link" onClick={() => navigate('/bookings')}>
                    Xem tất cả
                  </Button>
                }
              >
                <List
                  dataSource={recentBookings}
                  locale={{ emptyText: 'Chưa có booking nào khả dụng.' }}
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
                title="Chuyến bay sắp tới"
                subtitle="Operational view of the next scheduled flights"
                extra={
                  <Button type="link" onClick={() => navigate('/flights')}>
                    Đi tới flight ops
                  </Button>
                }
              >
                <List
                  dataSource={upcomingFlights}
                  locale={{ emptyText: 'Chưa có chuyến bay gần nhất.' }}
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
              <MetricCard
                label="Bookings"
                value={bookingsCountQuery.data || 0}
                caption="Booking records currently reachable from the backend."
                icon={<BookOutlined />}
                accent="#0f6cbd"
              />
            </Col>
            <Col xs={24} md={12}>
              <MetricCard
                label="Flights"
                value={flightsCountQuery.data || 0}
                caption="Available flight records you can browse and book from here."
                icon={<RocketOutlined />}
                accent="#13908c"
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={10}>
              <SectionCard title="Quick actions" subtitle="Start the next step without leaving the dashboard">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Button type="primary" size="large" block onClick={() => navigate('/bookings/create')}>
                    Đặt vé mới
                  </Button>
                  <Button size="large" block onClick={() => navigate('/flights')}>
                    Xem chuyến bay
                  </Button>
                  <Button size="large" block onClick={() => navigate('/bookings')}>
                    Xem booking
                  </Button>
                </Space>
              </SectionCard>
            </Col>

            <Col xs={24} xl={14}>
              <SectionCard
                title="Booking gần đây của tôi"
                subtitle="Latest visible transactions from the current booking feed"
              >
                <List
                  dataSource={recentBookings}
                  locale={{ emptyText: 'Chưa có booking nào hiển thị.' }}
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
