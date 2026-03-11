import { Card, Skeleton, Space } from 'antd';

type PageSkeletonProps = {
  variant?: 'dashboard' | 'table' | 'detail' | 'form';
};

export const PageSkeleton = ({ variant = 'table' }: PageSkeletonProps) => {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="app-surface">
        <Skeleton active paragraph={{ rows: variant === 'detail' ? 3 : 2 }} title={{ width: '42%' }} />
      </Card>
      <Card className="app-surface">
        <Skeleton
          active
          paragraph={{
            rows:
              variant === 'dashboard'
                ? 6
                : variant === 'form'
                  ? 8
                  : variant === 'detail'
                    ? 7
                    : 5
          }}
        />
      </Card>
    </Space>
  );
};
