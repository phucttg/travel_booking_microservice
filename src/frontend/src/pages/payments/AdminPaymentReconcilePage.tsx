import { Button, Col, Form, Input, Modal, Row, Select, Space, Table, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/common/PageHeader';
import { SectionCard } from '@components/common/SectionCard';
import { StatusPill } from '@components/common/StatusPill';
import {
  useApproveWalletTopupRequest,
  useGetAdminWalletTopupRequests,
  useRejectWalletTopupRequest
} from '@hooks/usePayments';
import { WalletTopupRequestStatus } from '@/types/enums';
import { WalletTopupRequestDto } from '@/types/payment.types';
import { formatCurrency, formatDateTime } from '@utils/format';

const { Text } = Typography;

const topupStatusTone: Record<WalletTopupRequestStatus, 'success' | 'warning' | 'danger'> = {
  [WalletTopupRequestStatus.PENDING]: 'warning',
  [WalletTopupRequestStatus.APPROVED]: 'success',
  [WalletTopupRequestStatus.REJECTED]: 'danger'
};

const topupStatusLabel: Record<WalletTopupRequestStatus, string> = {
  [WalletTopupRequestStatus.PENDING]: 'Pending',
  [WalletTopupRequestStatus.APPROVED]: 'Approved',
  [WalletTopupRequestStatus.REJECTED]: 'Rejected'
};

type RejectFormValues = {
  rejectionReason: string;
};

export const AdminPaymentReconcilePage = () => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<WalletTopupRequestStatus | undefined>(WalletTopupRequestStatus.PENDING);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRejectRequest, setSelectedRejectRequest] = useState<WalletTopupRequestDto | null>(null);
  const [rejectForm] = Form.useForm<RejectFormValues>();

  const topupRequestsQuery = useGetAdminWalletTopupRequests(filterStatus, true);
  const approveMutation = useApproveWalletTopupRequest();
  const rejectMutation = useRejectWalletTopupRequest();

  const requests = useMemo(() => topupRequestsQuery.data || [], [topupRequestsQuery.data]);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === WalletTopupRequestStatus.PENDING).length,
    [requests]
  );

  const handleOpenRejectModal = (request: WalletTopupRequestDto) => {
    setSelectedRejectRequest(request);
    setRejectModalOpen(true);
  };

  const handleCloseRejectModal = () => {
    setRejectModalOpen(false);
    setSelectedRejectRequest(null);
    rejectForm.resetFields();
  };

  const handleRejectRequest = async (values: RejectFormValues) => {
    if (!selectedRejectRequest) {
      return;
    }

    await rejectMutation.mutateAsync({
      id: selectedRejectRequest.id,
      payload: {
        rejectionReason: values.rejectionReason.trim()
      }
    });

    handleCloseRejectModal();
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin wallet ops"
        title="Review wallet top-up requests"
        subtitle="Review wallet top-up requests submitted by users and approve or reject them after checking the transfer details."
        onBack={() => navigate('/dashboard')}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <SectionCard title="Top-up request filters" subtitle="Track the current status of the top-up review inbox.">
            <Space wrap size={[12, 12]}>
              <Select<WalletTopupRequestStatus | undefined>
                allowClear
                placeholder="Filter by status"
                value={filterStatus}
                onChange={(value) => setFilterStatus(value)}
                style={{ minWidth: 220 }}
                options={[
                  { label: 'Pending', value: WalletTopupRequestStatus.PENDING },
                  { label: 'Approved', value: WalletTopupRequestStatus.APPROVED },
                  { label: 'Rejected', value: WalletTopupRequestStatus.REJECTED }
                ]}
              />
              <Button onClick={() => topupRequestsQuery.refetch()} loading={topupRequestsQuery.isFetching}>
                Refresh
              </Button>
              <Text type="secondary">{`Visible requests: ${requests.length}`}</Text>
              <Text type="secondary">{`Pending in list: ${pendingCount}`}</Text>
            </Space>
          </SectionCard>
        </Col>

        <Col xs={24}>
          <SectionCard title="Top-up request inbox" subtitle="Approve the requested amount or reject the request with a reason.">
            <Table<WalletTopupRequestDto>
              rowKey="id"
              loading={topupRequestsQuery.isFetching}
              dataSource={requests}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              columns={[
                {
                  title: 'Request',
                  key: 'request',
                  render: (_, record) => (
                    <Space direction="vertical" size={4}>
                      <Text strong>{`#${record.id}`}</Text>
                      <Text type="secondary">{`User #${record.userId}`}</Text>
                      <StatusPill label={topupStatusLabel[record.status]} tone={topupStatusTone[record.status]} subtle />
                    </Space>
                  )
                },
                {
                  title: 'Amount',
                  dataIndex: 'amount',
                  key: 'amount',
                  render: (value: number, record) => <Text strong>{formatCurrency(value, record.currency)}</Text>
                },
                {
                  title: 'Transaction code',
                  dataIndex: 'providerTxnId',
                  key: 'providerTxnId',
                  render: (value: string) => (
                    <Text style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{value}</Text>
                  )
                },
                {
                  title: 'Transfer note',
                  dataIndex: 'transferContent',
                  key: 'transferContent',
                  render: (value: string) => <Text>{value}</Text>
                },
                {
                  title: 'Review',
                  key: 'review',
                  render: (_, record) => (
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">{`Created at: ${formatDateTime(record.createdAt)}`}</Text>
                      <Text type="secondary">{`Reviewed at: ${formatDateTime(record.reviewedAt)}`}</Text>
                      {record.rejectionReason ? <Text type="danger">{`Rejection reason: ${record.rejectionReason}`}</Text> : null}
                    </Space>
                  )
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_, record) => (
                    <Space wrap>
                      <Button
                        type="primary"
                        disabled={record.status !== WalletTopupRequestStatus.PENDING}
                        loading={approveMutation.isPending}
                        onClick={async () => {
                          await approveMutation.mutateAsync(record.id);
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        danger
                        disabled={record.status !== WalletTopupRequestStatus.PENDING}
                        loading={rejectMutation.isPending}
                        onClick={() => handleOpenRejectModal(record)}
                      >
                        Reject
                      </Button>
                    </Space>
                  )
                }
              ]}
            />
          </SectionCard>
        </Col>
      </Row>

      <Modal
        title={selectedRejectRequest ? `Reject request #${selectedRejectRequest.id}` : 'Reject request'}
        open={rejectModalOpen}
        onCancel={handleCloseRejectModal}
        onOk={() => rejectForm.submit()}
        okText="Confirm rejection"
        cancelText="Close"
        confirmLoading={rejectMutation.isPending}
      >
        <Form<RejectFormValues> layout="vertical" form={rejectForm} onFinish={handleRejectRequest}>
          <Form.Item
            label="Rejection reason"
            name="rejectionReason"
            rules={[{ required: true, message: 'Please enter a rejection reason' }]}
          >
            <Input.TextArea rows={4} maxLength={500} placeholder="Example: Transfer note does not match" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
