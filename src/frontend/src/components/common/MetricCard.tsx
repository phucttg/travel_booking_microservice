import { ReactNode } from 'react';
import { Card, Typography, theme } from 'antd';

const { Text, Title } = Typography;

type MetricCardProps = {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: ReactNode;
  accent?: string;
};

export const MetricCard = ({ label, value, caption, icon, accent = '#0f6cbd' }: MetricCardProps) => {
  const { token } = theme.useToken();

  return (
    <Card
      className="app-surface"
      styles={{ body: { padding: 20 } }}
      style={{
        borderRadius: token.borderRadiusLG,
        minHeight: 148,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,253,0.96) 100%)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <Text
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: accent
              }}
            >
              {label}
            </Text>
            <Title level={2} style={{ margin: '10px 0 0', fontSize: 28 }}>
              {value}
            </Title>
          </div>
          {icon && (
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                display: 'grid',
                placeItems: 'center',
                background: `${accent}14`,
                color: accent,
                fontSize: 20,
                flexShrink: 0
              }}
            >
              {icon}
            </div>
          )}
        </div>
        {caption && (
          <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
            {caption}
          </Text>
        )}
      </div>
    </Card>
  );
};
