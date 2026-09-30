'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** 有到期错题时提示去复习；无到期或未登录时不渲染 */
export function ReviewBanner() {
  const [due, setDue] = useState(0);

  useEffect(() => {
    fetch('/api/reviews')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (json && typeof json.dueCount === 'number') setDue(json.dueCount); })
      .catch(() => {});
  }, []);

  if (due <= 0) return null;
  return (
    <Link href="/review" style={styles.banner}>
      <span>🔁 有 {due} 道错题该复习啦</span>
      <span style={styles.go}>去复习 →</span>
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 14px', marginBottom: '16px', borderRadius: '12px',
    background: '#fff7e6', color: '#ad6800', fontSize: '14px', fontWeight: 600,
    textDecoration: 'none', border: '1px solid #ffe7ba',
  },
  go: { fontSize: '13px', color: '#d46b08' },
};
