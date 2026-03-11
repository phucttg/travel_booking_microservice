import { ReactNode } from 'react';
import { Space, Typography, theme } from 'antd';

const { Text } = Typography;

type FilterBarProps = {
  summary?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export const FilterBar = ({ summary, actions, children }: FilterBarProps) => {
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
        padding: 16,
        borderRadius: token.borderRadiusLG
      }}
    >
      <div style={{ display: 'flex', flex: '1 1 360px', flexWrap: 'wrap', gap: 12 }}>{children}</div>
      <Space direction="vertical" size={6} style={{ alignItems: 'flex-end', marginLeft: 'auto' }}>
        {summary && (
          <Text type="secondary" style={{ fontSize: 12, textAlign: 'right' }}>
            {summary}
          </Text>
        )}
        {actions}
      </Space>
    </div>
  );
};
