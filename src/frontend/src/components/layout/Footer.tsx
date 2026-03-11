import { Layout } from 'antd';

const { Footer: AntFooter } = Layout;

export const Footer = () => {
  return (
    <AntFooter
      style={{
        textAlign: 'center',
        background: 'transparent',
        color: '#486581',
        padding: '12px 20px 24px'
      }}
    >
      Booking Operations Workspace ©2026
    </AntFooter>
  );
};
