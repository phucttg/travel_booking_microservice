import { ReactNode } from 'react';
import { Card, Space, Typography, theme } from 'antd';

const { Text, Title } = Typography;

type SectionCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  bodyPadding?: number;
};

export const SectionCard = ({
  title,
  subtitle,
  extra,
  children,
  bodyPadding = 20
}: SectionCardProps) => {
  const { token } = theme.useToken();

  return (
    <Card
      className="app-surface"
      styles={{ body: { padding: bodyPadding } }}
      style={{ borderRadius: token.borderRadiusLG }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <Space direction="vertical" size={4}>
          <Title level={4} style={{ margin: 0, fontSize: 20 }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              {subtitle}
            </Text>
          )}
        </Space>
        {extra && <div>{extra}</div>}
      </div>
      {children}
    </Card>
  );
};
