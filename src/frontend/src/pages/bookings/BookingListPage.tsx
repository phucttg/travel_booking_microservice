import { CloseCircleOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { SorterResult } from 'antd/es/table/interface';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@components/common/DataTable';
import { FilterBar } from '@components/common/FilterBar';
import { PageHeader } from '@components/common/PageHeader';
import { RouteBadge } from '@components/common/RouteBadge';
import { SearchInput } from '@components/common/SearchInput';
import { StatusPill } from '@components/common/StatusPill';
import { useGetAirports } from '@hooks/useAirports';
import { useCancelBooking, useGetBookings } from '@hooks/useBookings';
import { useAuthStore } from '@stores/auth.store';
import { AirportDto } from '@/types/airport.types';
import { BookingDto } from '@/types/booking.types';
import { PaginationParams } from '@/types/common.types';
import { BookingStatus } from '@/types/enums';
import {
  bookingStatusLabels,
  formatCurrency,
  formatDateTime,
  paymentStatusLabels,
  refundStatusLabels
} from '@utils/format';
import {
  buildRouteDescriptor,
  formatQuerySyncLabel,
  getBookingStatusTone,
  getPaymentStatusTone,
  getRefundStatusTone,
  getLatestQueryTimestamp
} from '@utils/presentation';

const { Text } = Typography;

export const BookingListPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();

  const [params, setParams] = useState<PaginationParams>({
    page: 1,
    pageSize: 10,
    order: 'DESC',
    orderBy: 'id',
    searchTerm: ''
  });

  const bookingsQuery = useGetBookings(params);
  const cancelBookingMutation = useCancelBooking();
  const airportsQuery = useGetAirports();

  const airportMap = useMemo(
    () => Object.fromEntries((airportsQuery.data || []).map((airport) => [airport.id, airport])) as Record<number, AirportDto>,
    [airportsQuery.data]
  );

  const lastUpdatedAt = getLatestQueryTimestamp(bookingsQuery.dataUpdatedAt, airportsQuery.dataUpdatedAt);

  const columns: ColumnsType<BookingDto> = useMemo(
    () => [
      {
        title: 'Booking',
        key: 'booking',
        render: (_, record) => {
          const route = buildRouteDescriptor(
            airportMap[record.departureAirportId],
            airportMap[record.arriveAirportId],
            record.departureAirportId,
            record.arriveAirportId
          );

          return (
            <div style={{ display: 'grid', gap: 8, minWidth: 260 }}>
              <Text style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{`BK-${record.id}`}</Text>
              <RouteBadge
                compact
                fromCode={route.departure.code}
                toCode={route.arrival.code}
                fromName={route.departure.name}
                toName={route.arrival.name}
              />
              <Text type="secondary">{`${record.flightNumber} · ${record.passengerName} · Seat ${record.seatNumber}`}</Text>
            </div>
          );
        },
        sorter: true
      },
      {
        title: 'Flight date',
        dataIndex: 'flightDate',
        key: 'flightDate',
        width: 140,
        render: (value: string | Date) => formatDateTime(value, 'DD/MM/YYYY')
      },
      {
        title: 'Fare',
        dataIndex: 'price',
        key: 'price',
        width: 140,
        render: (value: number, record) => <Text strong>{formatCurrency(value, record.currency)}</Text>
      },
      {
        title: 'Status',
        dataIndex: 'bookingStatus',
        key: 'bookingStatus',
        width: 140,
        render: (value: BookingStatus) => (
          <StatusPill label={bookingStatusLabels[value]} tone={getBookingStatusTone(value)} subtle />
        )
      },
      {
        title: 'Payment',
        key: 'payment',
        width: 220,
        render: (_, record) =>
          record.paymentSummary ? (
            <Space direction="vertical" size={4}>
              <StatusPill
                label={paymentStatusLabels[record.paymentSummary.paymentStatus]}
                tone={getPaymentStatusTone(record.paymentSummary.paymentStatus)}
                subtle
              />
              <StatusPill
                label={refundStatusLabels[record.paymentSummary.refundStatus]}
                tone={getRefundStatusTone(record.paymentSummary.refundStatus)}
                subtle
              />
            </Space>
          ) : (
            <Text type="secondary">Legacy / no payment</Text>
          )
      },
      {
        title: 'Booked at',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 170,
        render: (value: string | Date) => formatDateTime(value)
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 180,
        render: (_, record) => (
          <Space size="small">
            <Button icon={<EyeOutlined />} onClick={() => navigate(`/bookings/${record.id}`)} />
            {[BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED].includes(record.bookingStatus) && (
              <Popconfirm
                title="Cancel this booking?"
                okText="Cancel booking"
                cancelText="Close"
                onConfirm={async () => {
                  await cancelBookingMutation.mutateAsync(record.id);
                }}
              >
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={cancelBookingMutation.isPending}
                />
              </Popconfirm>
            )}
          </Space>
        )
      }
    ],
    [airportMap, cancelBookingMutation, navigate]
  );

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<BookingDto> | SorterResult<BookingDto>[]
  ) => {
    const sorterObject = Array.isArray(sorter) ? sorter[0] : sorter;
    const orderBy = typeof sorterObject?.field === 'string' ? sorterObject.field : params.orderBy || 'id';
    const order = sorterObject?.order === 'ascend' ? 'ASC' : 'DESC';

    setParams((prev) => ({
      ...prev,
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 10,
      orderBy,
      order
    }));
  };

  return (
    <>
      <PageHeader
        eyebrow="Booking ledger"
        title="Booking list"
        subtitle={
          isAdmin()
            ? 'Booking activity across the current system feed, prioritized by business context instead of raw ID order.'
            : 'Bookings are shown exactly as the current backend response returns them to this client.'
        }
        meta={formatQuerySyncLabel(lastUpdatedAt)}
      />

      <FilterBar
        summary={`${bookingsQuery.data?.data.length || 0} visible / ${bookingsQuery.data?.total || 0} total`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => bookingsQuery.refetch()}>
              Refresh
            </Button>
            <Button onClick={() => setParams((prev) => ({ ...prev, searchTerm: '', page: 1 }))}>
              Clear filters
            </Button>
          </Space>
        }
      >
        <SearchInput
          placeholder="Search by flight number"
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
          style={{ width: 320 }}
        />
      </FilterBar>

      <DataTable<BookingDto>
        loading={bookingsQuery.isFetching || airportsQuery.isFetching}
        columns={columns}
        dataSource={bookingsQuery.data?.data || []}
        onChange={handleTableChange}
        pagination={{
          current: bookingsQuery.data?.page || 1,
          pageSize: bookingsQuery.data?.pageSize || 10,
          total: bookingsQuery.data?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50']
        }}
      />
    </>
  );
};
