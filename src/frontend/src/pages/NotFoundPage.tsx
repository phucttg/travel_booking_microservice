import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="Route này không tồn tại trong workspace hiện tại"
      extra={
        <Button type="primary" onClick={() => navigate('/dashboard')}>
          Về Dashboard
        </Button>
      }
    />
  );
};
