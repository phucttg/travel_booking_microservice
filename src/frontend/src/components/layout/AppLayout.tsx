import { Grid, Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { Footer } from '@components/layout/Footer';
import { Header } from '@components/layout/Header';
import { Sidebar } from '@components/layout/Sidebar';

const { Content } = Layout;

export const AppLayout = () => {
  const screens = Grid.useBreakpoint();

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {screens.lg ? <Sidebar /> : <Sidebar mobile />}
      <Layout style={{ background: 'transparent' }}>
        <Header />
        <Content className="app-shell__content">
          <div className="app-content-shell">
            <div className="app-content-stack">
              <Outlet />
            </div>
          </div>
        </Content>
        <Footer />
      </Layout>
    </Layout>
  );
};
