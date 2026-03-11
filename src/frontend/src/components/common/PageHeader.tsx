import { ArrowLeftOutlined } from '@ant-design/icons';
import { Breadcrumb, Button, Space, Typography } from 'antd';
import { ReactNode } from 'react';

const { Text, Title } = Typography;

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  breadcrumbItems?: { title: ReactNode }[];
  extra?: ReactNode;
  meta?: ReactNode;
  onBack?: () => void;
};

export const PageHeader = ({
  title,
  eyebrow,
  subtitle,
  breadcrumbItems,
  extra,
  meta,
  onBack
}: PageHeaderProps) => {
  return (
    <div className="app-surface" style={{ padding: 20, borderRadius: 24 }}>
      {breadcrumbItems && breadcrumbItems.length > 0 && (
        <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 8 }} />
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: '100%',
          justifyContent: 'space-between',
          gap: 16
        }}
      >
        <Space align="start" size={14}>
          {onBack && (
            <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={onBack} style={{ marginTop: 4 }} />
          )}
          <Space direction="vertical" size={6}>
            {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
            <Title level={2} style={{ margin: 0, fontSize: 30 }}>
              {title}
            </Title>
            {subtitle && (
              <Text type="secondary" style={{ fontSize: 14, lineHeight: 1.7 }}>
                {subtitle}
              </Text>
            )}
            {meta && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {meta}
              </Text>
            )}
          </Space>
        </Space>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
};
