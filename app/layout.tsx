import { SessionProvider } from './components/SessionProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BottomNav } from './components/BottomNav';

export const metadata = {
  title: '作业小帮手',
  description: '学无尽，勤精进 — AI 辅助错题批改与学习计划',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4f6ef7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#f8f9fc', minHeight: '100vh' }}>
        <SessionProvider>
          <ErrorBoundary>
            <div style={{ paddingBottom: '80px', paddingTop: '0', minHeight: '100vh' }}>
              {children}
            </div>
          </ErrorBoundary>
          <BottomNav />
        </SessionProvider>
      </body>
    </html>
  );
}
