import {
  AppstoreOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import { Button, Grid, Select, Space, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { SorterResult } from 'antd/es/table/interface';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlightCard } from '@components/booking/FlightCard';
import { DataTable } from '@components/common/DataTable';
import { EmptyState } from '@components/common/EmptyState';
import { FilterBar } from '@components/common/FilterBar';
import { PageHeader } from '@components/common/PageHeader';
import { PageSkeleton } from '@components/common/PageSkeleton';
import { RouteBadge } from '@components/common/RouteBadge';
import { SearchInput } from '@components/common/SearchInput';
import { StatusPill } from '@components/common/StatusPill';
import { useGetAircrafts } from '@hooks/useAircrafts';
import { useGetAirports } from '@hooks/useAirports';
import { useGetFlights } from '@hooks/useFlights';
import { useAuthStore } from '@stores/auth.store';
import { AirportDto } from '@/types/airport.types';
import { PaginationParams } from '@/types/common.types';
import { FlightStatus } from '@/types/enums';
import { FlightDto } from '@/types/flight.types';
import { flightStatusLabels, formatCurrency, formatDuration } from '@utils/format';
import {
  buildRouteDescriptor,
  formatDateLabel,
  formatQuerySyncLabel,
  formatScheduleStrip,
  getFlightStatusTone,
  getLatestQueryTimestamp,
  isFlightBookable
} from '@utils/presentation';

const { Text } = Typography;

export const FlightListPage = () => {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const { isAdmin } = useAuthStore();
  const [params, setParams] = useState<PaginationParams>({
    page: 1,
    pageSize: 10,
    order: 'ASC',
    orderBy: 'flightDate',
    searchTerm: ''
  });
  const [statusFilter, setStatusFilter] = useState<FlightStatus | 'all'>('all');

  const airportsQuery = useGetAirports();
  const aircraftsQuery = useGetAircrafts();
  const flightsQuery = useGetFlights(params);

  const airportMap = useMemo(() => {
    const entries = (airportsQuery.data || []).map((airport) => [airport.id, airport] as const);
    return Object.fromEntries(entries) as Record<number, AirportDto>;
  }, [airportsQuery.data]);

  const aircraftMap = useMemo(() => {
    const entries = (aircraftsQuery.data || []).map((aircraft) => [aircraft.id, aircraft.name] as const);
    return Object.fromEntries(entries) as Record<number, string>;
  }, [aircraftsQuery.data]);

  const tableData = useMemo(() => {
    const data = flightsQuery.data?.data || [];
    if (statusFilter === 'all') {
      return data;
    }
    return data.filter((flight) => flight.flightStatus === statusFilter);
  }, [flightsQuery.data?.data, statusFilter]);

  const lastUpdatedAt = getLatestQueryTimestamp(
    airportsQuery.dataUpdatedAt,
    aircraftsQuery.dataUpdatedAt,
    flightsQuery.dataUpdatedAt
  );

  const columns: ColumnsType<FlightDto> = useMemo(
    () => [
      {
        title: 'Chuyến bay',
        key: 'summary',
        render: (_, record) => {
          const route = buildRouteDescriptor(
            airportMap[record.departureAirportId],
            airportMap[record.arriveAirportId],
            record.departureAirportId,
            record.arriveAirportId
          );

          return (
            <div style={{ display: 'grid', gap: 8, minWidth: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <Space direction="vertical" size={6}>
                  <Text
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 700,
                      fontSize: 15
                    }}
                  >
                    {record.flightNumber}
                  </Text>
                  <RouteBadge
                    compact
                    fromCode={route.departure.code}
                    toCode={route.arrival.code}
                    fromName={route.departure.name}
                    toName={route.arrival.name}
                  />
                </Space>
                <StatusPill
                  label={flightStatusLabels[record.flightStatus]}
                  tone={getFlightStatusTone(record.flightStatus)}
                />
              </div>
              <Text type="secondary">{`${formatDateLabel(record.flightDate)} · ${formatScheduleStrip(record.departureDate, record.arriveDate)} · ${formatDuration(record.durationMinutes)}`}</Text>
            </div>
          );
        },
        sorter: true
      },
      {
        title: 'Giá vé',
        dataIndex: 'price',
        key: 'price',
        width: 140,
        render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
        sorter: true
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 170,
        render: (_, record) => {
          const bookable = isFlightBookable(record);

          return (
            <Space size="small">
              <Button icon={<EyeOutlined />} onClick={() => navigate(`/flights/${record.id}`)} />
              <Button
                type="primary"
                ghost
                icon={<ShoppingCartOutlined />}
                disabled={!bookable}
                onClick={() => navigate(`/bookings/create?flightId=${record.id}`)}
              />
              {isAdmin() && (
                <Button icon={<AppstoreOutlined />} onClick={() => navigate(`/flights/${record.id}/seats`)} />
              )}
            </Space>
          );
        }
      }
    ],
    [airportMap, isAdmin, navigate]
  );

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<FlightDto> | SorterResult<FlightDto>[]
  ) => {
    const sorterObject = Array.isArray(sorter) ? sorter[0] : sorter;
    const orderBy = typeof sorterObject?.field === 'string' ? sorterObject.field : params.orderBy || 'flightDate';
    const order = sorterObject?.order === 'descend' ? 'DESC' : 'ASC';

    setParams((prev) => ({
      ...prev,
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 10,
      orderBy,
      order
    }));
  };

  if ((flightsQuery.isLoading || airportsQuery.isLoading || aircraftsQuery.isLoading) && !flightsQuery.data) {
    return <PageSkeleton variant="table" />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Flight ops"
        title="Danh sách chuyến bay"
        subtitle="Table-first on desktop, card-first on mobile. Mỗi record nhấn mạnh route, schedule, fare và trạng thái thay vì chỉ hiện cột thô."
        meta={formatQuerySyncLabel(lastUpdatedAt)}
        extra={
          isAdmin() ? (
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/flights/create')}>
              Tạo mới
            </Button>
          ) : null
        }
      />

      <FilterBar
        summary={`${tableData.length} visible / ${flightsQuery.data?.total || 0} total · sort ${params.orderBy}:${params.order}`}
        actions={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                flightsQuery.refetch();
                airportsQuery.refetch();
                aircraftsQuery.refetch();
              }}
            >
              Refresh
            </Button>
            <Button
              onClick={() => {
                setStatusFilter('all');
                setParams((prev) => ({
                  ...prev,
                  page: 1,
                  pageSize: 10,
                  order: 'ASC',
                  orderBy: 'flightDate',
                  searchTerm: ''
                }));
              }}
            >
              Clear filters
            </Button>
          </Space>
        }
      >
        <SearchInput
          placeholder="Tìm theo số hiệu"
          value={params.searchTerm || ''}
          onSearch={(value) =>
            setParams((prev) => {
              const nextSearchTerm = value || '';
              const currentSearchTerm = prev.searchTerm || '';
              if (currentSearchTerm === nextSearchTerm) {
                return prev;
              }

              return { ...prev, searchTerm: nextSearchTerm, page: 1 };
            })
          }
          style={{ width: 280 }}
        />
        <Select
          size="large"
          style={{ width: 220 }}
          value={statusFilter}
          options={[
            { label: 'Tất cả trạng thái', value: 'all' },
            ...Object.values(FlightStatus)
              .filter((value) => typeof value === 'number')
              .map((status) => ({
                label: flightStatusLabels[status as FlightStatus],
                value: status as FlightStatus
              }))
          ]}
          onChange={(value) => setStatusFilter(value)}
        />
      </FilterBar>

      {!tableData.length ? (
        <EmptyState
          title="No flights found"
          description="Không có chuyến bay phù hợp với filter hiện tại."
          action={
            <Button
              onClick={() => {
                setStatusFilter('all');
                setParams((prev) => ({ ...prev, searchTerm: '', page: 1 }));
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : !screens.lg ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {tableData.map((flight) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              airportsMap={airportMap}
              aircraftName={aircraftMap[flight.aircraftId]}
              actionSlot={
                <Space wrap>
                  <Button icon={<EyeOutlined />} onClick={() => navigate(`/flights/${flight.id}`)}>
                    Chi tiết
                  </Button>
                  <Button
                    type="primary"
                    disabled={!isFlightBookable(flight)}
                    onClick={() => navigate(`/bookings/create?flightId=${flight.id}`)}
                    icon={<ShoppingCartOutlined />}
                  >
                    Đặt vé
                  </Button>
                </Space>
              }
            />
          ))}
        </Space>
      ) : (
        <DataTable<FlightDto>
          loading={flightsQuery.isFetching || airportsQuery.isFetching || aircraftsQuery.isFetching}
          columns={columns}
          dataSource={tableData}
          onChange={handleTableChange}
          pagination={{
            current: flightsQuery.data?.page || 1,
            pageSize: flightsQuery.data?.pageSize || 10,
            total: flightsQuery.data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50']
          }}
        />
      )}
    </>
  );
};
