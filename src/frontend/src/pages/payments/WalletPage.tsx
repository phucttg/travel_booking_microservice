import { Alert, Button, Col, Form, Input, InputNumber, Row, Space, Table, Typography } from 'antd';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@components/common/PageHeader';
import { SectionCard } from '@components/common/SectionCard';
import { StatusPill } from '@components/common/StatusPill';
import { useCreateWalletTopupRequest, useGetMyWalletTopupRequests, useGetWalletMe } from '@hooks/usePayments';
import { WalletTopupRequestStatus } from '@/types/enums';
import { CreateWalletTopupRequest, WalletTopupRequestDto } from '@/types/payment.types';
import { formatCurrency, formatDateTime } from '@utils/format';
import { normalizeProblemError } from '@utils/helpers';

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

export const WalletPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateWalletTopupRequest>();
  const walletQuery = useGetWalletMe(true);
  const myTopupsQuery = useGetMyWalletTopupRequests(true);
  const createTopupMutation = useCreateWalletTopupRequest();
  const topupRequests = useMemo(
    () => (Array.isArray(myTopupsQuery.data) ? myTopupsQuery.data : []),
    [myTopupsQuery.data]
  );
  const walletError = walletQuery.isError ? normalizeProblemError(walletQuery.error) : null;
  const topupsError = myTopupsQuery.isError ? normalizeProblemError(myTopupsQuery.error) : null;
  const hasWalletDataError = Boolean(walletError || topupsError);
  const walletDataErrorDescription = [walletError?.message, topupsError?.message]
    .filter((message): message is string => Boolean(message))
    .join(' | ');

  const pendingCount = useMemo(
    () =>
      topupRequests.filter((request) => request.status === WalletTopupRequestStatus.PENDING).length,
    [topupRequests]
  );

  const handleSubmitTopupRequest = async (values: CreateWalletTopupRequest) => {
    await createTopupMutation.mutateAsync({
      amount: Number(values.amount),
      transferContent: values.transferContent.trim(),
      providerTxnId: values.providerTxnId.trim()
    });

    form.resetFields();
  };

  return (
    <>
      <PageHeader
        eyebrow="Wallet"
        title="My Wallet"
        subtitle="Your wallet balance starts at 0. Create a top-up request and wait for manual admin approval."
        onBack={() => navigate('/dashboard')}
      />

      {hasWalletDataError && (
        <Alert
          type="error"
          showIcon
          message="Unable to load wallet data"
          description={
            walletDataErrorDescription || 'The system returned data in an unexpected format. Please try again.'
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <SectionCard title="Wallet Balance" subtitle="Available balance for booking payments">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Text style={{ fontSize: 32, fontWeight: 800 }}>
                {formatCurrency(walletQuery.data?.balance || 0, walletQuery.data?.currency || 'VND')}
              </Text>
              <Text type="secondary">{`Pending requests: ${pendingCount}/3`}</Text>
              <Space wrap>
                <Button onClick={() => walletQuery.refetch()} loading={walletQuery.isFetching}>
                  Refresh balance
                </Button>
                <Button onClick={() => myTopupsQuery.refetch()} loading={myTopupsQuery.isFetching}>
                  Refresh requests
                </Button>
              </Space>
            </Space>
          </SectionCard>

          <SectionCard title="Create top-up request" subtitle="Enter your bank transfer details for admin review">
            <Form<CreateWalletTopupRequest> layout="vertical" form={form} onFinish={handleSubmitTopupRequest}>
              <Form.Item
                label="Top-up amount"
                name="amount"
                rules={[{ required: true, message: 'Please enter the top-up amount' }]}
              >
                <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="e.g. 500000" />
              </Form.Item>

              <Form.Item
                label="Bank transaction ID (providerTxnId)"
                name="providerTxnId"
                rules={[{ required: true, message: 'Please enter the transaction ID' }]}
              >
                <Input placeholder="e.g. VCB-20260320-0001" />
              </Form.Item>

              <Form.Item
                label="Transfer note"
                name="transferContent"
                rules={[{ required: true, message: 'Please enter the transfer note' }]}
              >
                <Input.TextArea rows={4} placeholder="e.g. TOPUP USER NGUYEN VAN A" />
              </Form.Item>

              <Space wrap>
                <Button type="primary" htmlType="submit" loading={createTopupMutation.isPending}>
                  Submit top-up request
                </Button>
                <Button onClick={() => form.resetFields()} disabled={createTopupMutation.isPending}>
                  Reset form
                </Button>
              </Space>
            </Form>
          </SectionCard>
        </Col>

        <Col xs={24} xl={14}>
          <SectionCard title="Top-up request history" subtitle="Track approval status and rejection reason, if any">
            {pendingCount >= 3 && (
              <Alert
                type="warning"
                showIcon
                message="You already have 3 pending requests"
                description="Please wait for admin to review one or more requests before creating a new request."
                style={{ marginBottom: 16 }}
              />
            )}

            <Table<WalletTopupRequestDto>
              rowKey="id"
              loading={myTopupsQuery.isFetching}
              dataSource={topupRequests}
              pagination={{ pageSize: 8, showSizeChanger: true }}
              columns={[
                {
                  title: 'Request',
                  key: 'request',
                  render: (_, record) => (
                    <Space direction="vertical" size={4}>
                      <Text strong>{`#${record.id}`}</Text>
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
                  title: 'Transaction ID',
                  dataIndex: 'providerTxnId',
                  key: 'providerTxnId',
                  render: (value: string) => (
                    <Text style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>{value}</Text>
                  )
                },
                {
                  title: 'Transfer Note',
                  dataIndex: 'transferContent',
                  key: 'transferContent'
                },
                {
                  title: 'Timestamps',
                  key: 'time',
                  render: (_, record) => (
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">{`Submitted: ${formatDateTime(record.createdAt)}`}</Text>
                      <Text type="secondary">{`Reviewed: ${formatDateTime(record.reviewedAt)}`}</Text>
                    </Space>
                  )
                },
                {
                  title: 'Notes',
                  key: 'note',
                  render: (_, record) =>
                    record.rejectionReason ? <Text type="danger">{record.rejectionReason}</Text> : <Text type="secondary">-</Text>
                }
              ]}
            />
          </SectionCard>
        </Col>
      </Row>
    </>
  );
};
