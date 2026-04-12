import { Empty, Typography } from 'antd';
import { ReactNode } from 'react';

const { Text, Title } = Typography;

type EmptyStateProps = {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
};

export const EmptyState = ({
  icon,
  title = 'No data yet',
  description = 'No data available',
  action
}: EmptyStateProps) => {
  return (
    <div className="app-surface" style={{ borderRadius: 24, padding: 28 }}>
      <Empty
        image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div style={{ display: 'grid', gap: 6 }}>
            <Title level={5} style={{ margin: 0 }}>
              {title}
            </Title>
            <Text type="secondary">{description}</Text>
          </div>
        }
      >
        {action}
      </Empty>
    </div>
  );
};
