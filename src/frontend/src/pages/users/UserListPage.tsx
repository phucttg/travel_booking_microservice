import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Space, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '@components/common/ConfirmModal';
import { DataTable } from '@components/common/DataTable';
import { FilterBar } from '@components/common/FilterBar';
import { PageHeader } from '@components/common/PageHeader';
import { SearchInput } from '@components/common/SearchInput';
import { StatusPill } from '@components/common/StatusPill';
import { useDeleteUser, useGetUsers } from '@hooks/useUsers';
import { PaginationParams } from '@/types/common.types';
import { PassengerType, Role } from '@/types/enums';
import { UserDto } from '@/types/user.types';
import { formatDateTime, passengerTypeLabels, roleLabels } from '@utils/format';
import {
  formatQuerySyncLabel,
  getLatestQueryTimestamp,
  getPassengerTone,
  getRoleTone
} from '@utils/presentation';

const { Text } = Typography;

export const UserListPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useState<PaginationParams>({
    page: 1,
    pageSize: 10,
    order: 'ASC',
    orderBy: 'id',
    searchTerm: ''
  });
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const usersQuery = useGetUsers(params);
  const deleteMutation = useDeleteUser();
  const lastUpdatedAt = getLatestQueryTimestamp(usersQuery.dataUpdatedAt);

  const columns: ColumnsType<UserDto> = useMemo(
    () => [
      {
        title: 'Người dùng',
        key: 'identity',
        render: (_, record) => (
          <div style={{ display: 'grid', gap: 8, minWidth: 260 }}>
            <Button
              type="link"
              style={{ padding: 0, justifyContent: 'flex-start', fontWeight: 700 }}
              onClick={() => navigate(`/users/${record.id}`)}
            >
              {record.email}
            </Button>
            <Text>{record.name}</Text>
            <Text type="secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {`USR-${record.id} · ${record.passportNumber} · ${record.age}y`}
            </Text>
          </div>
        ),
        sorter: true
      },
      {
        title: 'Vai trò',
        dataIndex: 'role',
        key: 'role',
        width: 130,
        render: (value: Role) => <StatusPill label={roleLabels[value]} tone={getRoleTone(value)} subtle />
      },
      {
        title: 'Passenger',
        dataIndex: 'passengerType',
        key: 'passengerType',
        width: 150,
        render: (value: PassengerType) => (
          <StatusPill label={passengerTypeLabels[value]} tone={getPassengerTone(value)} subtle />
        )
      },
      {
        title: 'Email verified',
        dataIndex: 'isEmailVerified',
        key: 'isEmailVerified',
        width: 150,
        render: (value: boolean) => (
          <StatusPill label={value ? 'Verified' : 'Pending'} tone={value ? 'success' : 'warning'} subtle />
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
        key: 'actions',
        width: 160,
        render: (_, record) => (
          <Space size="small">
            <Button icon={<EyeOutlined />} onClick={() => navigate(`/users/${record.id}`)} />
            <Button icon={<EditOutlined />} onClick={() => navigate(`/users/${record.id}/edit`)} />
            <Button danger icon={<DeleteOutlined />} onClick={() => setDeletingUserId(record.id)} />
          </Space>
        )
      }
    ],
    [navigate]
  );

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<UserDto> | SorterResult<UserDto>[]
  ) => {
    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const orderBy = typeof activeSorter?.field === 'string' ? activeSorter.field : params.orderBy;
    const order = activeSorter?.order === 'descend' ? 'DESC' : 'ASC';

    setParams((prev) => ({
      ...prev,
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 10,
      orderBy,
      order
    }));
  };

  const closeConfirm = () => setDeletingUserId(null);

  return (
    <>
      <PageHeader
        eyebrow="Identity directory"
        title="Quản lý người dùng"
        subtitle="List page nhấn mạnh business identity, role và verification state thay vì đặt ID làm trọng tâm."
        meta={formatQuerySyncLabel(lastUpdatedAt)}
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/users/create')}>
            Tạo mới
          </Button>
        }
      />

      <FilterBar
        summary={`${usersQuery.data?.data.length || 0} visible / ${usersQuery.data?.total || 0} total`}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => usersQuery.refetch()}>
              Refresh
            </Button>
            <Button onClick={() => setParams((prev) => ({ ...prev, searchTerm: '', page: 1 }))}>Clear</Button>
          </Space>
        }
      >
        <SearchInput
          placeholder="Tìm theo tên hoặc email"
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

      <DataTable<UserDto>
        loading={usersQuery.isFetching}
        columns={columns}
        dataSource={usersQuery.data?.data || []}
        locale={
          usersQuery.isError
            ? { emptyText: 'Không tải được danh sách người dùng. Vui lòng thử lại.' }
            : undefined
        }
        onChange={handleTableChange}
        pagination={{
          current: usersQuery.data?.page || 1,
          pageSize: usersQuery.data?.pageSize || 10,
          total: usersQuery.data?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50']
        }}
      />

      <ConfirmModal
        title="Xóa user"
        description="Bạn có chắc chắn muốn xóa user này không?"
        open={Boolean(deletingUserId)}
        confirmLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deletingUserId) return;
          await deleteMutation.mutateAsync(deletingUserId);
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </>
  );
};
