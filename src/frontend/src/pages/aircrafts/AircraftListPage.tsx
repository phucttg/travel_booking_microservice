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
      title: 'Máy bay',
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
        eyebrow="Fleet registry"
        title="Quản lý máy bay"
        subtitle="Aircraft list làm rõ tên tàu bay, model và năm sản xuất như một inventory registry."
        meta={formatQuerySyncLabel(lastUpdatedAt)}
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/aircrafts/create')}>
            Tạo mới
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
