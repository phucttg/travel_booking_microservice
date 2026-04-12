import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@components/common/DataTable';
import { FilterBar } from '@components/common/FilterBar';
import { PageHeader } from '@components/common/PageHeader';
import { useGetAircrafts } from '@hooks/useAircrafts';
import { AircraftDto } from '@/types/aircraft.types';
import { formatDateTime } from '@utils/format';
import { formatQuerySyncLabel, getLatestQueryTimestamp } from '@utils/presentation';

const { Text } = Typography;

export const AircraftListPage = () => {
  const navigate = useNavigate();
  const aircraftsQuery = useGetAircrafts();
  const lastUpdatedAt = getLatestQueryTimestamp(aircraftsQuery.dataUpdatedAt);

  const columns: ColumnsType<AircraftDto> = [
    {
      title: 'Aircraft',
      key: 'aircraft',
      render: (_, record) => (
        <div style={{ display: 'grid', gap: 8, minWidth: 260 }}>
          <Text strong>{record.name}</Text>
          <Text type="secondary">{`Model ${record.model} · Manufactured ${record.manufacturingYear}`}</Text>
          <Text style={{ fontFamily: '"JetBrains Mono", monospace' }}>{`AC-${record.id}`}</Text>
        </div>
      )
    },
    {
      title: 'Created at',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value: string) => formatDateTime(value)
    },
    {
      title: 'Actions',
      key: 'action',
      width: 110,
      render: () => (
        <Button icon={<EyeOutlined />} disabled>
          View
        </Button>
      )
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Fleet registry"
        title="Aircraft management"
        subtitle="Review aircraft names, models, and manufacturing years in a fleet registry view."
        meta={formatQuerySyncLabel(lastUpdatedAt)}
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/aircrafts/create')}>
            Create aircraft
          </Button>
        }
      />

      <FilterBar
        summary={`${aircraftsQuery.data?.length || 0} aircraft records`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => aircraftsQuery.refetch()}>
              Refresh
            </Button>
          </Space>
        }
      >
        <Text type="secondary">Fleet records are currently managed from the aircraft service feed.</Text>
      </FilterBar>

      <DataTable<AircraftDto>
        loading={aircraftsQuery.isFetching}
        columns={columns}
        dataSource={aircraftsQuery.data || []}
        pagination={false}
      />
    </>
  );
};
