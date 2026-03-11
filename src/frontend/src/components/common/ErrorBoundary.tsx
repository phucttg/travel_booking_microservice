import { Button, Result } from 'antd';
import { Component, ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Keep silent in UI; logs can be sent to monitoring later.
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Đã xảy ra lỗi"
          subTitle="Workspace encountered an unexpected rendering error. Vui lòng thử tải lại trang."
          extra={
            <Button type="primary" onClick={this.handleReload}>
              Reload
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
