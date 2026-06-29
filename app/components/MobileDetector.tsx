import { useState, useEffect } from 'react';

// 模拟 AI 调试工具组件
export function MobileDetector() {
  const [isMobile, setIsMobile] = useState(false);

  // 检测是否为移动设备
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="mobile-warning">
      <p>⚠️ 建议在桌面端使用以获得更好的体验</p>
    </div>
  );
}