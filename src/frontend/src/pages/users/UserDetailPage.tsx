import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Row, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { EntityHero } from '@components/common/EntityHero';
import { PageHeader } from '@components/common/PageHeader';
import { PageSkeleton } from '@components/common/PageSkeleton';
import { SectionCard } from '@components/common/SectionCard';
import { StatusPill } from '@components/common/StatusPill';
import { useDeleteUser, useGetUserById } from '@hooks/useUsers';
import { formatDateTime, passengerTypeLabels, roleLabels } from '@utils/format';
import { getPassengerTone, getRoleTone } from '@utils/presentation';
import { parseRouteId } from '@utils/helpers';

export const UserDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const userId = parseRouteId(id);

  const userQuery = useGetUserById(userId);
  const deleteMutation = useDeleteUser();

  const user = userQuery.data;

  if (userQuery.isLoading && !user) {
    return <PageSkeleton variant="detail" />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Identity profile"
        title="Chi tiết người dùng"
        subtitle="Entity view cho user profile, role và verification state."
        onBack={() => navigate('/users')}
        extra={
          <Space>
            <Button icon={<EditOutlined />} size="large" onClick={() => navigate(`/users/${userId}/edit`)}>
              Sửa
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              size="large"
              loading={deleteMutation.isPending}
              onClick={async () => {
                await deleteMutation.mutateAsync(userId);
                navigate('/users');
              }}
            >
              Xóa
            </Button>
          </Space>
        }
      />

      {user && (
        <>
          <EntityHero
            eyebrow="User record"
            title={`${user.name} · ${user.email}`}
            subtitle={`Passport ${user.passportNumber}. This profile is currently marked as ${user.isEmailVerified ? 'verified' : 'pending verification'}.`}
            tags={
              <>
                <StatusPill label={roleLabels[user.role]} tone={getRoleTone(user.role)} />
                <StatusPill label={passengerTypeLabels[user.passengerType]} tone={getPassengerTone(user.passengerType)} />
                <StatusPill label={user.isEmailVerified ? 'Verified' : 'Pending'} tone={user.isEmailVerified ? 'success' : 'warning'} />
              </>
            }
            meta={`USR-${user.id} · Created ${formatDateTime(user.createdAt)}`}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <SectionCard title="Profile details" subtitle="Core identity payload">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="ID">{user.id}</Descriptions.Item>
                  <Descriptions.Item label="Tên">{user.name}</Descriptions.Item>
                  <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
                  <Descriptions.Item label="Passport">{user.passportNumber}</Descriptions.Item>
                  <Descriptions.Item label="Tuổi">{user.age}</Descriptions.Item>
                  <Descriptions.Item label="Passenger type">{passengerTypeLabels[user.passengerType]}</Descriptions.Item>
                </Descriptions>
              </SectionCard>
            </Col>
            <Col xs={24} xl={12}>
              <SectionCard title="Access and audit" subtitle="Role and timestamps">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Role">
                    <StatusPill label={roleLabels[user.role]} tone={getRoleTone(user.role)} subtle />
                  </Descriptions.Item>
                  <Descriptions.Item label="Email verified">
                    <StatusPill label={user.isEmailVerified ? 'Verified' : 'Pending'} tone={user.isEmailVerified ? 'success' : 'warning'} subtle />
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày tạo">{formatDateTime(user.createdAt)}</Descriptions.Item>
                  <Descriptions.Item label="Ngày cập nhật">{formatDateTime(user.updatedAt)}</Descriptions.Item>
                </Descriptions>
              </SectionCard>
            </Col>
          </Row>
        </>
      )}
    </>
  );
};
