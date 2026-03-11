import { ArrowRightOutlined } from '@ant-design/icons';
import { Space, Typography, theme } from 'antd';

const { Text } = Typography;

type RouteBadgeProps = {
  fromCode: string;
  toCode: string;
  fromName?: string;
  toName?: string;
  compact?: boolean;
};

export const RouteBadge = ({
  fromCode,
  toCode,
  fromName,
  toName,
  compact = false
}: RouteBadgeProps) => {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: compact ? 4 : 6,
        minWidth: compact ? 0 : 180
      }}
    >
      <Space size={compact ? 6 : 10} align="center">
        <Text
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: compact ? 12 : 13,
            fontWeight: 700,
            color: token.colorTextBase
          }}
        >
          {fromCode}
        </Text>
        <ArrowRightOutlined style={{ color: token.colorPrimary }} />
        <Text
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: compact ? 12 : 13,
            fontWeight: 700,
            color: token.colorTextBase
          }}
        >
          {toCode}
        </Text>
      </Space>
      {(fromName || toName) && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {[fromName, toName].filter(Boolean).join(' to ')}
        </Text>
      )}
    </div>
  );
};
