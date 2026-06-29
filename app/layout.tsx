export const metadata = {
  title: '错题批改助手',
  description: 'AI辅助批改数学错题，拍照即批改',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#667eea',
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
      <body style={{ margin: 0, padding: 0, background: '#f5f7fa' }}>
        {children}
      </body>
    </html>
  );
}