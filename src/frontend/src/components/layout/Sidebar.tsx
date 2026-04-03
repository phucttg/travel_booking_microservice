import {
  BookOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  RocketOutlined,
  SendOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import { Drawer, Layout, Menu, Space, Typography } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';
import { useUiStore } from '@stores/ui.store';

const { Sider } = Layout;
const { Text, Title } = Typography;

const getMenuItems = (isAdmin: boolean): ItemType[] => {
  const base: ItemType[] = [
    { key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: '/flights', label: 'Flights', icon: <RocketOutlined /> },
    { key: '/wallet', label: 'My Wallet', icon: <CreditCardOutlined /> },
    {
      key: 'bookings',
      label: 'Bookings',
      icon: <BookOutlined />,
      children: [
        { key: '/bookings', label: 'List' },
        { key: '/bookings/create', label: 'New booking' }
      ]
    }
  ];

  if (!isAdmin) return base;

  base.push(
    {
      type: 'group',
      key: 'admin-group',
      label: 'MANAGEMENT',
      children: [
        { key: '/users', label: 'Users', icon: <UserOutlined /> },
        { key: '/passengers', label: 'Passengers', icon: <TeamOutlined /> },
        { key: '/airports', label: 'Airports', icon: <EnvironmentOutlined /> },
        { key: '/aircrafts', label: 'Aircraft', icon: <SendOutlined /> },
        { key: '/payments/reconcile', label: 'Review wallet top-ups', icon: <CreditCardOutlined /> }
      ]
    } as ItemType
  );

  return base;
};

type SidebarProps = {
  mobile?: boolean;
};

type NavigationContentProps = {
  collapsed?: boolean;
};

const NavigationContent = ({ collapsed = false }: NavigationContentProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuthStore();
  const { closeMobileSidebar } = useUiStore();

  return (
    <>
      <div style={{ padding: '22px 18px 12px' }}>
        <div
          style={{
            display: 'grid',
            gap: 14,
            padding: collapsed ? 14 : 18,
            borderRadius: 22,
            background:
              'linear-gradient(150deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.12)'
          }}
        >
          <Space size={14} align="start">
            <div
              style={{
                width: collapsed ? 42 : 48,
                height: collapsed ? 42 : 48,
                borderRadius: 16,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, #56c2ff 0%, #8bf3d7 100%)',
                color: '#062033',
                fontWeight: 800
              }}
            >
              SB
            </div>
            {!collapsed && (
              <Space direction="vertical" size={2}>
                <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
                  SkyBooking
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.72)' }}>Flight booking system</Text>
              </Space>
            )}
          </Space>

          {!collapsed && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 999,
                width: 'fit-content',
                background: 'rgba(86, 194, 255, 0.16)',
                color: '#dff6ff',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}
            >
              <GlobalOutlined />
              Multi-service stack
            </div>
          )}
        </div>
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={getMenuItems(isAdmin())}
        style={{ background: 'transparent', borderInlineEnd: 'none', paddingInline: 12 }}
        onClick={({ key }) => {
          if (typeof key === 'string' && key.startsWith('/')) {
            navigate(key);
            closeMobileSidebar();
          }
        }}
      />
    </>
  );
};

export const Sidebar = ({ mobile = false }: SidebarProps) => {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useUiStore();

  if (mobile) {
    return (
      <Drawer
        placement="left"
        open={mobileSidebarOpen}
        onClose={closeMobileSidebar}
        width={300}
        closable={false}
        styles={{
          body: { padding: 0, background: '#0b1d2a' },
          content: { background: '#0b1d2a' }
        }}
      >
        <NavigationContent />
      </Drawer>
    );
  }

  return (
    <Sider
      collapsible
      collapsed={sidebarCollapsed}
      onCollapse={toggleSidebar}
      width={296}
      collapsedWidth={96}
      theme="dark"
      style={{
        background:
          'linear-gradient(180deg, #0b1d2a 0%, #132739 44%, #11283e 100%)',
        borderInlineEnd: '1px solid rgba(255,255,255,0.04)',
        paddingBlock: 8
      }}
    >
      <NavigationContent collapsed={sidebarCollapsed} />
    </Sider>
  );
};
