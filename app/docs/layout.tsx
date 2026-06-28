'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const nav = [
  { slug: 'prd', title: '产品需求文档', icon: '📋' },
  { slug: 'architecture', title: '技术架构', icon: '🏗️' },
  { slug: 'technical', title: '技术实现', icon: '🔧' },
  { slug: 'user-guide', title: '用户操作手册', icon: '📖' },
  { slug: 'deployment', title: '部署运维', icon: '🚀' },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <Link href="/" style={styles.brandLink}>📚 错题批改助手</Link>
        </div>
        <div style={styles.brandSub}>项目材料文档</div>
        <nav style={styles.nav}>
          {nav.map((n) => {
            const active = pathname === `/docs/${n.slug}`;
            return (
              <Link
                key={n.slug}
                href={`/docs/${n.slug}`}
                style={{ ...styles.navItem, ...(active ? styles.navActive : {}) }}
              >
                <span>{n.icon}</span>
                <span>{n.title}</span>
              </Link>
            );
          })}
        </nav>
        <Link href="/" style={styles.backApp}>← 返回应用</Link>
      </aside>
      <main style={styles.main}>{children}</main>

      <style>{`
        .doc-content h1{font-size:24px;font-weight:700;margin:0 0 8px;color:#1a1a2e}
        .doc-content h2{font-size:19px;font-weight:700;margin:28px 0 12px;color:#1a1a2e;border-bottom:2px solid #eef;padding-bottom:6px}
        .doc-content h3{font-size:16px;font-weight:600;margin:22px 0 8px;color:#333}
        .doc-content h4{font-size:14px;font-weight:600;margin:16px 0 6px;color:#555}
        .doc-content p{margin:0 0 12px;line-height:1.7;color:#333;font-size:14px}
        .doc-content ul,.doc-content ol{margin:0 0 12px;padding-left:22px;line-height:1.7;color:#333;font-size:14px}
        .doc-content li{margin-bottom:4px}
        .doc-content code{background:#f0f3ff;color:#667eea;padding:2px 6px;border-radius:4px;font-size:13px;font-family:ui-monospace,monospace}
        .doc-content pre{background:#1a1a2e;color:#e8ecf5;padding:14px;border-radius:10px;overflow:auto;margin:0 0 14px;font-size:13px;line-height:1.5}
        .doc-content pre code{background:none;color:inherit;padding:0}
        .doc-content blockquote{border-left:3px solid #667eea;margin:0 0 12px;padding:4px 14px;background:#f8f9fc;color:#555;border-radius:0 8px 8px 0}
        .doc-content a{color:#667eea;text-decoration:none}
        .doc-content a:hover{text-decoration:underline}
        .doc-content table{border-collapse:collapse;width:100%;margin:0 0 14px;font-size:13px}
        .doc-content th,.doc-content td{border:1px solid #e0e4ee;padding:8px 10px;text-align:left}
        .doc-content th{background:#f0f3ff;color:#1a1a2e;font-weight:600}
        .doc-content tr:nth-child(even) td{background:#fafbff}
        .doc-content hr{border:none;border-top:1px solid #e0e4ee;margin:22px 0}
        .doc-content strong{color:#1a1a2e}
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: '#f5f7fa' },
  sidebar: {
    width: '230px', flexShrink: 0, background: 'white',
    borderRight: '1px solid #e8ecf5', padding: '20px 16px',
    display: 'flex', flexDirection: 'column', gap: '4px',
    position: 'sticky', top: 0, height: '100vh', overflow: 'auto',
  },
  brand: { fontSize: '16px', fontWeight: 700 },
  brandLink: { color: '#1a1a2e', textDecoration: 'none' },
  brandSub: { fontSize: '12px', color: '#aaa', marginBottom: '18px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
    color: '#555', textDecoration: 'none',
  },
  navActive: { background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', fontWeight: 600 },
  backApp: { fontSize: '13px', color: '#888', textDecoration: 'none', marginTop: '12px', padding: '8px 12px' },
  main: { flex: 1, padding: '40px', maxWidth: '900px', margin: '0 auto' },
};