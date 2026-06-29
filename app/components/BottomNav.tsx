'use client';

import { usePathname } from 'next/navigation';
import { IconHome, IconHistory, IconChart, IconBook, IconSettings } from '../../lib/icons';

const NAV_ITEMS = [
  { href: '/', label: '做作业', Icon: IconHome },
  { href: '/history', label: '成长日记', Icon: IconHistory },
  { href: '/dashboard', label: '学习地图', Icon: IconChart },
  { href: '/plans', label: '路线', Icon: IconBook },
  { href: '/settings', label: '设置', Icon: IconSettings },
];

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    height: '60px', background: 'white',
    borderTop: '1px solid #eef0f4',
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    zIndex: 100,
  },
  item: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '2px', padding: '4px 16px', cursor: 'pointer',
    textDecoration: 'none', color: '#8e95a2', fontSize: '11px', fontWeight: 500,
    transition: 'color 0.15s',
    border: 'none', background: 'none', position: 'relative',
  },
  itemActive: { color: '#4f6ef7' },
  activeDot: {
    position: 'absolute', top: 0, width: '20px', height: '3px',
    background: '#4f6ef7', borderRadius: '0 0 3px 3px',
  },
  iconWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
};

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav style={styles.bar}>
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <a key={href} href={href} style={{ ...styles.item, ...(active ? styles.itemActive : {}) }}>
            {active && <div style={styles.activeDot} />}
            <div style={styles.iconWrap}>
              <Icon />
            </div>
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
