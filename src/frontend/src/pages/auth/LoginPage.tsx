import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLogin } from '@hooks/useAuth';
import { loginSchema } from '@utils/validation';

const { Title, Text } = Typography;

type LoginFormValues = z.infer<typeof loginSchema>;

const trustPoints = [
  '10+ sân bay nội địa Việt Nam với routes thực',
  'Đặt vé online với hơn 6 dòng máy bay hiện đại',
  'Quản lý booking, passenger, seat inventory real-time'
];

export const LoginPage = () => {
  const loginMutation = useLogin();
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'dev@dev.com',
      password: 'Admin@12345'
    }
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background:
          'radial-gradient(circle at top left, rgba(15, 108, 189, 0.18) 0%, rgba(15, 108, 189, 0) 32%), radial-gradient(circle at right center, rgba(19, 144, 140, 0.16) 0%, rgba(19, 144, 140, 0) 34%), linear-gradient(135deg, #f4f8fc 0%, #edf5fb 100%)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1180,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 20
        }}
      >
        <Card
          className="app-surface"
          style={{
            borderRadius: 28,
            overflow: 'hidden',
            minHeight: 620,
            background:
              'linear-gradient(140deg, rgba(15,108,189,0.94) 0%, rgba(19,144,140,0.9) 52%, rgba(7,30,49,0.92) 100%)'
          }}
          styles={{ body: { height: '100%', padding: 32 } }}
        >
          <div style={{ display: 'flex', height: '100%', flexDirection: 'column', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'grid', gap: 18 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  width: 'fit-content',
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.14)',
                  color: '#e8fbff',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontSize: 12
                }}
              >
                <SafetyCertificateOutlined />
                SkyBooking
              </div>

              <Title level={1} style={{ color: '#ffffff', margin: 0, maxWidth: 520 }}>
                SkyBooking
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 20, lineHeight: 1.6, maxWidth: 540 }}>
                Vietnam Domestic Flight Booking
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 1.8, maxWidth: 540 }}>
                Đặt vé máy bay nội địa Việt Nam - Hà Nội, TP.HCM, Đà Nẵng, Nha Trang, Phú Quốc và hơn 10 điểm đến.
              </Text>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 14,
                padding: 24,
                borderRadius: 24,
                background: 'rgba(5, 19, 31, 0.22)',
                border: '1px solid rgba(255,255,255,0.16)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 700 }}>Workspace trust cues</Text>
              {trustPoints.map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: 'rgba(255,255,255,0.82)'
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: '#8bf3d7',
                      flexShrink: 0
                    }}
                  />
                  <Text style={{ color: 'inherit' }}>{item}</Text>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="app-surface" style={{ borderRadius: 28 }} styles={{ body: { padding: 28 } }}>
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text className="page-eyebrow">Sign in</Text>
            <Title level={3} style={{ marginBottom: 4 }}>
              SkyBooking
            </Title>
            <Text type="secondary">Đăng nhập để tiếp tục</Text>
          </Space>

          <Form layout="vertical" onFinish={handleSubmit(onSubmit)} style={{ marginTop: 24 }}>
            <Form.Item
              label="Email"
              validateStatus={errors.email ? 'error' : undefined}
              help={errors.email?.message}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => <Input {...field} prefix={<MailOutlined />} placeholder="Email" size="large" />}
              />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              validateStatus={errors.password ? 'error' : undefined}
              help={errors.password?.message}
            >
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Input.Password {...field} prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
                )}
              />
            </Form.Item>

            {loginMutation.isError && <Alert type="error" message="Đăng nhập thất bại" showIcon style={{ marginBottom: 16 }} />}

            <Button
              htmlType="submit"
              type="primary"
              size="large"
              block
              loading={loginMutation.isPending}
              style={{ marginTop: 8 }}
            >
              Đăng nhập
            </Button>

            <Card
              style={{
                marginTop: 18,
                borderRadius: 20,
                background: 'rgba(15,108,189,0.05)',
                border: '1px solid rgba(15,108,189,0.12)'
              }}
            >
              <Space direction="vertical" size={4}>
                <Text strong>Demo credentials</Text>
                <Text type="secondary">Admin: dev@dev.com / Admin@12345</Text>
                <Text type="secondary">User: user@test.com / User@12345</Text>
              </Space>
            </Card>
          </Form>
        </Card>
      </div>
    </div>
  );
};
