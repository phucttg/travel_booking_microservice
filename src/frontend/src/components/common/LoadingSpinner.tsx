import { Space, Spin, Typography } from 'antd';

const { Text } = Typography;

type LoadingSpinnerProps = {
  fullScreen?: boolean;
  label?: string;
};

export const LoadingSpinner = ({ fullScreen = false, label = 'Syncing workspace...' }: LoadingSpinnerProps) => {
  if (fullScreen) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Space direction="vertical" size={12} align="center">
          <Spin size="large" />
          <Text type="secondary">{label}</Text>
        </Space>
      </div>
    );
  }

  return (
    <Space direction="vertical" size={8} align="center" style={{ width: '100%' }}>
      <Spin />
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Text>
    </Space>
  );
};
