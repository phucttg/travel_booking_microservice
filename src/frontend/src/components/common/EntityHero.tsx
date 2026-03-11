import { ReactNode } from 'react';
import { Space, Typography, theme } from 'antd';

const { Text, Title } = Typography;

type EntityHeroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  tags?: ReactNode;
  extra?: ReactNode;
};

export const EntityHero = ({ eyebrow, title, subtitle, meta, tags, extra }: EntityHeroProps) => {
  const { token } = theme.useToken();

  return (
    <div
      className="hero-surface"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: 24,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorder}`,
        background:
          'linear-gradient(140deg, rgba(15,108,189,0.12) 0%, rgba(19,144,140,0.08) 48%, rgba(255,255,255,0.96) 100%)',
        boxShadow: token.boxShadowSecondary
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 'auto -64px -84px auto',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(19,144,140,0.16) 0%, rgba(19,144,140,0) 72%)'
        }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20, position: 'relative' }}>
        <Space direction="vertical" size={10} style={{ maxWidth: 780 }}>
          {eyebrow && (
            <Text
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: token.colorPrimary
              }}
            >
              {eyebrow}
            </Text>
          )}
          <Title level={2} style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <Text style={{ fontSize: 15, lineHeight: 1.7, color: '#334e68' }}>
              {subtitle}
            </Text>
          )}
          {tags && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{tags}</div>}
          {meta && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              {meta}
            </Text>
          )}
        </Space>
        {extra && <div style={{ minWidth: 220 }}>{extra}</div>}
      </div>
    </div>
  );
};
