'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Page Error:', error.message, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center', padding: '32px', background: 'white', borderRadius: '16px', border: '1px solid #eef0f4' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px 0' }}>页面加载出错</h2>
          <p style={{ fontSize: '14px', color: '#8e95a2', margin: '0 0 20px 0' }}>
            请刷新页面或清除浏览器缓存后重试
          </p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 32px', fontSize: '15px', fontWeight: 600, color: 'white', background: '#4f6ef7', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
