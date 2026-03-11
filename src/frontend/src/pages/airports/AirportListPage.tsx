import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@components/common/DataTable';
import { FilterBar } from '@components/common/FilterBar';
import { PageHeader } from '@components/common/PageHeader';
import { useGetAirports } from '@hooks/useAirports';
import { AirportDto } from '@/types/airport.types';
import { formatDateTime } from '@utils/format';
import { formatQuerySyncLabel, getLatestQueryTimestamp } from '@utils/presentation';

const { Text } = Typography;

export const AirportListPage = () => {
  const navigate = useNavigate();
  const airportsQuery = useGetAirports();
  const lastUpdatedAt = getLatestQueryTimestamp(airportsQuery.dataUpdatedAt);

  const columns: ColumnsType<AirportDto> = [
    {
      title: 'Sân bay',
      key: 'airport',
      render: (_, record) => (
        <div style={{ display: 'grid', gap: 8, minWidth: 260 }}>
          <Text strong>{record.name}</Text>
          <Text type="secondary">{record.address}</Text>
          <Text style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{record.code}</Text>
        </div>
      )
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value: string) => formatDateTime(value)
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 110,
      render: () => (
        <Button icon={<EyeOutlined />} disabled>
          Xem
        </Button>
      )
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Airport registry"
        title="Quản lý sân bay"
        subtitle="Airport directory hiển thị code, name và address theo business context."
        meta={formatQuerySyncLabel(lastUpdatedAt)}
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/airports/create')}>
            Tạo mới
          </Button>
        }
      />

      <FilterBar
        summary={`${airportsQuery.data?.length || 0} airports in registry`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => airportsQuery.refetch()}>
              Refresh
            </Button>
          </Space>
        }
      >
        <Text type="secondary">Registry feed currently comes directly from airport service.</Text>
      </FilterBar>

      <DataTable<AirportDto>
        loading={airportsQuery.isFetching}
        columns={columns}
        dataSource={airportsQuery.data || []}
        pagination={false}
      />
    </>
  );
};
