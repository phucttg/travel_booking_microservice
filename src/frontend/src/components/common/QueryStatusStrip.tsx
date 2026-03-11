import { ReactNode } from 'react';
import { Space, Typography, theme } from 'antd';
import { formatQuerySyncLabel } from '@utils/presentation';
import { StatusPill } from '@components/common/StatusPill';

const { Text } = Typography;

type QueryState = 'ok' | 'loading' | 'error' | 'idle';

type QueryStatusStripProps = {
  title?: ReactNode;
  items: ReadonlyArray<{ label: string; state: QueryState }>;
  lastUpdatedAt?: number | null;
};

const toneByState: Record<QueryState, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  ok: 'success',
  loading: 'info',
  error: 'danger',
  idle: 'neutral'
};

const textByState: Record<QueryState, string> = {
  ok: 'Ready',
  loading: 'Syncing',
  error: 'Error',
  idle: 'Idle'
};

export const QueryStatusStrip = ({ title = 'Module status', items, lastUpdatedAt }: QueryStatusStripProps) => {
  const { token } = theme.useToken();

  return (
    <div
      className="app-surface"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 16px',
        borderRadius: token.borderRadiusLG
      }}
    >
      <Space direction="vertical" size={4}>
        <Text strong>{title}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatQuerySyncLabel(lastUpdatedAt)}
        </Text>
      </Space>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {items.map((item) => (
          <StatusPill key={item.label} label={`${item.label} · ${textByState[item.state]}`} tone={toneByState[item.state]} />
        ))}
      </div>
    </div>
  );
};
