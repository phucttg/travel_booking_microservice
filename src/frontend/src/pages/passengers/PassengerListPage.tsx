import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Space, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { SorterResult } from 'antd/es/table/interface';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@components/common/DataTable';
import { FilterBar } from '@components/common/FilterBar';
import { PageHeader } from '@components/common/PageHeader';
import { SearchInput } from '@components/common/SearchInput';
import { StatusPill } from '@components/common/StatusPill';
import { useGetPassengers } from '@hooks/usePassengers';
import { PaginationParams } from '@/types/common.types';
import { PassengerType } from '@/types/enums';
import { PassengerDto } from '@/types/passenger.types';
import { formatDateTime, passengerTypeLabels } from '@utils/format';
import { formatQuerySyncLabel, getLatestQueryTimestamp, getPassengerTone } from '@utils/presentation';

const { Text } = Typography;

export const PassengerListPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useState<PaginationParams>({
    page: 1,
    pageSize: 10,
    order: 'ASC',
    orderBy: 'id',
    searchTerm: ''
  });

  const passengersQuery = useGetPassengers(params);
  const lastUpdatedAt = getLatestQueryTimestamp(passengersQuery.dataUpdatedAt);

  const columns: ColumnsType<PassengerDto> = useMemo(
    () => [
      {
        title: 'Passenger',
        key: 'passenger',
        render: (_, record) => (
          <div style={{ display: 'grid', gap: 8, minWidth: 240 }}>
            <Text strong>{record.name}</Text>
            <Text type="secondary">{`${record.age} years old · Passport ${record.passportNumber}`}</Text>
            <Text type="secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{`PSG-${record.id}`}</Text>
          </div>
        ),
        sorter: true
      },
      {
        title: 'Type',
        dataIndex: 'passengerType',
        key: 'passengerType',
        width: 150,
        render: (value: PassengerType) => (
          <StatusPill label={passengerTypeLabels[value]} tone={getPassengerTone(value)} subtle />
        )
      },
      {
        title: 'Created at',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 170,
        render: (value: string | Date) => formatDateTime(value)
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 96,
        render: (_, record) => (
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/passengers/${record.id}`)} />
        )
      }
    ],
    [navigate]
  );

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<PassengerDto> | SorterResult<PassengerDto>[]
  ) => {
    const sorterObject = Array.isArray(sorter) ? sorter[0] : sorter;
    const orderBy = typeof sorterObject?.field === 'string' ? sorterObject.field : params.orderBy || 'id';
    const order = sorterObject?.order === 'descend' ? 'DESC' : 'ASC';

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
        eyebrow="Passenger directory"
        title="Passenger list"
        subtitle="Review identity-linked passenger records, passport details, and passenger types in one place."
        meta={formatQuerySyncLabel(lastUpdatedAt)}
      />

      <FilterBar
        summary={`${passengersQuery.data?.data.length || 0} visible / ${passengersQuery.data?.total || 0} total`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => passengersQuery.refetch()}>
              Refresh
            </Button>
            <Button onClick={() => setParams((prev) => ({ ...prev, searchTerm: '', page: 1 }))}>Clear</Button>
          </Space>
        }
      >
        <SearchInput
          placeholder="Search by name"
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

      <DataTable<PassengerDto>
        loading={passengersQuery.isFetching}
        columns={columns}
        dataSource={passengersQuery.data?.data || []}
        locale={
          passengersQuery.isError
            ? { emptyText: 'Unable to load the passenger list. Please try again.' }
            : undefined
        }
        onChange={handleTableChange}
        pagination={{
          current: passengersQuery.data?.page || 1,
          pageSize: passengersQuery.data?.pageSize || 10,
          total: passengersQuery.data?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50']
        }}
      />
    </>
  );
};
