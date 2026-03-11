import { ReactNode } from 'react';
import { Space, Typography } from 'antd';

const { Text, Title } = Typography;

type FormSectionProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

export const FormSection = ({ title, description, children }: FormSectionProps) => {
  return (
    <div className="form-section">
      <Space direction="vertical" size={4} style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
        {description && (
          <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
            {description}
          </Text>
        )}
      </Space>
      {children}
    </div>
  );
};
